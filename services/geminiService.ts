
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserContext, LearningGraph, LectureContent, LearningNode, ChatMessage, GlossaryTerm } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const GRAPH_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          dependencies: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of node IDs that must be learned BEFORE this node."
          }
        },
        required: ["id", "title", "description", "dependencies"]
      }
    },
    glossary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          definition: { type: Type.STRING, description: "A concise, 1-2 sentence definition tailored to the user's background." }
        },
        required: ["term", "definition"]
      },
      description: "A list of 10-15 essential technical terms related to the learning goal that the user will encounter."
    }
  },
  required: ["nodes", "glossary"]
};

const LECTURE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    moduleId: { type: Type.STRING },
    title: { type: Type.STRING },
    analogy: { type: Type.STRING, description: "A powerful analogy explaining the concept using the user's specific background knowledge." },
    conceptMappings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          newConcept: { type: Type.STRING, description: "The term from the new topic (e.g., 'Inhibitory Neurotransmitter')." },
          familiarConcept: { type: Type.STRING, description: "The equivalent term from the user's background (e.g., 'Risk Management')." },
          relation: { type: Type.STRING, description: "Short description of the functional similarity (e.g., 'Prevents system overload')." }
        },
        required: ["newConcept", "familiarConcept", "relation"]
      },
      description: "List 3-4 key term mappings to visualize the analogy as a neural network."
    },
    codeSnippet: {
      type: Type.OBJECT,
      properties: {
        language: { type: Type.STRING, description: "e.g., python, javascript, rust" },
        code: { type: Type.STRING, description: "A short, runnable code example illustrating the concept." },
        output: { type: Type.STRING, description: "The expected console output or result of running the code." },
        description: { type: Type.STRING, description: "Brief explanation of what the code does." }
      },
      description: "Include this ONLY if the topic involves programming or technical syntax."
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING, description: "Detailed educational content in Markdown. Keep it focused (approx 150 words)." }
        },
        required: ["title", "content"]
      },
      description: "Break the lecture into 2-3 logical sections."
    },
    practiceScenario: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING, description: "A scenario based on the user's BACKGROUND where they must apply the new concept." },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              isCorrect: { type: Type.BOOLEAN },
              feedback: { type: Type.STRING }
            },
            required: ["label", "isCorrect", "feedback"]
          }
        }
      },
      required: ["title", "description", "options"]
    },
    quiz: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING, description: "Why the correct answer is correct." }
        },
        required: ["question", "options", "correctIndex", "explanation"]
      }
    }
  },
  required: ["moduleId", "title", "analogy", "conceptMappings", "sections", "practiceScenario", "quiz"]
};

// Partial schema for expansion to just get nodes
const EXPANSION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    newNodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING, description: "Focus on advanced/specialized application." },
        },
        required: ["title", "description"]
      }
    }
  },
  required: ["newNodes"]
};

