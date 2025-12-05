
import React, { useState, useEffect, useMemo } from 'react';
import { FileNode } from '../types';
import { useStore } from '../store';
import { FileCode, Folder, FolderOpen, FileText, Palette, FileJson, Image, Settings, Eye, EyeOff, Loader2, AlertCircle, Download } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { readFileContent } from '../services/fileSystem';

interface FileTreeProps {
  root: FileNode | null;
  searchTerm: string;
}

interface FileTreeItemProps {
  node: FileNode;
  defaultOpen?: boolean;
}

const getLanguage = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch(ext) {
      case 'ts': case 'tsx': return 'typescript';
      case 'js': case 'jsx': case 'mjs': return 'javascript';
      case 'py': return 'python';
      case 'rb': return 'ruby';
      case 'java': return 'java';
      case 'go': return 'go';
      case 'rs': return 'rust';
      case 'css': case 'scss': return 'css';
      case 'html': return 'html';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'sh': return 'bash';
      case 'yml': case 'yaml': return 'yaml';
      case 'sql': return 'sql';
      case 'xml': return 'xml';
      default: return 'text';
  }
};

const getFileIcon = (name: string, className: string) => {
  const lower = name.toLowerCase();
  if (lower.endsWith('.tsx') || lower.endsWith('.ts') || lower.endsWith('.jsx') || lower.endsWith('.js')) {
    return <FileCode size={14} className={className || "text-blue-400"} />;
  }
  if (lower.endsWith('.css') || lower.endsWith('.scss') || lower.endsWith('.tailwind.css')) {
    return <Palette size={14} className={className || "text-purple-400"} />;
  }
  if (lower.endsWith('.json')) {
    return <FileJson size={14} className={className || "text-orange-400"} />;
  }
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.svg')) {
    return <Image size={14} className={className || "text-pink-400"} />;
  }
  if (lower.endsWith('.config.js') || lower.endsWith('.env')) {
    return <Settings size={14} className={className || "text-zinc-400"} />;
  }
  return <FileText size={14} className={className || "text-zinc-500"} />;
};

const getFileNameColor = (name: string, isSelected: boolean): string => {
  if (isSelected) return 'text-blue-200';
  
  const lower = name.toLowerCase();
  if (lower.endsWith('.tsx') || lower.endsWith('.ts')) return 'text-blue-400';
  if (lower.endsWith('.jsx') || lower.endsWith('.js')) return 'text-yellow-400';
  if (lower.endsWith('.css') || lower.endsWith('.scss')) return 'text-purple-400';
  if (lower.endsWith('.json')) return 'text-orange-400';
  if (lower.endsWith('.md')) return 'text-emerald-400';
  if (lower.endsWith('.html')) return 'text-red-400';
  
  return 'text-zinc-400';
};

const InlineFilePreview: React.FC<{ node: FileNode }> = ({ node }) => {
  const { loadedFiles } = useStore();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      // Check cache first (loadedFiles is a Map)
      if (loadedFiles.has(node.path)) {
        if (active) setContent(loadedFiles.get(node.path)!);
        return;
      }
      
      try {
        if (active) setLoading(true);
        const text = await readFileContent(node);
        if (active) setContent(text);
      } catch (err: any) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [node, loadedFiles]);

  if (loading) return (
    <div className="pl-6 py-2 flex items-center gap-2 text-xs text-zinc-500">
       <Loader2 className="animate-spin text-blue-500" size={12} /> Loading preview...
    </div>
  );

  if (error) return (
    <div className="pl-6 py-2 text-xs text-red-400 flex items-center gap-2">
      <AlertCircle size={12}/> {error}
    </div>
  );

  const isImage = /\.(png|jpg|jpeg|gif|svg|webp|ico|bmp)$/i.test(node.name);

  return (
    <div className="ml-5 my-1 mr-2 rounded-md border border-zinc-800 bg-zinc-950/80 overflow-hidden shadow-inner">
      {isImage ? (
         <div className="p-4 flex justify-center bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
             <span className="text-xs text-zinc-500 italic">Image preview not supported inline</span>
         </div>
      ) : (
        <SyntaxHighlighter
          language={getLanguage(node.name)}
          style={vscDarkPlus}
          customStyle={{ 
            margin: 0, 
            padding: '1rem', 
            fontSize: '11px', 
            lineHeight: '1.5',
            background: 'transparent'
          }}
          showLineNumbers={true}
          lineNumberStyle={{ minWidth: '2em', paddingRight: '1em', color: '#52525b', textAlign: 'right' }}
        >
          {content || "(Empty file)"}
        </SyntaxHighlighter>
      )}
    </div>
  );
};

