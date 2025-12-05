
import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Copy, Check, FileText, Link2, Layers, Edit3, Book, Save, Trash2, Plus, Download, LayoutTemplate, Filter, Tag, Sparkles, Braces, Search, Grid, List, MoreVertical, Lightbulb, Eye, Maximize2, X, Eraser } from 'lucide-react';
import { DEFAULT_TEMPLATES } from '../constants';
import { PromptTemplate } from '../types';

export const PromptCanvas: React.FC = () => {
  const { 
    userInstruction, setUserInstruction, selectedPaths, setSelectedPaths,
    contextMode, setContextMode, generatedPrompt, 
    savedPrompts, suggestedTemplates, savePrompt, updatePrompt, deletePrompt,
    generateSuggestions, saveSuggestedTemplate, isProcessing,
    sendMessage, agentActivity, addToast, rootNode, isSidebarOpen,
    smartSelectFiles, autoRefineInstruction, clearSelection
  } = useStore();
  
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'canvas' | 'library' | 'preview'>('canvas');
  
  // Library State
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'saved' | 'system' | 'suggested'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<PromptTemplate | null>(null);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptTags, setNewPromptTags] = useState('');

  const handleCopy = () => {
     if (!generatedPrompt) return;
     navigator.clipboard.writeText(generatedPrompt);
     setCopied(true);
     addToast('Prompt copied to clipboard', 'success');
     setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptName.trim()) return;
    const tags = newPromptTags.split(',').map(t => t.trim()).filter(Boolean);
    
    if (editingPrompt) {
      updatePrompt(editingPrompt.id, { name: newPromptName, tags });
    } else {
      savePrompt(newPromptName, userInstruction, tags);
    }
    
    setNewPromptName('');
    setNewPromptTags('');
    setEditingPrompt(null);
    setShowSaveModal(false);
  };

  const handleRefine = async () => {
    if (!userInstruction.trim()) return;
    await autoRefineInstruction();
  };

  const handleSmartSelect = async () => {
    if (!userInstruction.trim()) {
      addToast('Add an instruction so I can smart-select files', 'info');
      return;
    }
    await smartSelectFiles(userInstruction);
  };

  const handleClearSelection = () => {
    if (selectedPaths.size === 0) return;
    clearSelection();
    addToast('Context stack cleared', 'info');
  };

  const handleClearInstruction = () => {
    if (userInstruction.trim().length > 0) {
      if (confirm("Are you sure you want to clear the instruction?")) {
        setUserInstruction('');
        addToast("Instruction cleared", 'info');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRefine();
    }
  };

  const loadTemplate = (template: PromptTemplate, e?: React.MouseEvent) => {
    // Prevent bubbling if triggered from a card click
    e?.stopPropagation();
    e?.preventDefault();
    
    // Safety check for template
    if (!template || !template.template) {
       addToast("Error: Template content is missing or invalid.", 'error');
       return;
    }

    // Confirmation if replacing content
    if (userInstruction.trim().length > 10 && userInstruction !== template.template) {
        if (!window.confirm(`Replace current instruction with "${template.name}"?`)) {
            return;
        }
    }
    
    setUserInstruction(template.template);
    setPreviewTemplate(null); // Close preview modal if open
    setActiveTab('canvas');
    addToast(`Template "${template.name}" applied!`, 'success');
  };
  
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this prompt template?')) {
      deletePrompt(id);
    }
  };

  const openEditModal = (prompt: PromptTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPrompt(prompt);
    setNewPromptName(prompt.name);
    setNewPromptTags(prompt.tags.join(', '));
    setShowSaveModal(true);
  };
  
  const closeSaveModal = () => {
    setShowSaveModal(false);
    setEditingPrompt(null);
    setNewPromptName('');
    setNewPromptTags('');
  };

  const removeFile = (path: string) => {
    const next = new Set(selectedPaths);
    next.delete(path);
    setSelectedPaths(next);
  };

  // --- Library Logic ---
  const allTemplates = useMemo(() => {
     const custom = savedPrompts.map(p => ({ ...p, type: 'custom' }));
     const suggested = suggestedTemplates.map(p => ({ ...p, type: 'suggested' }));
     const system = DEFAULT_TEMPLATES.map(p => ({ ...p, type: 'system' }));
     return [...suggested, ...custom, ...system];
  }, [savedPrompts, suggestedTemplates]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    allTemplates.forEach(t => t.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [allTemplates]);

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(librarySearch.toLowerCase()) || 
                              t.template.toLowerCase().includes(librarySearch.toLowerCase());
        const matchesType = libraryFilter === 'all' || 
                            // @ts-ignore
                            (libraryFilter === 'saved' && t.type === 'custom') || 
                            // @ts-ignore
                            (libraryFilter === 'system' && t.type === 'system') ||
                            // @ts-ignore
                            (libraryFilter === 'suggested' && t.type === 'suggested');
        const matchesTag = selectedTag ? t.tags.includes(selectedTag) : true;
        
        return matchesSearch && matchesType && matchesTag;
    });
  }, [allTemplates, librarySearch, libraryFilter, selectedTag]);

  return (
    <div className="flex flex-col h-full relative bg-zinc-950">
      {/* Canvas Header */}
      <div className={`h-14 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between gap-4 shrink-0 backdrop-blur-sm z-10 transition-all duration-300 ${!isSidebarOpen ? 'pl-14 pr-6' : 'px-6'}`}>
            <div className="flex gap-6">
            <button 
              onClick={() => setActiveTab('canvas')} 
              className={`text-sm font-medium h-14 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'canvas' ? 'text-indigo-400 border-indigo-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
            >
               <Edit3 size={16} /> Canvas
            </button>
            <button 
              onClick={() => setActiveTab('library')} 
              className={`text-sm font-medium h-14 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'library' ? 'text-indigo-400 border-indigo-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
            >
               <Book size={16} /> Library
               {suggestedTemplates.length > 0 && (
                 <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] text-white">
                   {suggestedTemplates.length}
                 </span>
               )}
            </button>
            <button 
              onClick={() => setActiveTab('preview')} 
              className={`text-sm font-medium h-14 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'preview' ? 'text-indigo-400 border-indigo-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
            >
               <FileText size={16} /> Final Output
            </button>
         </div>
         
         {activeTab === 'preview' && (
            <button onClick={handleCopy} className="flex items-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
               {copied ? <Check size={14}/> : <Copy size={14}/>}
               {copied ? 'Copied' : 'Copy Prompt'}
            </button>
         )}

         {/* Global quick copy button for other tabs */}
         {activeTab !== 'preview' && (
           <button
             onClick={handleCopy}
             disabled={!generatedPrompt}
             className="flex items-center gap-2 text-[11px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg transition-all hover:border-indigo-500/40 hover:text-white hover:bg-zinc-800/80 disabled:opacity-50 disabled:cursor-not-allowed"
             aria-label="Copy generated prompt"
             title={generatedPrompt ? 'Copy current prompt output' : 'Generate a prompt to copy'}
           >
             {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
             {copied ? 'Copied' : 'Copy Prompt'}
           </button>
         )}

         {activeTab === 'library' && (
             <div className="flex items-center gap-2">
                 {rootNode && (
                   <button 
                      onClick={() => { setLibraryFilter('suggested'); generateSuggestions(); }}
                      disabled={isProcessing}
                      className="flex items-center gap-2 text-xs font-bold bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 px-3 py-2 rounded-lg transition-all"
                   >
                      <Sparkles size={14} className={isProcessing ? "animate-spin" : ""} />
                      {isProcessing ? "Analyzing..." : "AI Suggestions"}
                   </button>
                 )}
                 <button 
                    onClick={() => { setUserInstruction(''); setActiveTab('canvas'); }}
                    className="flex items-center gap-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg transition-all"
                 >
                    <Plus size={14} /> New Prompt
                 </button>
             </div>
         )}
      </div>

      {/* --- TAB: CANVAS --- */}
      {activeTab === 'canvas' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
           {/* Section: Context Files */}
           <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> Context Stack ({selectedPaths.size})
                 </h3>
                 
                 {/* Context Mode Toggle */}
                 <div className="flex flex-wrap items-center gap-2 justify-end w-full sm:w-auto">
                    <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800/50 gap-1 shadow-sm">
                    <button 
                        onClick={() => setContextMode('reference')} 
                        className={`
                          flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all flex items-center justify-center gap-2
                          ${contextMode === 'reference' 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                            : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900'
                          }
                        `}
                    >
                        <Link2 size={12} strokeWidth={2.5} /> Reference
                    </button>
                    <button 
                        onClick={() => setContextMode('embed')} 
                        className={`
                          flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all flex items-center justify-center gap-2
                          ${contextMode === 'embed' 
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
                            : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900'
                          }
                        `}
                    >
                        <Braces size={12} strokeWidth={2.5} /> Embed
                    </button>
                    </div>
                    {rootNode && (
                      <>
                        <button
                          onClick={handleSmartSelect}
                          disabled={isProcessing || !userInstruction.trim()}
                          className="flex items-center gap-1.5 text-[10px] bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 border border-emerald-500/30 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                        >
                          <Sparkles size={12} className={isProcessing ? 'animate-spin' : ''} /> Smart Select
                        </button>
                        <button
                          onClick={handleClearSelection}
                          disabled={selectedPaths.size === 0}
                          className="flex items-center gap-1.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md transition-colors disabled:opacity-40"
                        >
                          <Eraser size={12} /> Clear Stack
                        </button>
                      </>
                    )}
                 </div>
              </div>
              
              {selectedPaths.size === 0 ? (
                 <div className="p-10 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-600 bg-zinc-900/20 transition-colors hover:border-zinc-700 hover:bg-zinc-900/30">
                    <Layers size={32} className="mb-3 opacity-50" />
                    <p className="text-sm font-medium text-zinc-400">Context Stack is Empty</p>
                    <p className="text-xs mt-1 text-zinc-500">Select files from the sidebar to add them here.</p>
                 </div>
              ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from(selectedPaths).map((path: string) => (
                       <div key={path} className={`
                          relative group border rounded-xl p-3 flex items-center gap-3 transition-all duration-300
                          ${contextMode === 'reference'
                              ? 'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/30' 
                              : 'bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/10 hover:border-orange-500/30'
                          }
                       `}>
                          <div className={`
                              w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors shadow-inner
                              ${contextMode === 'reference' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}
                          `}>
                              {contextMode === 'reference' ? <Link2 size={14}/> : <FileText size={14}/>}
                          </div>
                          
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div className={`text-xs font-mono font-medium truncate mb-0.5 ${contextMode === 'reference' ? 'text-blue-100' : 'text-orange-100'}`} title={path}>
                                  {path.split('/').pop()}
                              </div>
                              <div className="text-[9px] opacity-60 truncate font-mono text-zinc-400">
                                  {path}
                              </div>
                          </div>

                          <div className={`
                             hidden sm:flex text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0
                             ${contextMode === 'reference' 
                               ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' 
                               : 'bg-orange-500/10 text-orange-300 border-orange-500/20'
                             }
                          `}>
                             {contextMode === 'reference' ? '@REF' : 'EMBED'}
                          </div>

                          <button 
                              onClick={(e) => { e.stopPropagation(); removeFile(path); }}
                              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 absolute -top-2 -right-2 sm:-top-1.5 sm:-right-1.5 w-6 h-6 sm:w-5 sm:h-5 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-500/50 shadow-lg transition-all z-10"
                              title="Remove file"
                          >
                              <Trash2 size={10} />
                          </button>
                       </div>
                    ))}
                 </div>
              )}
           </div>

           {/* Section: User Instruction */}
           <div className="space-y-3 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                   <Edit3 size={14} /> Instruction
                </h3>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                   {userInstruction.length > 0 && (
                      <button 
                         onClick={handleClearInstruction}
                         className="flex items-center gap-1.5 text-[10px] bg-red-900/10 hover:bg-red-900/20 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-md transition-colors border border-red-900/20 font-medium"
                         title="Clear Instruction"
                      >
                         <Eraser size={12} /> Clear
                      </button>
                   )}
                   <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                   <button 
                      onClick={handleRefine}
                      disabled={!userInstruction.trim() || agentActivity.type !== 'idle'}
                      className="flex items-center gap-1.5 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 shadow-sm shadow-indigo-500/20 font-medium"
                      title="Send to Agent (Ctrl+Enter)"
                   >
                     <Sparkles size={12} /> Refine with Agent
                   </button>
                   <button 
                      onClick={() => setShowSaveModal(true)}
                      disabled={!userInstruction.trim()}
                      className="flex items-center gap-1.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 font-medium"
                   >
                      <Save size={12} /> Save as Template
                   </button>
                </div>
              </div>
              <div className="relative group flex-1">
                <textarea 
                   value={userInstruction}
                   onChange={(e) => setUserInstruction(e.target.value)}
                   onKeyDown={handleKeyDown}
                   placeholder="Describe what you want to do with the selected files..."
                   className="w-full h-full min-h-[350px] bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 text-sm text-zinc-200 focus:border-indigo-500 outline-none resize-none font-sans leading-relaxed shadow-inner"
                />
                <div className="absolute bottom-4 right-4 text-[10px] text-zinc-600 pointer-events-none group-focus-within:text-zinc-500 transition-colors">
                  <span className="font-mono bg-zinc-800/50 px-1 rounded border border-zinc-700/50">Ctrl+Enter</span> to refine
                </div>
              </div>
           </div>
        </div>
      )}

      {/* --- TAB: LIBRARY --- */}
      {activeTab === 'library' && (
        <div className="flex flex-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
           {/* Sidebar Filters */}
           <div className="w-56 border-r border-zinc-800 bg-zinc-900/30 flex flex-col shrink-0">
              <div className="p-4 space-y-1">
                 <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-2">Library Filters</h3>
                 <button 
                    onClick={() => setLibraryFilter('all')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${libraryFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
                 >
                    <Grid size={14} /> All Templates
                 </button>
                 {suggestedTemplates.length > 0 && (
                   <button 
                      onClick={() => setLibraryFilter('suggested')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${libraryFilter === 'suggested' ? 'bg-indigo-900/40 text-indigo-200' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
                   >
                      <Sparkles size={14} className="text-indigo-400" /> Suggested
                   </button>
                 )}
                 <button 
                    onClick={() => setLibraryFilter('saved')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${libraryFilter === 'saved' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
                 >
                    <Book size={14} /> My Saved
                 </button>
                 <button 
                    onClick={() => setLibraryFilter('system')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${libraryFilter === 'system' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
                 >
                    <LayoutTemplate size={14} /> System Defaults
                 </button>
              </div>
              
              <div className="px-4 py-2 border-t border-zinc-800 flex-1 overflow-y-auto custom-scrollbar">
                 <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3 px-2 flex items-center justify-between">
                    Tags 
                    {selectedTag && <button onClick={() => setSelectedTag(null)} className="text-zinc-600 hover:text-zinc-400"><Filter size={10} /></button>}
                 </h3>
                 <div className="flex flex-wrap gap-1.5">
                    {allTags.map(tag => (
                       <button
                         key={tag}
                         onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                         className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${selectedTag === tag ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'}`}
                       >
                          #{tag}
                       </button>
                    ))}
                 </div>
              </div>
           </div>

           {/* Main Grid */}
           <div className="flex-1 flex flex-col bg-zinc-950">
              <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                 <div className="relative max-w-md">
                    <Search className="absolute left-3 top-2.5 text-zinc-500" size={14} />
                    <input 
                       value={librarySearch}
                       onChange={e => setLibrarySearch(e.target.value)}
                       placeholder="Search templates..." 
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none"
                    />
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                 {filteredTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                        {libraryFilter === 'suggested' && suggestedTemplates.length === 0 ? (
                           <>
                             <Sparkles size={32} className="mb-3 text-zinc-600" />
                             <p className="text-sm">No suggestions yet.</p>
                             {rootNode ? (
                               <button onClick={generateSuggestions} className="mt-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors">
                                  Analyze Project
                               </button>
                             ) : (
                               <p className="text-xs mt-1">Open a project to get AI suggestions.</p>
                             )}
                           </>
                        ) : (
                          <>
                            <Filter size={32} className="mb-3 opacity-50" />
                            <p className="text-sm">No templates found matching your criteria.</p>
                            <button onClick={() => {setLibrarySearch(''); setSelectedTag(null); setLibraryFilter('all');}} className="mt-2 text-xs text-indigo-400 hover:underline">Clear Filters</button>
                          </>
                        )}
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredTemplates.map(template => (
                           <div key={template.id} className={`group border rounded-xl p-4 flex flex-col transition-all duration-300 relative overflow-hidden ${
                               // @ts-ignore
                               template.type === 'suggested' ? 'bg-indigo-950/10 border-indigo-500/30 shadow-lg shadow-indigo-900/10' : 
                               'bg-zinc-900 border-zinc-800 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5'
                           }`}>
                               {/* Badge for Type */}
                               <div className="absolute top-0 right-0 p-2 opacity-50">
                                  {/* @ts-ignore */}
                                  {template.type === 'system' && <LayoutTemplate size={12} className="text-zinc-600" />}
                                  {/* @ts-ignore */}
                                  {template.type === 'suggested' && <Sparkles size={12} className="text-indigo-400" />}
                                  {/* @ts-ignore */}
                                  {template.type === 'custom' && <Book size={12} className="text-zinc-500" />}
                               </div>
                               
                               <div className="mb-3 pr-6">
                                  <h4 className="font-semibold text-zinc-200 text-sm line-clamp-2 min-h-[1.25rem]" title={template.name}>{template.name}</h4>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                     {template.tags.slice(0, 3).map(t => (
                                        <span key={t} className="text-[9px] font-medium bg-zinc-950 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800/50">#{t}</span>
                                     ))}
                                     {template.tags.length > 3 && <span className="text-[9px] text-zinc-600 px-1">+{template.tags.length - 3}</span>}
                                  </div>
                               </div>

                               <div className="flex-1 bg-zinc-950 rounded-lg p-3 border border-zinc-900 mb-4 overflow-hidden relative group-hover:border-zinc-800 transition-colors">
                                  <p className="text-[10px] text-zinc-500 font-mono leading-relaxed line-clamp-4">
                                     {template.template}
                                  </p>
                                  <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-zinc-950 to-transparent" />
                               </div>

                               <div className="flex items-center gap-2 mt-auto">
                                  <button 
                                     onClick={(e) => { e.stopPropagation(); setPreviewTemplate(template); }}
                                     className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-500 hover:text-indigo-400 hover:bg-zinc-700 transition-colors"
                                     title="Preview Template"
                                  >
                                      <Maximize2 size={12} />
                                  </button>

                                  <button 
                                     onClick={(e) => loadTemplate(template, e)}
                                     className="flex-1 bg-zinc-800 hover:bg-indigo-600 hover:text-white text-zinc-300 text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 group-hover:bg-zinc-800/80"
                                  >
                                     <Download size={12} /> Use
                                  </button>
                                  
                                  {/* Suggested Actions */}
                                  {/* @ts-ignore */}
                                  {template.type === 'suggested' && (
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); saveSuggestedTemplate(template); }}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-500 hover:text-green-400 hover:bg-zinc-700 transition-colors"
                                        title="Save to Library"
                                     >
                                        <Save size={12} />
                                     </button>
                                  )}

                                  {/* Custom Actions */}
                                  {/* @ts-ignore */}
                                  {template.type === 'custom' && (
                                     <>
                                        <button 
                                            onClick={(e) => openEditModal(template, e)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-500 hover:text-indigo-400 hover:bg-zinc-700 transition-colors"
                                            title="Edit"
                                        >
                                           <Edit3 size={12} />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDelete(template.id, e)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                                            title="Delete"
                                        >
                                           <Trash2 size={12} />
                                        </button>
                                     </>
                                  )}
                               </div>
                           </div>
                        ))}
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* --- TAB: PREVIEW --- */}
      {activeTab === 'preview' && (
         <div className="flex-1 overflow-hidden relative bg-zinc-950 animate-in fade-in slide-in-from-right-2 duration-300">
             <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-8 max-w-4xl mx-auto w-full">
                <div className="relative group">
                   <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap break-words leading-relaxed bg-transparent p-4 pb-20">
                      {generatedPrompt || <span className="text-zinc-600 italic">Complete the steps in the Canvas to generate a prompt...</span>}
                   </pre>
                </div>
             </div>
         </div>
      )}

      {/* Save/Edit Modal */}
      {showSaveModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleSave} className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white">{editingPrompt ? 'Edit Template' : 'Save Prompt Template'}</h3>
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Template Name</label>
              <input 
                autoFocus
                value={newPromptName}
                onChange={e => setNewPromptName(e.target.value)}
                placeholder="e.g., React Component Generator"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5 flex items-center gap-1"><Tag size={10} /> Tags (comma separated)</label>
              <input 
                value={newPromptTags}
                onChange={e => setNewPromptTags(e.target.value)}
                placeholder="react, frontend, testing"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeSaveModal} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
              <button type="submit" disabled={!newPromptName.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 disabled:opacity-50">
                {editingPrompt ? 'Update' : 'Save Template'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6 animate-in fade-in duration-200">
           <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden max-h-[85vh] animate-in zoom-in-95">
              <div className="p-4 border-b border-zinc-800 flex justify-between items-start bg-zinc-900/50">
                 <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{previewTemplate.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                       {previewTemplate.tags.map(t => (
                          <span key={t} className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full">#{t}</span>
                       ))}
                    </div>
                 </div>
                 <button 
                    onClick={() => setPreviewTemplate(null)} 
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                 >
                    <X size={18} />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-zinc-950 relative">
                 <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300 leading-relaxed">
                    {previewTemplate.template}
                 </pre>
              </div>

              <div className="p-4 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900/50">
                  <button 
                     onClick={() => setPreviewTemplate(null)}
                     className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                     Cancel
                  </button>
                  <button 
                     onClick={(e) => loadTemplate(previewTemplate, e)}
                     className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
                  >
                     <Download size={14} /> Use Template
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
