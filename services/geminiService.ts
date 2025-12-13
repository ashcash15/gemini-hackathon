
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
          definition: { type: Type.STRING, description: "A concise definition." }
        },
        required: ["term", "definition"]
      },
      description: "Key terms."
    }
  },
  required: ["nodes", "glossary"]
};

// ... (Lecture Schema remains the same, omitted for brevity but assumed present in logic)
const LECTURE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    moduleId: { type: Type.STRING },
    title: { type: Type.STRING },
    analogy: { type: Type.STRING },
    conceptMappings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          newConcept: { type: Type.STRING },
          familiarConcept: { type: Type.STRING },
          relation: { type: Type.STRING }
        },
        required: ["newConcept", "familiarConcept", "relation"]
      }
    },
    codeSnippet: {
      type: Type.OBJECT,
      properties: {
        language: { type: Type.STRING },
        code: { type: Type.STRING },
        output: { type: Type.STRING },
        description: { type: Type.STRING }
      }
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING }
        },
        required: ["title", "content"]
      }
    },
    practiceScenario: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
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
          explanation: { type: Type.STRING }
        },
        required: ["question", "options", "correctIndex", "explanation"]
      }
    }
  },
  required: ["moduleId", "title", "analogy", "conceptMappings", "sections", "practiceScenario", "quiz"]
};

const EXPANSION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    newNodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["title", "description"]
      }
    }
  },
  required: ["newNodes"]
};

const GLOSSARY_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    glossary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          definition: { type: Type.STRING }
        },
        required: ["term", "definition"]
      }
    }
  },
  required: ["glossary"]
};

export const generateLearningPath = async (userContext: UserContext): Promise<LearningGraph> => {
  const modelId = "gemini-2.5-flash"; 
  
  // Differentiate between Deep Study (Roadmap) and Regular Study
  let taskDescription = "";
  let countInstruction = "";
  
  if (userContext.isDeepStudy) {
    taskDescription = `Create a "Progress Graph" (Roadmap) of Major Milestones (Topics) to master "${userContext.learningGoal}". Each node will later be expanded into its own full course.`;
    countInstruction = "Create 5 to 7 Major Milestones. They must be progressive.";
  } else {
    taskDescription = `Create a dependency-based learning graph to teach "${userContext.learningGoal}".`;
    countInstruction = "Create between 7 to 12 modules (nodes).";
  }

  const prompt = `
    ${taskDescription}
    User Background: "${userContext.existingKnowledge}".
    Detailed Context: "${userContext.detailedBackground}".
    
    Rules:
    1. ${countInstruction}
    2. The first node should bridge the user's background to the new topic.
    3. Ensure the graph is a DAG (Directed Acyclic Graph). No circular dependencies.
    4. dependencies must reference the 'id' of other nodes.
    5. 'id' should be simple strings.
    6. CRITICAL: Generate a comprehensive GLOSSARY of at least 20-25 key terms and definitions related to the topic. These will be used for flashcards.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: GRAPH_SCHEMA,
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

export const generateSubGraph = async (majorTopic: LearningNode, userContext: UserContext): Promise<LearningGraph> => {
  const modelId = "gemini-2.5-flash";
  
  const prompt = `
    The user is doing a Deep Study on "${userContext.learningGoal}".
    They have reached the Major Milestone: "${majorTopic.title}" (${majorTopic.description}).
    
    User Background: ${userContext.existingKnowledge}
    Detailed Context: ${userContext.detailedBackground}
    
    Task: Create a detailed sub-graph of modules specifically to master this milestone ("${majorTopic.title}").
    
    Rules:
    1. Create 5-8 specific learning modules.
    2. Ensure progressive difficulty.
    3. Include a specific glossary of 15+ terms for this sub-topic.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: GRAPH_SCHEMA,
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
     throw new Error("Failed to generate sub-graph");
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
    Detailed Context: "${userContext.detailedBackground}".
    
    Current Modules:
    ${currentNodesJSON}

    User Feedback: "${feedback}"

    Task:
    Regenerate the learning graph to address the user's feedback.
    Maintain JSON structure.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: GRAPH_SCHEMA,
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
    The user has just COMPLETED the module: "${completedNode.title}".
    Context: Learning "${userContext.learningGoal}".
    
    Suggest 2 NEW, ADVANCED follow-up modules.
    Do not duplicate existing modules: ${existingTitles.join(", ")}.
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
  completedNodes: LearningNode[] = [],
  refinementInstruction?: string,
  isRemedial: boolean = false
): Promise<LectureContent> => {
  const modelId = "gemini-2.5-flash";

  const completedTitles = completedNodes.map(n => n.title).join(", ");
  
  let refinementText = "";
  if (refinementInstruction) {
    refinementText = `\nCRITICAL MODIFICATION INSTRUCTION: The user wants to change this module. Feedback: "${refinementInstruction}". Completely re-write the content to satisfy this request.`;
  }
  
  let remedialText = "";
  if (isRemedial) {
      remedialText = `\nURGENT: The user FAILED this module previously. The content was too difficult or unclear.
      1. SIMPLIFY the language significantly (explain like they are a beginner/student).
      2. Use simpler, more concrete analogies.
      3. Break down complex concepts into smaller steps.
      4. Focus on the areas where they likely struggled (core concepts).
      5. Make the quiz slightly easier but ensuring understanding.`;
  }

  const prompt = `
    Create an comprehensive, in-depth interactive lecture module for: "${node.title}".
    Description: "${node.description}".
    
    User Profile:
    - Primary Background: "${userContext.existingKnowledge}"
    - Detailed Context: "${userContext.detailedBackground}"
    - Goal: "${userContext.learningGoal}"
    
    History: [${completedTitles}]

    ${refinementText}
    ${remedialText}
    
    Structure Requirements:
    1. Analogy: Use specific details from their background/detailed context.
    2. Concept Mapping: Map exactly 3-5 key terms to show the relationship between their known concepts and the new topic. Keep it simple and direct.
    3. Code Example: Only if technical.
    4. Sections: Break the content into 10-12 distinct, detailed sections (pages). Each section should cover one specific aspect thoroughly. The goal is to create a long, comprehensive lesson (approx 15 pages total).
    5. Practice Scenario: Specific to their background.
    6. Quiz: 3 MCQs.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: LECTURE_SCHEMA,
      }
    });

    const data = JSON.parse(response.text || "{}");
    return { ...data, moduleId: node.id };
  } catch (error) {
    console.error("Gemini Content Generation Error:", error);
    throw new Error("Failed to generate lecture content.");
  }
};

export const generateModuleSummary = async (lecture: LectureContent): Promise<string> => {
    const modelId = "gemini-2.5-flash";
    const prompt = `
      Create a comprehensive summary of the module "${lecture.title}".
      
      Key Points from Content:
      ${lecture.sections.map(s => `- ${s.title}: ${s.content.substring(0, 100)}...`).join('\n')}
      
      Analogy used: ${lecture.analogy}

      Format: Markdown. Concise but capture key takeaways.
    `;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt
        });
        return response.text || "No summary generated.";
    } catch (error) {
        return "Failed to generate summary.";
    }
}

export const generateModuleImage = async (title: string, analogy: string): Promise<string | undefined> => {
  const modelId = "gemini-2.5-flash-image";
  
  const prompt = `
    Create a high-quality, abstract glassmorphism style illustration for: "${title}". 
    Concept: "${analogy}".
    Style: Liquid glass, translucent shapes, neon accents, dark background, 3D render, octane render.
    No text.
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
    You are an expert AI Tutor.
    Topic: "${context.lectureContext.title}".
    Student Context: ${context.userContext.detailedBackground}
    
    Conversation:
    ${conversation}
    Student Question: "${question}"
    
    Answer concisely using analogies from their background.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "I'm having trouble thinking of an answer right now.";
  } catch (error) {
    return "Connection error.";
  }
};

