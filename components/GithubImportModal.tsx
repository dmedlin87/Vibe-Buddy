import React, { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

export type GithubImportModalProps = {
  show: boolean;
  githubUrl: string;
  setGithubUrl: (url: string) => void;
  githubToken: string;
  setGithubToken: (token: string) => void;
  recentRepos: string[];
  isProcessing: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  context?: 'landing' | 'app';
};

export const GithubImportModal: React.FC<GithubImportModalProps> = ({
  show,
  githubUrl,
  setGithubUrl,
  githubToken,
  setGithubToken,
  recentRepos,
  isProcessing,
  onClose,
  onSubmit,
  context = 'app',
}) => {
  useEffect(() => {
    if (!show) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [show, onClose]);

  if (!show) return null;

  const title = context === 'landing' ? 'Import a GitHub Repository' : 'Import Repository';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 w-96 space-y-4 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white" aria-label="Close import modal">
            <X size={16} />
          </button>
        </div>
        <input
          value={githubUrl}
          onChange={e => setGithubUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none"
          autoFocus
        />
        <input
          value={githubToken}
          onChange={e => setGithubToken(e.target.value)}
          placeholder="GitHub Token (Optional)"
          type="password"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none"
        />

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
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={16} /> : 'Import'}
          </button>
        </div>
      </form>
    </div>
  );
};
