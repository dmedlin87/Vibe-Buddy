
import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { FileNode } from '../types';
import { readFileContent } from '../services/fileSystem';
import { isSystemIgnored } from '../constants';
import { X, Loader2, Download, Copy, AlertTriangle, FileText, Check, Database, Filter, RotateCcw, Sparkles } from 'lucide-react';

// Roughly 4 chars per token is the industry standard estimate
const TOKENS_PER_CHAR = 0.25;
const TOKEN_WARNING_THRESHOLD = 1000000; // 1 Million tokens

// Helper: Parse .gitignore content into simple rules
const parseGitIgnore = (content: string): string[] => {
  return content.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(pattern => {
       // normalize - remove leading slash
       return pattern.startsWith('/') ? pattern.slice(1) : pattern;
    });
};

// Helper: Check if file matches gitignore rules
const isGitIgnored = (filePath: string, rules: string[]): boolean => {
  // filePath is relative to project root
  return rules.some(rule => {
     // Handle wildcards *.log
     if (rule.startsWith('*')) { 
        return filePath.endsWith(rule.slice(1));
     }
     // Handle directory matches e.g. "dist/" or "node_modules/"
     if (rule.endsWith('/')) { 
        const dirName = rule.slice(0, -1);
        return filePath.includes(`/${dirName}/`) || filePath.startsWith(`${dirName}/`) || filePath === dirName;
     }
     // Exact match or directory prefix
     return filePath === rule || filePath.startsWith(rule + '/');
  });
};

