
import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { FileNode } from '../types';
import { readFileContent } from '../services/fileSystem';
import { isSystemIgnored } from '../constants';
import { X, Loader2, Download, Copy, AlertTriangle, FileText, Check, Database, Filter } from 'lucide-react';

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

  // Reset state when modal opens
  useEffect(() => {
    if (isExportOpen && rootNode) {
      scanProject();
    } else {
      setStatus('idle');
      setProgress(0);
      setContextContent('');
    }
  }, [isExportOpen, rootNode, useGitIgnore]); // Re-scan if gitignore toggle changes

  const scanProject = async () => {
    if (!rootNode) return;
    setStatus('scanning');
    setProgress(0);
    setScannedFiles(0);
    setContextContent('');

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

  if (!isExportOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
             <Database className="text-blue-400" size={20} /> Export Project Context
          </h2>
          <button onClick={() => setIsExportOpen(false)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
             <X size={20}/>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8 bg-zinc-950/50">
            
            {/* 1. Context Generator Section */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-300">1. Project Context Bundle</h3>
                  <div className="flex items-center gap-4">
                      {/* GitIgnore Toggle */}
                      <button 
                        onClick={() => setUseGitIgnore(!useGitIgnore)}
                        className={`flex items-center gap-2 text-xs font-medium px-2 py-1 rounded border transition-colors ${useGitIgnore ? 'bg-zinc-800 text-green-400 border-green-900' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}
                        title="Toggle .gitignore parsing"
                      >
                         <Filter size={12} /> .gitignore {useGitIgnore ? 'ON' : 'OFF'}
                      </button>

                      {status === 'ready' && (
                        <div className="flex gap-4 text-xs font-mono">
                            <span className="text-zinc-500">{stats.count} files</span>
                            <span className="text-zinc-500">{(stats.size / 1024 / 1024).toFixed(2)} MB</span>
                            <span className={stats.tokens > TOKEN_WARNING_THRESHOLD ? "text-yellow-500 font-bold" : "text-zinc-500"}>
                              ~{(stats.tokens / 1000).toFixed(0)}k Tokens
                            </span>
                        </div>
                      )}
                  </div>
               </div>

               {status === 'scanning' ? (
                  <div className="space-y-2">
                     <div className="flex justify-between text-xs text-zinc-500">
                        <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={12}/> Scanning & Filtering...</span>
                        <span>{scannedFiles} / {totalFiles} candidates</span>
                     </div>
                     <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                           className="h-full bg-blue-500 transition-all duration-300 ease-out"
                           style={{ width: `${progress}%` }}
                        />
                     </div>
                  </div>
               ) : (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                     {stats.tokens > TOKEN_WARNING_THRESHOLD && (
                        <div className="flex items-start gap-3 p-3 mb-4 rounded bg-yellow-900/20 border border-yellow-700/50 text-yellow-200 text-xs">
                           <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                           <div>
                              <strong className="block mb-1">Large Context Warning</strong>
                              This project exceeds 1 Million tokens. Consider adding more rules to .gitignore or manually deselecting folders.
                           </div>
                        </div>
                     )}
                     
                     <div className="flex items-center justify-between">
                         <div className="text-sm text-zinc-400">
                            Download cleaned project files (binaries & ignored files excluded).
                         </div>
                         <button 
                           onClick={handleDownloadContext}
                           className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
                         >
                            <Download size={16} /> Download Context
                         </button>
                     </div>
                  </div>
               )}
            </div>

            <div className="border-t border-zinc-800" />

            {/* 2. Prompt Section */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-300">2. Your Prompt</h3>
                  <button 
                     onClick={handleCopyPrompt}
                     className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                     {copied ? <Check size={14} /> : <Copy size={14} />}
                     {copied ? "Copied" : "Copy to Clipboard"}
                  </button>
               </div>

               <div className="relative group">
                  <div className="absolute top-2 right-2 p-1 bg-zinc-800/80 rounded text-zinc-500">
                     <FileText size={14} />
                  </div>
                  <pre className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 font-mono overflow-y-auto custom-scrollbar resize-none whitespace-pre-wrap">
                     {userInstruction || "(No instruction provided)"}
                  </pre>
               </div>
               
               <p className="text-xs text-zinc-500">
                  <strong>Tip:</strong> Upload the <em>Context Bundle</em> file to Gemini/Claude first, then paste this prompt.
               </p>
            </div>

        </div>
      </div>
    </div>
  );
};