export const generateLearningPath = async (userContext: UserContext): Promise<LearningGraph> => {
  const modelId = "gemini-2.5-flash"; 
  
  const prompt = `
    Create a dependency-based learning graph to teach "${userContext.learningGoal}" to someone who already knows "${userContext.existingKnowledge}".
    
    Rules:
    1. Create between 7 to 12 modules (nodes).
    2. The first node should bridge the user's existing knowledge to the basics of the new topic.
    3. Ensure the graph is a DAG (Directed Acyclic Graph). No circular dependencies.
    4. dependencies must reference the 'id' of other nodes in the list.
    5. 'id' should be simple strings like "1", "2", "3".
    6. Generate a glossary of 10-15 key terms that will be used throughout this course.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: GRAPH_SCHEMA,
        systemInstruction: "You are an expert curriculum designer capable of creating personalized learning paths."
      }
    });

    const data = JSON.parse(response.text || "{}");
    const rawNodes = data.nodes || [];
    const glossary = data.glossary || [];

    const nodes: LearningNode[] = rawNodes.map((n: any) => ({
      ...n,
      status: 'LOCKED' 
    }));

    const links = [];
    for (const node of nodes) {
      for (const depId of node.dependencies) {
        links.push({ source: depId, target: node.id });
      }
    }

    return { nodes, links, glossary };
  } catch (error) {
    console.error("Gemini Graph Generation Error:", error);
    throw new Error("Failed to generate learning path.");
  }
};

export const refineLearningPath = async (
  currentGraph: LearningGraph,
  userContext: UserContext,
  feedback: string
): Promise<LearningGraph> => {
  const modelId = "gemini-2.5-flash";

  const currentNodesJSON = JSON.stringify(currentGraph.nodes.map(n => ({ id: n.id, title: n.title, description: n.description, dependencies: n.dependencies })));

  const prompt = `
    The user is reviewing a proposed learning path for "${userContext.learningGoal}" (Background: "${userContext.existingKnowledge}").
    
    Current Modules:
    ${currentNodesJSON}

    User Feedback: "${feedback}"

    Task:
    Regenerate the learning graph to address the user's feedback.
    - If they want it harder, add advanced topics.
    - If they want to skip basics, remove early nodes and re-link dependencies.
    - If they want to focus on a specific sub-topic, expand on that.
    
    Also regenerate the glossary to match the new curriculum focus.
    
    Maintain the JSON structure. Ensure valid IDs and dependencies.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: GRAPH_SCHEMA,
        systemInstruction: "You are an adaptive curriculum designer. Listen to the user's feedback and adjust the course plan accordingly."
      }
    });

    const data = JSON.parse(response.text || "{}");
    const rawNodes = data.nodes || [];
    const glossary = data.glossary || [];

    const nodes: LearningNode[] = rawNodes.map((n: any) => ({
      ...n,
      status: 'LOCKED' 
    }));

    const links = [];
    for (const node of nodes) {
      for (const depId of node.dependencies) {
        links.push({ source: depId, target: node.id });
      }
    }

    return { nodes, links, glossary };
  } catch (error) {
    console.error("Gemini Graph Refinement Error:", error);
    throw new Error("Failed to refine learning path.");
  }
};

export const expandLearningGraph = async (
  completedNode: LearningNode,
  userContext: UserContext,
  existingTitles: string[]
): Promise<{ title: string; description: string }[]> => {
  const modelId = "gemini-2.5-flash";

  const prompt = `
    The user has just COMPLETED the module: "${completedNode.title}" (${completedNode.description}).
    Context: Learning "${userContext.learningGoal}" with background in "${userContext.existingKnowledge}".
    
    Current existing modules: ${existingTitles.join(", ")}.

    Task:
    Suggest 2 NEW, ADVANCED follow-up modules that branch off directly from "${completedNode.title}".
    These should be deeper dives or more complex applications of the concept user just learned.
    Do not duplicate existing module titles.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: EXPANSION_SCHEMA,
      }
    });

    const data = JSON.parse(response.text || "{}");
    return data.newNodes || [];
  } catch (error) {
    console.error("Graph Expansion Error:", error);
    return [];
  }
};

export const generateLectureContent = async (
  node: LearningNode,
  userContext: UserContext,
  completedNodes: LearningNode[] = []
): Promise<LectureContent> => {
  const modelId = "gemini-2.5-flash";

  const completedTitles = completedNodes.map(n => n.title).join(", ");
  const historyContext = completedTitles 
    ? `The user has recently completed these modules: [${completedTitles}]. Reference these concepts if helpful to explain the new topic.` 
    : "This is the first module in the learning path.";

  const prompt = `
    Create an interactive lecture module for the topic: "${node.title}".
    Description: "${node.description}".
    
    Target Audience Background: "${userContext.existingKnowledge}".
    Learning Goal: "${userContext.learningGoal}".
    Context: ${historyContext}
    
    Structure Requirements:
    1. Analogy: Start with a strong "Hook". Explain the concept using a detailed analogy from the user's background ("${userContext.existingKnowledge}").
    2. Concept Mapping: Explicitly map 3-4 key terms from the New Topic to the User's Background. (e.g., If Neuroscience vs Finance: "Inhibitory Neurotransmitter" maps to "Risk Management Team").
    3. Code Example: IF and ONLY IF the topic is about Programming, Coding, or Data Science, provide a 'codeSnippet' object with code, language, and expected output. If not relevant, omit this field.
    4. Sections: Break the main concept into 2-3 digestable sections.
    5. Practice Scenario: Create a specific scenario where the user (imagined as an expert in ${userContext.existingKnowledge}) encounters a problem that can be solved using this new concept from ${userContext.learningGoal}.
    6. Quiz: 3 multiple choice questions to test understanding.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: LECTURE_SCHEMA,
        systemInstruction: "You are a world-class tutor who specializes in cross-disciplinary analogies and interactive teaching."
      }
    });

    const data = JSON.parse(response.text || "{}");
    return { ...data, moduleId: node.id };
  } catch (error) {
    console.error("Gemini Content Generation Error:", error);
    throw new Error("Failed to generate lecture content.");
  }
};