export const ExportModal: React.FC = () => {
  const { isExportOpen, setIsExportOpen, rootNode, userInstruction } = useStore();
  const [status, setStatus] = useState<'idle' | 'scanning' | 'ready'>('idle');
  const [progress, setProgress] = useState(0);
  const [scannedFiles, setScannedFiles] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [contextContent, setContextContent] = useState<string>('');
  const [stats, setStats] = useState({ size: 0, tokens: 0, count: 0 });
  const [copied, setCopied] = useState(false);
  const [useGitIgnore, setUseGitIgnore] = useState(true);
  const [activeStep, setActiveStep] = useState<'scan' | 'share'>('scan');
  const abortRef = useRef<boolean>(false);
  const [hasBundle, setHasBundle] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isExportOpen && rootNode) {
      setActiveStep('scan');
      setStatus('idle');
      setHasBundle(false);
    } else {
      setStatus('idle');
      setProgress(0);
      setContextContent('');
      setHasBundle(false);
      abortRef.current = false;
    }
  }, [isExportOpen, rootNode]);

  const scanProject = async () => {
    if (!rootNode) return;
    abortRef.current = false;
    setStatus('scanning');
    setProgress(0);
    setScannedFiles(0);
    setContextContent('');
    setHasBundle(false);

    // 1. First Pass: Detect .gitignore rules if enabled
    let gitIgnoreRules: string[] = [];
    if (useGitIgnore && rootNode.children) {
      const gitIgnoreFile = rootNode.children.find(c => c.name === '.gitignore');
      if (gitIgnoreFile) {
        try {
          const content = await readFileContent(gitIgnoreFile);
          gitIgnoreRules = parseGitIgnore(content);
        } catch (e) { console.warn("Could not read .gitignore", e); }
      }
    }

    // 2. Build Flattened List of Candidates (filtering out obvious system garbage immediately)
    const candidates: FileNode[] = [];
    const traverse = (node: FileNode) => {
      // Relative path calculation for gitignore check
      // rootNode.path might be "MyProject", node.path might be "MyProject/src/index.ts"
      const relPath = node.path.startsWith(rootNode.path) 
         ? node.path.slice(rootNode.path.length + 1) // +1 for slash
         : node.path;

      // Check System Ignore (Redundant safety check in case tree has garbage)
      if (isSystemIgnored(node.name)) return;

      // Check Git Ignore
      if (useGitIgnore && gitIgnoreRules.length > 0 && relPath) {
         if (isGitIgnored(relPath, gitIgnoreRules)) return;
      }

      if (node.kind === 'file') candidates.push(node);
      if (node.children) node.children.forEach(traverse);
    };
    traverse(rootNode);
    setTotalFiles(candidates.length);

    // 3. Process Content
    let output = `<project name="${rootNode.name}">\n`;
    let processed = 0;
    let totalSize = 0;
    
    // Process in chunks to maintain UI responsiveness
    const CHUNK_SIZE = 5;
    for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
        if (abortRef.current) {
          setStatus('idle');
          setProgress(0);
          setScannedFiles(0);
          return;
        }
        const chunk = candidates.slice(i, i + CHUNK_SIZE);
        const promises = chunk.map(async (file) => {
            try {
                const content = await readFileContent(file);
                
                // Binary Safety Check: If file contains null bytes, likely binary/garbage
                // Also skip empty files to save tokens
                if (!content || content.indexOf('\0') !== -1) return ''; 

                return `  <file path="${file.path}">\n<![CDATA[\n${content}\n]]>\n  </file>\n`;
            } catch (e) {
                return ''; // Skip unreadable files
            }
        });

        const results = await Promise.all(promises);
        results.forEach(res => {
            if (res) {
                output += res;
                totalSize += res.length;
            }
        });

        processed += chunk.length;
        setScannedFiles(Math.min(processed, candidates.length));
        setProgress(Math.round((processed / candidates.length) * 100));
        
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    output += `</project>`;
    
    setContextContent(output);
    setStats({
        size: totalSize,
        tokens: Math.round(totalSize * TOKENS_PER_CHAR),
        count: processed // Actual count of included files (excluding binaries/errors)
    });
    setStatus('ready');
    setActiveStep('share');
    setHasBundle(true);
  };

  const cancelScan = () => {
    abortRef.current = true;
  };

  const handleDownloadContext = () => {
    const blob = new Blob([contextContent], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rootNode?.name}-context.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(userInstruction);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

  if (!isExportOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900">
          <div>
            <p className="text-[11px] uppercase text-zinc-500 tracking-[0.18em] flex items-center gap-2">
              <Database className="text-blue-400" size={16} /> Context Export
            </p>
            <h2 className="text-lg font-bold text-white">Share a clean project snapshot</h2>
            <p className="text-xs text-zinc-500">Generate a lightweight bundle, then copy the prompt to pair with it.</p>
          </div>
          <button onClick={() => setIsExportOpen(false)} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
             <X size={20}/>
          </button>
        </div>

        <div className="px-6 pt-5 pb-2 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide">
            <button
              onClick={() => setActiveStep('scan')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${activeStep === 'scan' ? 'border-blue-500/40 bg-blue-500/10 text-blue-200 shadow-inner shadow-blue-900/20' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-200'}`}
            >
              <span className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-200 flex items-center justify-center text-[11px] font-bold">1</span>
              Clean Bundle
            </button>
            <span className="w-8 h-px bg-zinc-800" />
            <button
              onClick={() => status === 'ready' && setActiveStep('share')}
              disabled={status !== 'ready'}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${activeStep === 'share' ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200 shadow-inner shadow-indigo-900/20' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-200 disabled:opacity-40'}`}
            >
              <span className="h-6 w-6 rounded-full bg-indigo-500/20 text-indigo-200 flex items-center justify-center text-[11px] font-bold">2</span>
              Share Prompt
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-zinc-950/60">
          {activeStep === 'scan' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-zinc-200">Clean bundle for LLMs</h3>
                  <p className="text-xs text-zinc-500">We filter binaries, respect .gitignore, and wrap text files in one XML file.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setUseGitIgnore(!useGitIgnore); }}
                    className={`flex items-center gap-2 text-[11px] font-semibold px-3 py-1.5 rounded-md border transition-colors ${useGitIgnore ? 'bg-zinc-800 text-green-300 border-green-900' : 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}
                    title="Toggle .gitignore parsing"
                  >
                     <Filter size={12} /> .gitignore {useGitIgnore ? 'On' : 'Off'}
                  </button>
                  <button
                    onClick={scanProject}
                    className="flex items-center gap-2 text-[11px] font-semibold px-3 py-1.5 rounded-md border border-blue-500/40 text-blue-200 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                    title="Rescan project"
                  >
                    <RotateCcw size={12} /> Rescan
                  </button>
                </div>
              </div>

              {status === 'scanning' && (
                <div className="space-y-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin text-blue-400" size={14}/> Building bundle...
                    </span>
                    <span className="font-mono">{scannedFiles} / {totalFiles} files</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                       className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
                       style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500">We skip binaries and ignored paths to keep the bundle light.</p>
                </div>
              )}

              {status === 'ready' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="border border-zinc-800 rounded-xl bg-zinc-900/70 p-3">
                      <p className="text-[11px] uppercase text-zinc-500 font-semibold">Files</p>
                      <p className="text-xl font-bold text-white">{stats.count}</p>
                    </div>
                    <div className="border border-zinc-800 rounded-xl bg-zinc-900/70 p-3">
                      <p className="text-[11px] uppercase text-zinc-500 font-semibold">Bundle Size</p>
                      <p className="text-xl font-bold text-white">{formatBytes(stats.size)}</p>
                    </div>
                    <div className="border border-zinc-800 rounded-xl bg-zinc-900/70 p-3">
                      <p className="text-[11px] uppercase text-zinc-500 font-semibold">~Tokens</p>
                      <p className={`text-xl font-bold ${stats.tokens > TOKEN_WARNING_THRESHOLD ? 'text-yellow-300' : 'text-white'}`}>
                        {(stats.tokens / 1000).toFixed(0)}k
                      </p>
                    </div>
                  </div>

                  {stats.tokens > TOKEN_WARNING_THRESHOLD && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-900/20 border border-yellow-800/60 text-yellow-200 text-xs">
                       <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                       <div>
                          <strong className="block mb-1">Large bundle</strong>
                          Consider tightening .gitignore or deselecting heavy folders before exporting.
                       </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-zinc-200">Download context bundle</p>
                      <p className="text-xs text-zinc-500">Upload this XML to your model before pasting the prompt.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleDownloadContext}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
                      >
                        <Download size={16} /> Download
                      </button>
                      <button
                        onClick={() => setActiveStep('share')}
                        className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg border border-indigo-500/40 text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                      >
                        <Sparkles size={16}/> Go to prompt
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeStep === 'share' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-zinc-200">Share-ready prompt</h3>
                  <p className="text-xs text-zinc-500">Copy the instruction you’ll pair with the bundle.</p>
                </div>
                <button 
                   onClick={handleCopyPrompt}
                   className="flex items-center gap-2 text-xs text-indigo-300 hover:text-indigo-200 transition-colors"
                >
                   {copied ? <Check size={14} /> : <Copy size={14} />}
                   {copied ? "Copied" : "Copy to Clipboard"}
                </button>
              </div>

              <div className="relative group">
                <div className="absolute top-2 right-2 p-1 bg-zinc-800/80 rounded text-zinc-500">
                   <FileText size={14} />
                </div>
                <pre className="w-full h-40 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 font-mono overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                   {userInstruction || "(No instruction provided)"}
                </pre>
              </div>

              <div className="text-xs text-zinc-500">
                <strong>Tip:</strong> Upload the <em>Context Bundle</em> first, then paste this prompt so the model can use both together.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
