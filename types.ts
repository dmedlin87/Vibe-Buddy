
export interface FileNode {
  id: string;
  name: string;
  kind: 'file' | 'directory';
  children?: FileNode[];
  handle?: FileSystemHandle;
  file?: File;
  contentUrl?: string;
  content?: string | null;
  path: string;
  accessToken?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  tags: string[];
}

export type ContextMode = 'embed' | 'reference';

export interface AgentActivity {
  type: 'idle' | 'thinking' | 'tool';
  toolName?: string;
  description?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
  toolCalls?: { name: string; args: any }[];
  toolResults?: { name: string; result: any }[];
}

export interface AppState {
  // ... existing state items will be managed in store ...
}

export interface ProjectMetadata {
  type: 'local' | 'github';
  url?: string;
  token?: string;
  lastSynced: number;
}

export enum GeminiModel {
  FLASH = 'gemini-2.5-flash',
  PRO = 'gemini-3-pro-preview',
}