export const generateModuleImage = async (title: string, analogy: string): Promise<string | undefined> => {
  const modelId = "gemini-2.5-flash-image";
  
  const prompt = `
    Create a high-quality, flat vector illustration for an educational textbook chapter titled "${title}". 
    The core concept is explained via this analogy: "${analogy}".
    Visual Style: Modern, clean, geometric, abstract, using a cool color palette (blues, teals, dark slate) on a dark background.
    Do not include text in the image.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: prompt }] }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    return undefined;
  } catch (error) {
    console.error("Image Gen Error:", error);
    return undefined;
  }
}

export const askTutor = async (
  question: string,
  context: {
    lectureContext: LectureContent,
    userContext: UserContext,
    chatHistory: ChatMessage[]
  }
): Promise<string> => {
  const modelId = "gemini-3-pro-preview";

  const conversation = context.chatHistory.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.text}`).join('\n');
  
  const prompt = `
    You are an expert AI Tutor helping a student learn "${context.lectureContext.title}".
    
    Current Lecture Content Context:
    ${context.lectureContext.sections.map(s => `[${s.title}]: ${s.content}`).join('\n')}
    
    Student Profile:
    - Background Knowledge: ${context.userContext.existingKnowledge}
    - Learning Goal: ${context.userContext.learningGoal}
    
    Conversation History:
    ${conversation}
    
    Student Question: "${question}"
    
    Instructions:
    1. Answer the student's question accurately.
    2. Tailor the answer to their background (use analogies related to ${context.userContext.existingKnowledge} if applicable).
    3. Keep the tone encouraging and educational.
    4. If the question is unrelated to the topic, gently steer them back to "${context.lectureContext.title}".
    5. Use Markdown for clarity (bold key terms, lists if needed).
    6. Be concise (under 150 words) but thorough.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "I'm having trouble thinking of an answer right now. Try asking again?";
  } catch (error) {
    console.error("Tutor Error:", error);
    return "I'm having trouble connecting to the knowledge base. Please try again.";
  }
};

export const defineTerm = async (term: string, context: UserContext): Promise<string> => {
  const modelId = "gemini-2.5-flash";
  const prompt = `
    Define the term "${term}".
    Context: The user is learning about "${context.learningGoal}" and has a background in "${context.existingKnowledge}".
    
    Rules:
    1. Provide a concise definition (max 3 sentences).
    2. If helpful, use an analogy related to their background ("${context.existingKnowledge}").
    3. Keep it simple and clear.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "Definition not found.";
  } catch (error) {
    console.error("Dictionary Error:", error);
    return "Could not retrieve definition.";
  }
}

export const generateCourseSummary = async (graph: LearningGraph, userContext: UserContext): Promise<string> => {
  const modelId = "gemini-2.5-flash";
  
  const modulesText = graph.nodes.map(n => `Module: ${n.title}\nDescription: ${n.description}`).join('\n\n');
  
  const prompt = `
    You are an expert academic advisor.
    Course Goal: ${userContext.learningGoal}
    Student Background: ${userContext.existingKnowledge}
    
    Task: Create a detailed course summary/study guide for the following modules.
    For EACH module, write a paragraph summarizing what it covers and why it is critical for the learning goal. Connect the concepts back to the student's background where possible.
    
    Modules:
    ${modulesText}
    
    Output Format: Markdown. Use bold titles for modules. Add a "Prerequisites Review" section at the start.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Summary Generation Error:", error);
    return "Error generating summary.";
  }
}
