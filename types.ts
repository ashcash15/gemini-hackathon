
export interface UserContext {
  existingKnowledge: string;
  learningGoal: string;
}

export enum NodeStatus {
  LOCKED = 'LOCKED',
  AVAILABLE = 'AVAILABLE',
  COMPLETED = 'COMPLETED',
  ACTIVE = 'ACTIVE' // Currently viewing
}

export interface LearningNode {
  id: string;
  title: string;
  description: string;
  dependencies: string[]; // IDs of parent nodes
  status: NodeStatus;
  
  // D3 Simulation properties (optional)
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  level?: number;
}

export interface LearningLink {
  source: string | LearningNode;
  target: string | LearningNode;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface LearningGraph {
  nodes: LearningNode[];
  links: LearningLink[];
  glossary: GlossaryTerm[];
}

export interface LectureSection {
  title: string;
  content: string; // Markdown
}

export interface PracticeScenario {
  title: string;
  description: string;
  options: {
    label: string;
    isCorrect: boolean;
    feedback: string;
  }[];
}

export interface ConceptMapping {
  newConcept: string; // e.g. "Inhibitory Neurotransmitter"
  familiarConcept: string; // e.g. "Risk Management Team"
  relation: string; // e.g. "Prevents system overload/over-trading"
}

export interface CodeSnippet {
  language: string;
  code: string;
  output: string; // The simulated output
  description: string;
}

export interface LectureContent {
  moduleId: string;
  title: string;
  analogy: string; // Specific analogy bridging existing knowledge to new concept
  conceptMappings: ConceptMapping[]; // Visual mapping of terms
  codeSnippet?: CodeSnippet; // Optional code block for technical topics
  sections: LectureSection[];
  practiceScenario: PracticeScenario;
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  imageUrl?: string; // Base64 data URI of the generated image
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface Session {
  id: string;
  lastAccessed: number;
  context: UserContext;
  graphData: LearningGraph | null;
  completedNodeIds: string[]; // Array for storage
  step: 'review' | 'main';
}