const FileTreeItem: React.FC<FileTreeItemProps> = ({ node, defaultOpen = false }) => {
  const { selectedPaths, toggleFileSelection, contextMode, expandedPaths, toggleDirectory, addToast } = useStore();
  const isSelected = selectedPaths.has(node.path);

  const isOpen = defaultOpen || expandedPaths.has(node.path);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.kind === 'directory') {
       if (!defaultOpen) toggleDirectory(node.path);
    } else {
      toggleFileSelection(node);
    }
  };

  const handlePreviewToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleDirectory(node.path);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const content = await readFileContent(node);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = node.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast(`Downloaded ${node.name}`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Download failed: ${err.message}`, 'error');
    }
  };

  const icon = node.kind === 'directory' 
    ? (isOpen 
        ? <FolderOpen size={14} className="text-blue-400" /> 
        : <Folder size={14} className="text-blue-500" />)
    : getFileIcon(node.name, isSelected ? 'text-blue-300' : '');

  const textColorClass = node.kind === 'file' 
    ? getFileNameColor(node.name, isSelected)
    : (isSelected ? 'text-blue-200' : 'text-zinc-300');

  return (
    <div className="relative select-none">
      <div
        onClick={handleToggle}
        className={`
          flex items-center gap-2 py-1.5 px-2 cursor-pointer group
          text-sm font-mono transition-all rounded-md mx-2
          ${isSelected 
            ? 'bg-blue-900/20 text-blue-200' 
            : 'hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200'}
        `}
      >
        <span className="opacity-100 shrink-0 flex items-center">{icon}</span>
        
        <div className="flex-1 flex items-center min-w-0 overflow-hidden">
           <span className={`truncate ${textColorClass}`}>{node.name}</span>
           {node.kind === 'directory' && node.children && (
              <span className="ml-2 text-[10px] text-zinc-600 group-hover:text-zinc-500 shrink-0 font-sans">
                 {node.children.length}
              </span>
           )}
        </div>
        
        {/* Context Mode Indicator */}
        {isSelected && node.kind === 'file' && (
          <span className={`
            text-[8px] font-bold px-1.5 py-0.5 rounded ml-2 whitespace-nowrap shadow-sm shrink-0 border
            ${contextMode === 'reference' 
              ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' 
              : 'bg-orange-500/10 text-orange-300 border-orange-500/20'}
          `}>
            {contextMode === 'reference' ? '@REF' : 'EMBED'}
          </span>
        )}

        {/* Download Button */}
        {node.kind === 'file' && (
           <button
             onClick={handleDownload}
             className="hidden group-hover:flex ml-1 p-1 rounded transition-colors shrink-0 hover:bg-zinc-700 text-zinc-500 hover:text-green-400"
             title="Download File"
           >
             <Download size={12} />
           </button>
        )}

        {/* Preview Toggle Button */}
        {node.kind === 'file' && (
          <button
            onClick={handlePreviewToggle}
            className={`
                hidden group-hover:flex ml-2 p-1 rounded transition-colors shrink-0
                ${isOpen ? 'bg-zinc-700 text-blue-400 flex' : 'hover:bg-zinc-700 text-zinc-500 hover:text-blue-400'}
            `}
            title={isOpen ? "Close Preview" : "Quick Preview"}
          >
            {isOpen ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        )}
      </div>

      {/* Directory Children */}
      {isOpen && node.kind === 'directory' && node.children && (
        <div className="pl-3">
          <div className="ml-2 pl-1 border-l border-zinc-800">
             {node.children.map(child => (
                <FileTreeItem 
                  key={child.id} 
                  node={child} 
                  defaultOpen={defaultOpen} 
                />
             ))}
          </div>
        </div>
      )}

      {/* Inline File Preview */}
      {isOpen && node.kind === 'file' && (
          <InlineFilePreview node={node} />
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = React.memo(({ root, searchTerm }) => {
  
  // Filter Logic
  const filteredRoot = useMemo(() => {
    if (!root) return null;
    if (!searchTerm.trim()) return root;

    const lowerTerm = searchTerm.toLowerCase();

    const filterNode = (node: FileNode): FileNode | null => {
      const nameMatches = node.name.toLowerCase().includes(lowerTerm);
      if (node.kind === 'file') {
        return nameMatches ? { ...node } : null;
      }
      if (node.children) {
        const filteredChildren = node.children
          .map(filterNode)
          .filter((n): n is FileNode => n !== null);
        if (nameMatches || filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
      }
      return null;
    };
    return filterNode(root);
  }, [root, searchTerm]);

  if (!root || !filteredRoot) return null;

  return (
    <div className="pb-10 pt-1">
      <FileTreeItem 
        node={filteredRoot} 
        defaultOpen={!!searchTerm} 
      />
    </div>
  );
});
