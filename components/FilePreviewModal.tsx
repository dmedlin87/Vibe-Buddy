
import React from 'react';
import { useStore } from '../store';
import { Eye, X, Loader2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const FilePreviewModal: React.FC = () => {
  const { previewNode, previewContent, closePreview } = useStore();
  if (!previewNode) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col h-full max-h-full overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
             <Eye size={16} className="text-indigo-400" />
             <span className="font-mono text-sm text-zinc-200">{previewNode.path}</span>
          </div>
          <button onClick={closePreview} className="p-1 hover:bg-zinc-800 rounded"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-auto bg-zinc-950 relative">
          {!previewContent ? (
             <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
          ) : (
             <SyntaxHighlighter language="typescript" style={vscDarkPlus} customStyle={{margin: 0, height: '100%'}} showLineNumbers>
                {previewContent}
             </SyntaxHighlighter>
          )}
        </div>
      </div>
    </div>
  );
};