export const askGlobalTutor = async (
  question: string,
  context: {
    userContext: UserContext,
    graphData: LearningGraph,
    chatHistory: ChatMessage[]
  }
): Promise<string> => {
  const modelId = "gemini-3-pro-preview";
  const conversation = context.chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Course Guide'}: ${m.text}`).join('\n');
  const modules = context.graphData.nodes.map(n => n.title).join(", ");

  const prompt = `
    You are the "Course Guide" for a personalized learning path on "${context.userContext.learningGoal}".
    The user's background: ${context.userContext.existingKnowledge}.
    
    Course Modules: ${modules}
    
    Conversation history:
    ${conversation}
    
    User Question: "${question}"
    
    Answer concisely. Help them navigate the course or understand high-level concepts.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "I can't answer that right now.";
  } catch (error) {
    return "Connection error.";
  }
};

export const defineTerm = async (term: string, context: UserContext): Promise<string> => {
  const modelId = "gemini-2.5-flash";
  const prompt = `Define "${term}" for someone with this background: ${context.existingKnowledge}. Keep it simple.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "Definition not found.";
  } catch (error) {
    return "Could not retrieve definition.";
  }
}

export const generateCourseSummary = async (graph: LearningGraph, userContext: UserContext): Promise<string> => {
  const modelId = "gemini-2.5-flash";
  const modulesText = graph.nodes.map(n => `Module: ${n.title}\nDescription: ${n.description}`).join('\n\n');
  const prompt = `Create a study guide for:\n${modulesText}\n\nContext: ${userContext.detailedBackground}`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "Could not generate summary.";
  } catch (error) {
    return "Error generating summary.";
  }
}

export const generateGlossary = async (topic: string, userContext: UserContext): Promise<GlossaryTerm[]> => {
    const modelId = "gemini-2.5-flash";
    const prompt = `
        Generate a comprehensive glossary of 20 key terms for the topic: "${topic}".
        User Context: ${userContext.existingKnowledge}.
        Definitions should be concise and easy to understand.
    `;
    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: GLOSSARY_SCHEMA
            }
        });
        const data = JSON.parse(response.text || "{}");
        return data.glossary || [];
    } catch (e) {
        return [];
    }
}

export const generatePodcastScript = async (lecture: LectureContent, userContext: UserContext): Promise<string> => {
  const modelId = "gemini-2.5-flash";
  const prompt = `Convert this lecture on "${lecture.title}" into a 2-minute energetic podcast script. Analogy: ${lecture.analogy}. Listener context: ${userContext.detailedBackground}. No speaker labels.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "Unable to generate podcast script.";
  } catch (error) {
    return "Error generating audio.";
  }
};
