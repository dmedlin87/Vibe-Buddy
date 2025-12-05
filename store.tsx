
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { FileNode, PromptTemplate, ContextMode, GeminiModel, ChatMessage, AgentActivity, ProjectMetadata } from './types';
import { DEFAULT_TEMPLATES } from './constants';
import { readFileContent, getAllFilePaths } from './services/fileSystem';
import { loadGithubRepo } from './services/githubService';
import { generateTemplateSuggestions, suggestRelevantFiles, generateRefinedPrompt } from './services/geminiService';
import { GoogleGenAI, Chat, Part, FunctionCall, ToolListUnion, Type } from "@google/genai";

const DEFAULT_CSS = `.markdown-content { font-size: 0.9rem; line-height: 1.6; color: #d4d4d8; }
.markdown-content h1, .markdown-content h2 { margin-top: 1rem; color: #fff; font-weight: 600; }
.markdown-content pre { background: #18181b; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; border: 1px solid #27272a; }
.markdown-content code { font-family: 'JetBrains Mono', monospace; font-size: 0.85em; color: #a5b4fc; }
.markdown-content ul { padding-left: 1.5rem; list-style: disc; }`;

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  // File System
  rootNode: FileNode | null;
  setRootNode: (node: FileNode | null) => void;
  loadLocalProject: (node: FileNode) => void;
  selectedPaths: Set<string>;
  setSelectedPaths: (paths: Set<string>) => void;
  toggleFileSelection: (node: FileNode) => Promise<void>;
  clearSelection: () => void;
  expandedPaths: Set<string>;
  toggleDirectory: (path: string) => void;
  loadedFiles: Map<string, string>;
  closeProject: () => void;
  
  // Project Metadata
  projectMetadata: ProjectMetadata | null;
  refreshProject: () => Promise<void>;

  // Prompt Canvas
  userInstruction: string;
  setUserInstruction: (s: string) => void;
  generatedPrompt: string; // The final compiled prompt
  setGeneratedPrompt: (s: string) => void;
  compilePrompt: () => void;
  contextMode: ContextMode;
  setContextMode: (m: ContextMode) => void;
  
  // Prompt Library
  savedPrompts: PromptTemplate[];
  suggestedTemplates: PromptTemplate[];
  savePrompt: (name: string, content: string, tags?: string[]) => void;
  updatePrompt: (id: string, updates: Partial<PromptTemplate>) => void;
  deletePrompt: (id: string) => void;
  generateSuggestions: () => Promise<void>;
  saveSuggestedTemplate: (template: PromptTemplate) => void;

  // Agent State
  agentActivity: AgentActivity;
  chatMessages: ChatMessage[];
  startAgent: (initialMsg?: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  stopAgent: () => void;
  clearChat: () => void;
  
  // App Logic
  activeModel: GeminiModel;
  setActiveModel: (m: GeminiModel) => void;
  isProcessing: boolean;
  toasts: Toast[];
  addToast: (msg: string, type?: 'success'|'error'|'info') => void;
  removeToast: (id: string) => void;
  importGithubProject: (url: string, token?: string) => Promise<void>;
  recentRepos: string[];
  removeRecentRepo: (url: string) => void;
  bypassLanding: boolean;
  setBypassLanding: (b: boolean) => void;
  
  // Preview
  previewNode: FileNode | null;
  previewContent: string | null;
  openPreview: (node: FileNode) => Promise<void>;
  closePreview: () => void;

  // UI
  isSidebarOpen: boolean;
  setIsSidebarOpen: (b: boolean) => void;
  isAgentOpen: boolean;
  setIsAgentOpen: (b: boolean) => void;
  isExportOpen: boolean;
  setIsExportOpen: (b: boolean) => void;

  // Smart helpers
  smartSelectFiles: (instruction?: string) => Promise<void>;
  autoRefineInstruction: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// --- TOOLS ---
const SYSTEM_INSTRUCTION = `
You are the VibePrompt Architect, an advanced AI Coding Agent embedded in a Prompt IDE.
Your goal is to construct the PERFECT prompt for another LLM (like Cursor, Windsurf, or a developer).

You have full control over the "Prompt Canvas".
1. **Explore**: Use 'list_files' and 'read_file' to understand the repo.
2. **Select Context**: Use 'select_files' to pick ONLY the files necessary for the task.
3. **Draft Instruction**: Use 'update_instruction' to write a clear, step-by-step request for the downstream AI.

Behavior:
- Be proactive. If the user says "Fix the auth bug", look for auth-related files immediately.
- Explain your actions briefly. "I'm checking the auth service..."
- When you are satisfied with the context and instruction, tell the user the prompt is ready.
`;

const AGENT_TOOLS: ToolListUnion = [
  {
    functionDeclarations: [
      {
        name: "list_files",
        description: "List all file paths in the project to understand structure.",
      },
      {
        name: "read_file",
        description: "Read the content of a file.",
        parameters: {
          type: Type.OBJECT,
          properties: { path: { type: Type.STRING } },
          required: ["path"]
        }
      },
      {
        name: "select_files",
        description: "Add files to the Prompt Context.",
        parameters: {
          type: Type.OBJECT,
          properties: { paths: { type: Type.ARRAY, items: { type: Type.STRING } } },
          required: ["paths"]
        }
      },
      {
        name: "deselect_files",
        description: "Remove files from the Prompt Context.",
        parameters: {
          type: Type.OBJECT,
          properties: { paths: { type: Type.ARRAY, items: { type: Type.STRING } } },
          required: ["paths"]
        }
      },
      {
        name: "update_instruction",
        description: "Write or Update the specific instruction for the final prompt.",
        parameters: {
          type: Type.OBJECT,
          properties: { text: { type: Type.STRING, description: "The detailed instruction text" } },
          required: ["text"]
        }
      },
      {
        name: "suggest_templates",
        description: "Analyze the project structure and add tailored prompt templates to the user's library suggestions.",
      }
    ]
  }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // File System
  const [rootNode, setRootNode] = useState<FileNode | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loadedFiles, setLoadedFiles] = useState<Map<string, string>>(new Map());
  const [recentRepos, setRecentRepos] = useState<string[]>([]);
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata | null>(null);

  // Canvas
  const [userInstruction, setUserInstruction] = useState<string>("");
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [contextMode, setContextMode] = useState<ContextMode>('reference');
  
  // Library
  const [savedPrompts, setSavedPrompts] = useState<PromptTemplate[]>([]);
  const [suggestedTemplates, setSuggestedTemplates] = useState<PromptTemplate[]>([]);
  
  // Init load
  useEffect(() => {
    try {
      const storedPrompts = localStorage.getItem('vb_saved_prompts');
      if (storedPrompts) {
        const parsed = JSON.parse(storedPrompts);
        // Migration: Ensure all prompts have tags
        const migrated = parsed.map((p: any) => ({
          ...p,
          tags: Array.isArray(p.tags) ? p.tags : ['custom']
        }));
        setSavedPrompts(migrated);
      }

      const storedRepos = localStorage.getItem('vb_recent_repos');
      if (storedRepos) setRecentRepos(JSON.parse(storedRepos));
    } catch (e) { console.error(e); }
  }, []);
  
  // Agent
  const [agentActivity, setAgentActivity] = useState<AgentActivity>({ type: 'idle' });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeModel, setActiveModel] = useState<GeminiModel>(GeminiModel.PRO);
  
  // Refs
  const rootNodeRef = useRef(rootNode);
  const selectedPathsRef = useRef(selectedPaths);
  const loadedFilesRef = useRef(loadedFiles);
  const userInstructionRef = useRef(userInstruction);
  const chatSessionRef = useRef<Chat | null>(null);
  const abortStreamRef = useRef(false);

  // Sync Refs
  useEffect(() => { rootNodeRef.current = rootNode; }, [rootNode]);
  useEffect(() => { selectedPathsRef.current = selectedPaths; }, [selectedPaths]);
  useEffect(() => { loadedFilesRef.current = loadedFiles; }, [loadedFiles]);
  useEffect(() => { userInstructionRef.current = userInstruction; }, [userInstruction]);

  // UI
  const [isProcessing, setIsProcessing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAgentOpen, setIsAgentOpen] = useState(false); // Default false for mobile safety
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [bypassLanding, setBypassLanding] = useState(false);
  
  // Helpers
  const addToast = useCallback((message: string, type: 'success'|'error'|'info' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  const removeToast = (id: string) => setToasts(p => p.filter(t => t.id !== id));

  // Preview
  const [previewNode, setPreviewNode] = useState<FileNode | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  // Smart helpers
  const smartSelectFiles = useCallback(async (instruction?: string) => {
    if (!rootNodeRef.current) {
      addToast('Load a project before smart selecting files', 'error');
      return;
    }
    const effectiveInstruction = (instruction ?? userInstructionRef.current).trim();
    if (!effectiveInstruction) {
      addToast('Add an instruction first so I know what to select', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const allPaths = getAllFilePaths(rootNodeRef.current);
      const relevant = await suggestRelevantFiles(effectiveInstruction, allPaths);
      if (!relevant || relevant.length === 0) {
        addToast('No relevant files detected from the instruction', 'info');
        return;
      }
      const next = new Set(selectedPathsRef.current);
      relevant.forEach(p => next.add(p));
      setSelectedPaths(next);
      addToast(`Smart-selected ${relevant.length} file(s)`, 'success');
    } catch (e: any) {
      addToast(`Smart select failed: ${e.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [addToast]);

  const autoRefineInstruction = useCallback(async () => {
    const currentInstruction = userInstructionRef.current?.trim() || '';
    if (!currentInstruction) {
      addToast('Add an instruction first to refine', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      const refined = await generateRefinedPrompt(currentInstruction, Array.from(selectedPathsRef.current));
      setUserInstruction(refined);
      addToast('Instruction refined', 'success');
    } catch (e: any) {
      addToast(`Refine failed: ${e.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [addToast]);

  const savePrompt = useCallback((name: string, content: string, tags: string[] = ['custom']) => {
    const newPrompt: PromptTemplate = {
      id: Date.now().toString(),
      name,
      template: content,
      tags: tags.length > 0 ? tags : ['custom']
    };
    setSavedPrompts(prev => {
      const next = [newPrompt, ...prev];
      localStorage.setItem('vb_saved_prompts', JSON.stringify(next));
      return next;
    });
    addToast('Prompt saved to library', 'success');
  }, [addToast]);

  const updatePrompt = useCallback((id: string, updates: Partial<PromptTemplate>) => {
    setSavedPrompts(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      localStorage.setItem('vb_saved_prompts', JSON.stringify(next));
      return next;
    });
    addToast('Prompt updated', 'success');
  }, [addToast]);

  const deletePrompt = useCallback((id: string) => {
    setSavedPrompts(prev => {
      const next = prev.filter(p => p.id !== id);
      localStorage.setItem('vb_saved_prompts', JSON.stringify(next));
      return next;
    });
    addToast('Prompt deleted', 'info');
  }, [addToast]);

  const generateSuggestions = useCallback(async () => {
    if (!rootNode) return;
    setIsProcessing(true);
    try {
      addToast('Analyzing project structure...', 'info');
      const allPaths = getAllFilePaths(rootNode);
      const suggestions = await generateTemplateSuggestions(allPaths);
      setSuggestedTemplates(suggestions);
      addToast(`Generated ${suggestions.length} custom templates!`, 'success');
    } catch (e: any) {
      addToast(`Analysis failed: ${e.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [rootNode, addToast]);

  const saveSuggestedTemplate = useCallback((template: PromptTemplate) => {
    // Remove from suggestions
    setSuggestedTemplates(prev => prev.filter(p => p.id !== template.id));
    // Add to saved
    savePrompt(template.name, template.template, template.tags);
  }, [savePrompt]);

  const addRecentRepo = useCallback((url: string) => {
    setRecentRepos(prev => {
      const filtered = prev.filter(u => u !== url);
      const next = [url, ...filtered].slice(0, 5); // Keep last 5
      localStorage.setItem('vb_recent_repos', JSON.stringify(next));
      return next;
    });
  }, []);

  const removeRecentRepo = useCallback((url: string) => {
    setRecentRepos(prev => {
      const next = prev.filter(u => u !== url);
      localStorage.setItem('vb_recent_repos', JSON.stringify(next));
      return next;
    });
  }, []);

  const closeProject = useCallback(() => {
    setRootNode(null);
    setSelectedPaths(new Set());
    setLoadedFiles(new Map());
    setProjectMetadata(null);
    setBypassLanding(false); // Return to landing page state
    setSuggestedTemplates([]);
    addToast('Project closed', 'info');
  }, [addToast]);

  const findNodeByPath = useCallback((node: FileNode, path: string): FileNode | null => {
    if (node.path === path) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeByPath(child, path);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // File Actions
  const toggleDirectory = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }, []);

  const toggleFileSelection = useCallback(async (node: FileNode) => {
    const newSet = new Set(selectedPaths);
    if (newSet.has(node.path)) {
      newSet.delete(node.path);
    } else {
      newSet.add(node.path);
      // Pre-load content if needed for embedding
      if (!loadedFiles.has(node.path)) {
        try {
          const content = await readFileContent(node);
          setLoadedFiles(prev => new Map(prev).set(node.path, content));
        } catch (e) { console.error(e); }
      }
    }
    setSelectedPaths(newSet);
  }, [selectedPaths, loadedFiles]);

  const clearSelection = () => setSelectedPaths(new Set());

  // Canvas Logic
  const compilePrompt = useCallback(() => {
    const filesHeader = selectedPaths.size > 0 
      ? `--- CONTEXT FILES (${selectedPaths.size}) ---\n` 
      : "";
    
    let filesBody = "";
    selectedPaths.forEach(path => {
      if (contextMode === 'reference') {
        filesBody += `@${path}\n`;
      } else {
        const content = loadedFiles.get(path) || "(Content not loaded)";
        filesBody += `File: ${path}\n\`\`\`\n${content}\n\`\`\`\n\n`;
      }
    });

    const instructionHeader = `--- INSTRUCTION ---\n`;
    setGeneratedPrompt(`${filesHeader}${filesBody}\n${instructionHeader}${userInstruction}`);
  }, [selectedPaths, loadedFiles, contextMode, userInstruction]);

  useEffect(() => { compilePrompt(); }, [compilePrompt]);

  // Import
  const importGithubProject = async (url: string, token?: string) => {
    setIsProcessing(true);
    try {
      const root = await loadGithubRepo(url, token);
      setRootNode(root);
      setSelectedPaths(new Set());
      setLoadedFiles(new Map());
      addRecentRepo(url);
      setProjectMetadata({ type: 'github', url, token, lastSynced: Date.now() });
      setBypassLanding(true); // Ensure we show the main layout
      addToast('Latest code pulled from GitHub', 'success');
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally { setIsProcessing(false); }
  };

  const refreshProject = useCallback(async () => {
    if (!projectMetadata || projectMetadata.type !== 'github' || !projectMetadata.url) return;
    
    setIsProcessing(true);
    try {
        addToast('Syncing with GitHub...', 'info');
        const root = await loadGithubRepo(projectMetadata.url, projectMetadata.token);
        setRootNode(root);
        setLoadedFiles(new Map()); // Clear content cache to force re-fetch on read
        // Note: selectedPaths are preserved, assuming paths are stable
        setProjectMetadata(prev => prev ? ({ ...prev, lastSynced: Date.now() }) : null);
        addToast('Repository updated successfully', 'success');
    } catch (e: any) {
        addToast(`Refresh failed: ${e.message}`, 'error');
    } finally {
        setIsProcessing(false);
    }
  }, [projectMetadata, addToast]);

  const loadLocalProject = useCallback((node: FileNode) => {
     setRootNode(node);
     setSelectedPaths(new Set());
     setLoadedFiles(new Map());
     setProjectMetadata({ type: 'local', lastSynced: Date.now() });
     addToast('Local project loaded', 'success');
  }, [addToast]);

  // Agent Logic
  const executeTool = async (call: FunctionCall) => {
    const { name, args } = call;
    // @ts-ignore
    setAgentActivity({ type: 'tool', toolName: name, description: `Running ${name}...` });

    let result: any = { status: 'ok' };
    
    try {
      if (name === 'list_files') {
        result = { files: getAllFilePaths(rootNodeRef.current) };
      } 
      else if (name === 'read_file') {
        // @ts-ignore
        const node = findNodeByPath(rootNodeRef.current, args.path);
        if (node) {
          const content = await readFileContent(node);
          setLoadedFiles(prev => new Map(prev).set(node.path, content));
          result = { content: content.slice(0, 10000) }; // Limit context
        } else {
          result = { error: "File not found" };
        }
      }
      else if (name === 'select_files') {
        // @ts-ignore
        const newSet = new Set(selectedPathsRef.current);
        // @ts-ignore
        args.paths.forEach((p: string) => newSet.add(p));
        setSelectedPaths(newSet);
        result = { count: newSet.size };
      }
      else if (name === 'deselect_files') {
        // @ts-ignore
        const newSet = new Set(selectedPathsRef.current);
        // @ts-ignore
        args.paths.forEach((p: string) => newSet.delete(p));
        setSelectedPaths(newSet);
      }
      else if (name === 'update_instruction') {
        // @ts-ignore
        setUserInstruction(args.text);
      }
      else if (name === 'suggest_templates') {
        if (!rootNodeRef.current) {
          result = { error: "No project loaded" };
        } else {
          await generateSuggestions();
          result = { message: "Templates generated and added to Library > Suggested tab." };
        }
      }
    } catch (e: any) {
      result = { error: e.message };
    }
    
    setAgentActivity({ type: 'thinking' }); // Back to thinking
    return { name, response: result };
  };

  const startAgent = async (initialMsg?: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // @ts-ignore
    chatSessionRef.current = ai.chats.create({
      model: activeModel,
      config: { 
        tools: AGENT_TOOLS, 
        systemInstruction: SYSTEM_INSTRUCTION 
      }
    });
    setChatMessages([]);
    if (initialMsg) await sendMessage(initialMsg);
  };

  const sendMessage = async (text: string) => {
    if (!chatSessionRef.current) await startAgent();
    
    const userMsg: ChatMessage = { role: 'user', text, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setAgentActivity({ type: 'thinking' });
    abortStreamRef.current = false;

    try {
      // Input can be a string (user message) or Part[] (tool responses)
      const processTurn = async (input: string | Part[]) => {
        // Fix: sendMessageStream expects an object with 'message' property
        // @ts-ignore
        const result = await chatSessionRef.current.sendMessageStream({ message: input });
        
        let fullText = "";
        let toolCalls: any[] = [];

        // Add placeholder model message
        setChatMessages(prev => {
          if (prev[prev.length - 1]?.role === 'model') return prev;
          return [...prev, { role: 'model', text: '', timestamp: Date.now() }];
        });

        for await (const chunk of result) {
          if (abortStreamRef.current) break;
          
          if (chunk.text) {
             fullText += chunk.text;
             setChatMessages(prev => {
               const last = {...prev[prev.length - 1]};
               last.text = fullText;
               return [...prev.slice(0, -1), last];
             });
          }
          if (chunk.functionCalls) {
             toolCalls.push(...chunk.functionCalls);
          }
        }

        if (toolCalls.length > 0) {
           const responses = [];
           // Update message to show tool usage
           setChatMessages(prev => {
             const last = {...prev[prev.length - 1]};
             last.toolCalls = toolCalls;
             return [...prev.slice(0, -1), last];
           });

           for (const call of toolCalls) {
             const res = await executeTool(call);
             responses.push({ functionResponse: res });
           }
           // Recursively send tool outputs
           await processTurn(responses);
        }
      };

      await processTurn(text);

    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: 'model', text: `Error: ${e.message}`, timestamp: Date.now(), isError: true }]);
    } finally {
      setAgentActivity({ type: 'idle' });
    }
  };

  const stopAgent = () => { abortStreamRef.current = true; setAgentActivity({ type: 'idle' }); };
  const clearChat = () => { setChatMessages([]); chatSessionRef.current = null; };

  // Preview Logic
  const openPreview = async (node: FileNode) => {
    setPreviewNode(node);
    try {
       const content = await readFileContent(node);
       setPreviewContent(content);
    } catch { setPreviewContent("Error loading preview"); }
  };
  const closePreview = () => { setPreviewNode(null); setPreviewContent(null); };

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + A toggles Agent panel and focuses input when opening
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAgentOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <AppContext.Provider value={{
      rootNode, setRootNode, loadLocalProject,
      selectedPaths, setSelectedPaths, toggleFileSelection, clearSelection,
      expandedPaths, toggleDirectory, loadedFiles, closeProject,
      userInstruction, setUserInstruction,
      generatedPrompt, setGeneratedPrompt, compilePrompt,
      contextMode, setContextMode,
      savedPrompts, suggestedTemplates, savePrompt, deletePrompt, updatePrompt,
      generateSuggestions, saveSuggestedTemplate,
      agentActivity, chatMessages, startAgent, sendMessage, stopAgent, clearChat,
      activeModel, setActiveModel, isProcessing,
      toasts, addToast, removeToast, importGithubProject,
      previewNode, previewContent, openPreview, closePreview,
      isSidebarOpen, setIsSidebarOpen,
      isAgentOpen, setIsAgentOpen,
      recentRepos, removeRecentRepo,
      bypassLanding, setBypassLanding,
      projectMetadata, refreshProject,
      isExportOpen, setIsExportOpen,
      smartSelectFiles, autoRefineInstruction
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useStore must be used within AppProvider");
  return context;
};
