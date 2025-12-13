
export interface UserContext {
  existingKnowledge: string;
  detailedBackground: string; // New: Detailed bio/context
  learningGoal: string;
  isDeepStudy: boolean; // New: Mode toggle
}

export enum NodeStatus {
  LOCKED = 'LOCKED',
  AVAILABLE = 'AVAILABLE',
  COMPLETED = 'COMPLETED',
  ACTIVE = 'ACTIVE'
}

export interface LearningNode {
  id: string;
  title: string;
  description: string;
  dependencies: string[];
  status: NodeStatus;
  
  // For Deep Study: A node can have its own entire graph
  subGraph?: LearningGraph; 
  
  // D3 Simulation properties
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
  newConcept: string; 
  familiarConcept: string; 
  relation: string; 
}

export interface CodeSnippet {
  language: string;
  code: string;
  output: string; 
  description: string;
}

export interface LectureContent {
  moduleId: string;
  title: string;
  analogy: string; 
  conceptMappings: ConceptMapping[]; 
  codeSnippet?: CodeSnippet; 
  sections: LectureSection[];
  practiceScenario: PracticeScenario;
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  imageUrl?: string; 
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

export interface Badge {
  id: string;
  label: string;
  icon: string; 
  description: string;
  unlockedAt?: number;
}

export interface Session {
  id: string;
  lastAccessed: number;
  context: UserContext;
  graphData: LearningGraph | null;
  completedNodeIds: string[]; 
  earnedBadges: Badge[];
  step: 'review' | 'main';
  
  // Deep Study State
  currentSubGraphId?: string | null; // If user is drilled down into a topic
}
