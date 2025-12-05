
import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../store';
import { FileTree } from './FileTree';
import { PromptCanvas } from './PromptCanvas';
import { AgentInterface } from './AgentInterface';
import { openDirectory, processFileList } from '../services/fileSystem';
import { FolderPlus, Github, Loader2, X, Search, PanelLeftClose, PanelLeftOpen, PanelRightOpen, Box, History, ArrowRight, Home, LogOut, FolderOpen, RefreshCw, UploadCloud } from 'lucide-react';
import { FilePreviewModal } from './FilePreviewModal';
import { ExportModal } from './ExportModal';
import { GithubImportModal } from './GithubImportModal';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border border-zinc-700 bg-zinc-900/95 text-zinc-100 backdrop-blur animate-in slide-in-from-right-10">
          <span className="text-sm font-medium">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="hover:text-zinc-400"><X size={14}/></button>
        </div>
      ))}
    </div>
  );
};

export const Layout: React.FC = () => {
  const { rootNode, importGithubProject, isProcessing, selectedPaths, isSidebarOpen, setIsSidebarOpen, isAgentOpen, setIsAgentOpen, recentRepos, removeRecentRepo, bypassLanding, setBypassLanding, closeProject, refreshProject, projectMetadata, loadLocalProject, setIsExportOpen } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [githubToken, setGithubToken] = useState(localStorage.getItem('vb_gh_token') || '');
  const [searchTerm, setSearchTerm] = useState('');

  // Default open state for desktop
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setIsAgentOpen(true);
    }
  }, [setIsAgentOpen]);

  const handleOpenProject = async () => {
    try {
      const root = await openDirectory();
      if (root) {
        loadLocalProject(root);
        setBypassLanding(true);
      }
    } catch { fileInputRef.current?.click(); }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const root = await processFileList(e.target.files);
      if (root) {
         loadLocalProject(root);
         setBypassLanding(true);
      }
    }
  };

  const handleGithubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl) return;
    localStorage.setItem('vb_gh_token', githubToken);
    await importGithubProject(githubUrl, githubToken);
    setShowGithubModal(false);
  };

  const handleGoHome = () => {
    closeProject();
  };

  if (!rootNode && !bypassLanding) {
    return (
       <div className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 via-zinc-950 to-zinc-950" />
         <div className="absolute inset-0 opacity-30 bg-[linear-gradient(120deg,rgba(99,102,241,0.12),transparent_40%),linear-gradient(300deg,rgba(236,72,153,0.08),transparent_45%)]" />
         <div className="absolute -top-32 -right-24 w-80 h-80 rounded-full blur-3xl bg-indigo-500/10" />
         <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full blur-3xl bg-purple-500/10" />
         <div className="z-10 text-center space-y-8 max-w-3xl p-8 w-full flex flex-col items-center backdrop-blur-sm">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-[11px] font-semibold uppercase tracking-[0.2em]">
             Agent-First • Prompt Ops
           </div>
           <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/20 ring-2 ring-indigo-500/30">
             <Box className="text-white" size={28} />
           </div>
           <div className="space-y-3">
             <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">Build sharper prompts with contextual intelligence.</h1>
             <p className="text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base">Open your codebase, curate a context stack, and let the Vibe Agent refine instructions with a studio-grade workspace.</p>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <button onClick={handleOpenProject} className="p-6 bg-zinc-900/80 border border-zinc-800 rounded-xl hover:border-indigo-500/50 hover:bg-zinc-800/70 transition-all group text-left shadow-lg shadow-indigo-900/20">
                <FolderPlus className="mb-3 text-indigo-400 group-hover:scale-110 transition-transform" />
                <div className="font-semibold text-zinc-100 text-lg">Local Project</div>
                <div className="text-xs text-zinc-500 mt-1">Open a folder from disk.</div>
                <span className="inline-flex items-center gap-1 text-[10px] text-indigo-300 mt-3">Instant import <ArrowRight size={12} /></span>
              </button>
              <button onClick={() => setShowGithubModal(true)} className="p-6 bg-zinc-900/80 border border-zinc-800 rounded-xl hover:border-purple-500/50 hover:bg-zinc-800/70 transition-all group text-left shadow-lg shadow-purple-900/20">
                <Github className="mb-3 text-purple-400 group-hover:scale-110 transition-transform" />
                <div className="font-semibold text-zinc-100 text-lg">GitHub Repo</div>
                <div className="text-xs text-zinc-500 mt-1">Clone a remote repository.</div>
                <span className="inline-flex items-center gap-1 text-[10px] text-purple-300 mt-3">Token optional <ArrowRight size={12} /></span>
              </button>
           </div>

           <div className="grid grid-cols-3 gap-3 w-full text-left">
             {[
               { label: 'Context Stack', detail: 'Select files and modes per request' },
               { label: 'Refine Fast', detail: 'Ctrl+Enter sends to the agent' },
               { label: 'Export Smart', detail: 'Share tailored context bundles' },
             ].map((item) => (
               <div key={item.label} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-300 shadow-inner shadow-zinc-900/50">
                 <div className="text-[11px] uppercase font-semibold tracking-wide text-zinc-500">{item.label}</div>
                 <div className="text-sm text-zinc-200 mt-1 leading-relaxed">{item.detail}</div>
               </div>
             ))}
           </div>

           {recentRepos.length > 0 && (
             <div className="w-full">
                <div className="flex items-center gap-2 text-zinc-500 mb-3 px-1 mt-4">
                   <History size={14} />
                   <span className="text-xs font-bold uppercase tracking-wider">Recent Repositories</span>
                </div>
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar shadow-inner shadow-zinc-900/40">
                   {recentRepos.map(repo => (
                      <div key={repo} className="group flex items-center justify-between p-3 border-b border-zinc-800/70 last:border-0 hover:bg-zinc-800/60 transition-colors cursor-pointer" onClick={() => importGithubProject(repo, localStorage.getItem('vb_gh_token') || undefined)}>
                         <div className="flex-1 text-left text-sm text-zinc-300 group-hover:text-indigo-300 truncate font-mono flex items-center gap-2">
                            <Github size={14} className="opacity-50" />
                            {repo}
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); removeRecentRepo(repo); }} className="text-zinc-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={14} />
                         </button>
                      </div>
                   ))}
                </div>
             </div>
           )}

           <button 
             onClick={() => setBypassLanding(true)} 
             className="mt-6 text-zinc-500 hover:text-zinc-200 text-xs flex items-center gap-2 transition-colors"
           >
              Skip to Prompt Library <ArrowRight size={12} />
           </button>
         </div>
         <input type="file" ref={fileInputRef} onChange={handleFileInputChange} className="hidden" {...{ webkitdirectory: "", multiple: true } as any} />
         
         {/* Reuse shared GitHub modal in landing context */}
         <GithubImportModal
           show={showGithubModal}
           githubUrl={githubUrl}
           setGithubUrl={setGithubUrl}
           githubToken={githubToken}
           setGithubToken={setGithubToken}
           recentRepos={recentRepos}
           isProcessing={isProcessing}
           onClose={() => setShowGithubModal(false)}
           onSubmit={handleGithubSubmit}
           context="landing"
         />
       </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-zinc-950 flex overflow-hidden text-zinc-200 font-sans relative">
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.08),transparent_20%),linear-gradient(120deg,rgba(39,39,42,0.6),rgba(24,24,27,0.9))]" />
      <ToastContainer />
      <FilePreviewModal />
      <ExportModal />
      <input type="file" ref={fileInputRef} onChange={handleFileInputChange} className="hidden" {...{ webkitdirectory: "", multiple: true } as any} />

       <GithubImportModal
         show={showGithubModal}
         githubUrl={githubUrl}
         setGithubUrl={setGithubUrl}
         githubToken={githubToken}
         setGithubToken={setGithubToken}
         recentRepos={recentRepos}
         isProcessing={isProcessing}
         onClose={() => setShowGithubModal(false)}
         onSubmit={handleGithubSubmit}
       />

      {/* LEFT: File Explorer / Project Manager */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-0'} bg-zinc-900/30 border-r border-zinc-800 flex flex-col transition-all duration-300 overflow-hidden shrink-0`}>
         <div className="p-3 border-b border-zinc-800 flex flex-col gap-3 bg-zinc-900/50">
             <div className="flex justify-between items-center">
               <div className="flex items-center gap-2 cursor-pointer hover:text-indigo-400 transition-colors" onClick={handleGoHome}>
                 <Box size={16} className="text-indigo-500" />
                 <span className="font-bold text-xs tracking-wider text-zinc-200 uppercase">VibePrompt</span>
               </div>
               <button onClick={()=>setIsSidebarOpen(false)} className="text-zinc-500 hover:text-zinc-300"><PanelLeftClose size={14}/></button>
            </div>
            
            {/* Project Toolbar */}
            <div className="flex gap-1 bg-zinc-950/50 p-1 rounded-lg border border-zinc-800/50">
               <button onClick={handleGoHome} className="flex-1 p-1.5 flex justify-center hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-200 transition-colors" title="Home / Close Project">
                  <Home size={14} />
               </button>
               <button onClick={handleOpenProject} className="flex-1 p-1.5 flex justify-center hover:bg-zinc-800 rounded text-zinc-500 hover:text-indigo-400 transition-colors" title="Open Local Folder">
                  <FolderOpen size={14} />
               </button>
               <button onClick={() => setShowGithubModal(true)} className="flex-1 p-1.5 flex justify-center hover:bg-zinc-800 rounded text-zinc-500 hover:text-purple-400 transition-colors" title="Open GitHub Repo">
                  <Github size={14} />
               </button>
               {projectMetadata?.type === 'github' && (
                 <button 
                   onClick={refreshProject} 
                   disabled={isProcessing}
                   className={`flex-1 p-1.5 flex justify-center hover:bg-zinc-800 rounded text-zinc-500 hover:text-green-400 transition-colors ${isProcessing ? 'animate-spin' : ''}`} 
                   title="Refresh from GitHub"
                 >
                    <RefreshCw size={14} />
                 </button>
               )}
               {rootNode && (
                 <>
                   <button 
                      onClick={() => setIsExportOpen(true)} 
                      disabled={isProcessing}
                      className="flex-1 p-1.5 flex justify-center hover:bg-zinc-800 rounded text-zinc-500 hover:text-blue-400 transition-colors" 
                      title="Export Full Project Context (for Gemini/LLMs)"
                   >
                      <UploadCloud size={14} />
                   </button>
                   <button onClick={closeProject} className="flex-1 p-1.5 flex justify-center hover:bg-red-900/20 rounded text-zinc-500 hover:text-red-400 transition-colors" title="Close Current Project">
                      <LogOut size={14} />
                   </button>
                 </>
               )}
            </div>

            {/* Project Title or Search */}
            {rootNode ? (
               <div className="relative">
                  <Search className="absolute left-2.5 top-2 text-zinc-600" size={12} />
                  <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Filter files..." className="w-full bg-zinc-950/50 border border-zinc-800 rounded-md py-1.5 pl-8 pr-2 text-xs text-zinc-300 focus:border-indigo-500/50 outline-none" />
               </div>
            ) : (
              <div className="text-[10px] text-zinc-500 font-mono text-center pt-1">
                Library Mode (No Project)
              </div>
            )}
         </div>

         {/* Content Area */}
         <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
            {rootNode ? (
               <FileTree root={rootNode} searchTerm={searchTerm} />
            ) : (
               <div className="h-full flex flex-col items-center justify-center p-4 space-y-4 opacity-50 hover:opacity-100 transition-opacity">
                   <div className="text-center">
                     <FolderPlus className="mx-auto mb-2 text-zinc-600" size={24} />
                     <button onClick={handleOpenProject} className="text-xs text-indigo-400 hover:underline">Open Local Project</button>
                   </div>
                   <div className="w-full border-t border-zinc-800"></div>
                   <div className="text-center">
                     <Github className="mx-auto mb-2 text-zinc-600" size={24} />
                     <button onClick={() => setShowGithubModal(true)} className="text-xs text-purple-400 hover:underline">Import GitHub Repo</button>
                   </div>
               </div>
            )}
         </div>

         {rootNode && (
           <div className="p-2 border-t border-zinc-800 bg-zinc-900/50 flex justify-between items-center text-[10px] text-zinc-600">
              <span className="flex items-center gap-1.5 truncate max-w-[120px]">
                {projectMetadata?.type === 'github' ? <Github size={10} /> : <FolderPlus size={10} />}
                {rootNode.name}
              </span>
              <div className="flex items-center gap-2">
                 <span>{projectMetadata?.type === 'github' ? 'Synced' : 'Local'}</span>
                 <span className="w-px h-3 bg-zinc-800"/>
                 <span>{selectedPaths.size} files</span>
              </div>
           </div>
         )}
      </aside>

      {/* CENTER: Prompt Canvas */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
         {!isSidebarOpen && (
            <button onClick={()=>setIsSidebarOpen(true)} className="absolute top-3 left-3 z-20 text-zinc-600 hover:text-zinc-300 bg-zinc-900/50 p-1.5 rounded-md backdrop-blur">
               <PanelLeftOpen size={18} />
            </button>
         )}
         
         {!isAgentOpen && (
            <button 
               onClick={()=>setIsAgentOpen(true)} 
               className="absolute top-3 right-3 z-20 text-zinc-600 hover:text-indigo-400 bg-zinc-900/50 p-1.5 rounded-md backdrop-blur transition-colors"
               title="Open Agent Chat"
            >
               <PanelRightOpen size={18} />
            </button>
         )}
         
         <PromptCanvas />
      </main>

      {/* RIGHT: Agent Interface - Collapsible & Responsive */}
      <aside className={`
         fixed inset-y-0 right-0 z-50 bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col shrink-0 transition-transform duration-300
         ${isAgentOpen ? 'translate-x-0' : 'translate-x-full'}
         w-[85vw] sm:w-[400px]
         lg:relative lg:translate-x-0 lg:bg-zinc-900/20 lg:z-0 lg:transition-all
         ${isAgentOpen ? 'lg:w-[400px]' : 'lg:w-0 lg:border-l-0 lg:overflow-hidden'}
      `}>
         <div className="h-full w-full flex flex-col overflow-hidden">
             <AgentInterface />
         </div>
      </aside>
      
      {/* Mobile Backdrop for Agent */}
      {isAgentOpen && (
         <div 
           className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
           onClick={() => setIsAgentOpen(false)}
         />
      )}
    </div>
  );
};
