
import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../store';
import { FileTree } from './FileTree';
import { PromptCanvas } from './PromptCanvas';
import { AgentInterface } from './AgentInterface';
import { openDirectory, processFileList } from '../services/fileSystem';
import { FolderPlus, Github, Loader2, X, Search, Trash2, PanelLeftClose, PanelLeftOpen, PanelRightOpen, PanelRightClose, Box, History, ArrowRight, Home, LogOut, FolderOpen, RefreshCw, UploadCloud } from 'lucide-react';
import { FilePreviewModal } from './FilePreviewModal';
import { ExportModal } from './ExportModal';

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
  const { rootNode, setRootNode, importGithubProject, isProcessing, clearSelection, selectedPaths, isSidebarOpen, setIsSidebarOpen, isAgentOpen, setIsAgentOpen, recentRepos, removeRecentRepo, bypassLanding, setBypassLanding, closeProject, refreshProject, projectMetadata, loadLocalProject, setIsExportOpen } = useStore();
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
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950" />
         <div className="z-10 text-center space-y-8 max-w-lg p-6 w-full flex flex-col items-center">
           <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/20">
             <Box className="text-white" size={32} />
           </div>
           <div>
             <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">VibePrompt Architect</h1>
             <p className="text-zinc-400">Agent-First Prompt Engineering Environment.</p>
           </div>
           
           <div className="grid grid-cols-2 gap-4 w-full">
              <button onClick={handleOpenProject} className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-all group text-left">
                <FolderPlus className="mb-3 text-indigo-400 group-hover:scale-110 transition-transform" />
                <div className="font-semibold text-zinc-200">Local Project</div>
                <div className="text-xs text-zinc-500 mt-1">Open folder from disk</div>
              </button>
              <button onClick={() => setShowGithubModal(true)} className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-purple-500/50 hover:bg-zinc-800/50 transition-all group text-left">
                <Github className="mb-3 text-purple-400 group-hover:scale-110 transition-transform" />
                <div className="font-semibold text-zinc-200">GitHub Repo</div>
                <div className="text-xs text-zinc-500 mt-1">Clone remote repository</div>
              </button>
           </div>

           {recentRepos.length > 0 && (
             <div className="w-full">
                <div className="flex items-center gap-2 text-zinc-500 mb-3 px-1 mt-4">
                   <History size={14} />
                   <span className="text-xs font-bold uppercase tracking-wider">Recent Repositories</span>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                   {recentRepos.map(repo => (
                      <div key={repo} className="group flex items-center justify-between p-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors cursor-pointer" onClick={() => importGithubProject(repo, localStorage.getItem('vb_gh_token') || undefined)}>
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
             className="mt-6 text-zinc-500 hover:text-zinc-300 text-xs flex items-center gap-2 transition-colors"
           >
              Skip to Prompt Library <ArrowRight size={12} />
           </button>
         </div>
         <input type="file" ref={fileInputRef} onChange={handleFileInputChange} className="hidden" {...{ webkitdirectory: "", multiple: true } as any} />
         
         {/* Render Modal even here if triggered */}
         {showGithubModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
               <form onSubmit={handleGithubSubmit} className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 w-96 space-y-4 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-lg font-bold text-white">Import Repository</h3>
                  <input value={githubUrl} onChange={e=>setGithubUrl(e.target.value)} placeholder="https://github.com/owner/repo" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none" autoFocus />
                  <input value={githubToken} onChange={e=>setGithubToken(e.target.value)} placeholder="GitHub Token (Optional)" type="password" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none" />
                  
                  {recentRepos.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Recent</div>
                      <div className="flex flex-col gap-1 max-h-32 overflow-y-auto custom-scrollbar bg-zinc-950/50 rounded-lg p-1 border border-zinc-800/50">
                        {recentRepos.map(repo => (
                          <button
                            key={repo}
                            type="button"
                            onClick={() => setGithubUrl(repo)}
                            className="text-left text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/50 px-2 py-1.5 rounded truncate font-mono transition-colors"
                          >
                            {repo}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                     <button type="button" onClick={()=>setShowGithubModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
                     <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 disabled:opacity-50">
                        {isProcessing ? <Loader2 className="animate-spin" size={16}/> : 'Import'}
                     </button>
                  </div>
               </form>
            </div>
         )}
       </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-zinc-950 flex overflow-hidden text-zinc-200 font-sans">
      <ToastContainer />
      <FilePreviewModal />
      <ExportModal />
      <input type="file" ref={fileInputRef} onChange={handleFileInputChange} className="hidden" {...{ webkitdirectory: "", multiple: true } as any} />

       {/* GITHUB MODAL RE-USED FOR SIDEBAR ACCESS */}
       {showGithubModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
               <form onSubmit={handleGithubSubmit} className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 w-96 space-y-4 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-lg font-bold text-white">Import Repository</h3>
                  <input value={githubUrl} onChange={e=>setGithubUrl(e.target.value)} placeholder="https://github.com/owner/repo" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none" autoFocus />
                  <input value={githubToken} onChange={e=>setGithubToken(e.target.value)} placeholder="GitHub Token (Optional)" type="password" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none" />
                  
                  {recentRepos.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Recent</div>
                      <div className="flex flex-col gap-1 max-h-32 overflow-y-auto custom-scrollbar bg-zinc-950/50 rounded-lg p-1 border border-zinc-800/50">
                        {recentRepos.map(repo => (
                          <button
                            key={repo}
                            type="button"
                            onClick={() => setGithubUrl(repo)}
                            className="text-left text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/50 px-2 py-1.5 rounded truncate font-mono transition-colors"
                          >
                            {repo}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                     <button type="button" onClick={()=>setShowGithubModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
                     <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 disabled:opacity-50">
                        {isProcessing ? <Loader2 className="animate-spin" size={16}/> : 'Import'}
                     </button>
                  </div>
               </form>
            </div>
         )}

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
