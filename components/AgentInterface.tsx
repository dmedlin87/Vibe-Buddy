
import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Send, Bot, User, Sparkles, StopCircle, Terminal, ChevronDown, ChevronRight, Activity, PanelRightClose, Trash2, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GeminiModel } from '../types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

const CodeBlock = ({inline, className, children, ...props}: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);
  const text = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="relative group my-4 rounded-lg overflow-hidden border border-zinc-700 bg-[#1e1e1e] shadow-md">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/50 border-b border-zinc-700/50">
          <span className="text-xs text-zinc-400 font-mono">{match[1]}</span>
          <button onClick={handleCopy} className="text-zinc-500 hover:text-zinc-200 transition-colors" title="Copy code">
             {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '0.85em', lineHeight: '1.5' }}
          {...props}
        >
          {text}
        </SyntaxHighlighter>
      </div>
    );
  }
  return <code className={`${className} bg-zinc-800/80 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-[0.85em] border border-zinc-700/50`} {...props}>{children}</code>;
};

const ToolCallDisplay: React.FC<{ call: { name: string, args: any } }> = ({ call }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="my-2 rounded-lg border border-indigo-500/20 bg-indigo-500/5 overflow-hidden">
       <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors font-mono">
          <Terminal size={10} />
          <span className="font-bold">EXEC:</span> {call.name}
          <span className="ml-auto opacity-50">{isOpen ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}</span>
       </button>
       {isOpen && (
          <div className="p-2 bg-black/20 text-[10px] font-mono text-zinc-400 whitespace-pre-wrap break-all">
             {JSON.stringify(call.args, null, 2)}
          </div>
       )}
    </div>
  );
};

const MessageBubble: React.FC<{ msg: any }> = ({ msg }) => {
  const isModel = msg.role === 'model';
  const [copied, setCopied] = useState(false);

  const handleCopyMessage = () => {
    if (msg.text) {
      navigator.clipboard.writeText(msg.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`flex gap-3 mb-6 ${isModel ? '' : 'flex-row-reverse'} group`}>
       <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${isModel ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20' : 'bg-zinc-800'}`}>
          {isModel ? <Bot size={16} className="text-white" /> : <User size={16} className="text-zinc-400" />}
       </div>
       
       <div className={`flex-1 min-w-0 flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
          <div className={`relative max-w-[98%] rounded-2xl px-5 py-4 text-sm leading-relaxed overflow-hidden break-words [overflow-wrap:anywhere] ${isModel ? 'bg-zinc-900 border border-zinc-800 text-zinc-200' : 'bg-indigo-600 text-white shadow-md'}`}>
             {msg.toolCalls?.map((call: any, i: number) => <ToolCallDisplay key={i} call={call} />)}
             {msg.text && (
               <div className="markdown-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code: CodeBlock,
                      p: ({children}) => <p className="mb-3 last:mb-0 leading-7">{children}</p>,
                      ul: ({children}) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
                      li: ({children}) => <li className="pl-1">{children}</li>,
                      h1: ({children}) => <h1 className="text-xl font-bold text-white mt-6 mb-3 border-b border-zinc-700 pb-2">{children}</h1>,
                      h2: ({children}) => <h2 className="text-lg font-bold text-white mt-5 mb-2">{children}</h2>,
                      h3: ({children}) => <h3 className="text-base font-bold text-zinc-200 mt-4 mb-2">{children}</h3>,
                      blockquote: ({children}) => <blockquote className="border-l-4 border-indigo-500 pl-4 py-1 my-4 bg-zinc-800/30 italic text-zinc-300 rounded-r">{children}</blockquote>,
                      a: ({children, href}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline">{children}</a>,
                      table: ({children}) => <div className="overflow-x-auto my-4 border border-zinc-700 rounded-lg"><table className="w-full text-left border-collapse text-sm">{children}</table></div>,
                      thead: ({children}) => <thead className="bg-zinc-800/80">{children}</thead>,
                      th: ({children}) => <th className="p-3 border-b border-zinc-600 font-semibold text-zinc-200 whitespace-nowrap">{children}</th>,
                      td: ({children}) => <td className="p-3 border-b border-zinc-700/50 text-zinc-300">{children}</td>,
                      hr: () => <hr className="border-zinc-700 my-6" />,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
               </div>
             )}
             
             {isModel && msg.text && (
                <button 
                  onClick={handleCopyMessage}
                  className="absolute bottom-2 right-2 p-1.5 text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 hover:bg-zinc-700 rounded opacity-0 group-hover:opacity-100 transition-all"
                  title="Copy message"
                >
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                </button>
             )}
          </div>
          {isModel && <span className="text-[10px] text-zinc-600 mt-1 ml-1">{new Date(msg.timestamp).toLocaleTimeString()}</span>}
       </div>
    </div>
  );
};

export const AgentInterface: React.FC = () => {
  const { chatMessages, sendMessage, agentActivity, stopAgent, activeModel, setActiveModel, setIsAgentOpen, clearChat, isAgentOpen } = useStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, agentActivity]);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  useEffect(() => {
    if (isAgentOpen) {
      textareaRef.current?.focus();
    }
  }, [isAgentOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || agentActivity.type !== 'idle') return;
    const t = input;
    setInput('');
    if(textareaRef.current) textareaRef.current.style.height = 'auto'; // Reset height
    await sendMessage(t);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur flex justify-between items-center z-10 shrink-0">
         <div className="flex items-center gap-2">
            <button aria-label="Close agent panel" onClick={() => setIsAgentOpen(false)} className="text-zinc-500 hover:text-zinc-300 mr-1 lg:hidden">
                <PanelRightClose size={18} />
            </button>
            <button aria-label="Close agent panel" onClick={() => setIsAgentOpen(false)} className="text-zinc-500 hover:text-zinc-300 mr-1 hidden lg:block">
                <PanelRightClose size={16} />
            </button>
            <Sparkles size={16} className="text-indigo-400" />
            <span className="text-sm font-bold text-white tracking-wide">Vibe Agent</span>
         </div>
         <div className="flex items-center gap-2">
            <button 
              onClick={clearChat}
              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
              title="Clear Chat History"
              aria-label="Clear chat history"
            >
              <Trash2 size={14} />
            </button>
            <span id="model-hint" className="sr-only">Pro is higher quality, Flash is faster.</span>
            <select 
                value={activeModel} 
                onChange={e => setActiveModel(e.target.value as GeminiModel)}
                className="bg-zinc-800 border-none text-[10px] text-zinc-400 rounded px-2 py-1 outline-none cursor-pointer hover:bg-zinc-700 transition-colors"
                aria-label="Select model"
                aria-describedby="model-hint"
                title="Pro 3.0: higher quality, slightly slower. Flash 2.5: fastest responses."
            >
                <option value={GeminiModel.PRO}>Pro 3.0 (Smart)</option>
                <option value={GeminiModel.FLASH}>Flash 2.5 (Fast)</option>
            </select>
         </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">
         {chatMessages.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 opacity-50 pointer-events-none">
               <Bot size={48} className="mb-4 text-zinc-700" />
               <p className="text-sm">I am ready to architect your prompt.</p>
            </div>
         )}
         
         {chatMessages.map((m, i) => <MessageBubble key={i} msg={m} />)}
         
         {/* Activity Indicator */}
         {agentActivity.type !== 'idle' && (
            <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50 animate-pulse mt-2 max-w-xs">
               <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
               <div className="text-xs text-indigo-300 font-mono">
                  {agentActivity.type === 'thinking' ? 'Thinking...' : agentActivity.description}
               </div>
            </div>
         )}
         <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800 shrink-0">
         <form onSubmit={handleSubmit} className="relative bg-zinc-950 border border-zinc-800 rounded-xl shadow-inner focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
            <textarea
               ref={textareaRef}
               value={input}
               onChange={e => setInput(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder="Describe your task..."
               rows={1}
               className="w-full bg-transparent rounded-xl py-3 pl-4 pr-12 text-sm text-zinc-200 outline-none resize-none custom-scrollbar leading-relaxed"
               style={{ minHeight: '44px', maxHeight: '300px' }}
               disabled={agentActivity.type !== 'idle'}
               aria-label="Message the agent"
            />
            <div className="absolute right-2 bottom-2">
               {agentActivity.type !== 'idle' ? (
                  <button type="button" onClick={stopAgent} className="p-1.5 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors" title="Stop generating" aria-label="Stop generating">
                     <StopCircle size={18} />
                  </button>
               ) : (
                  <button type="submit" disabled={!input.trim()} className="p-1.5 text-indigo-400 hover:bg-indigo-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Send (Enter) / New Line (Shift+Enter)" aria-label="Send message">
                     <Send size={18} />
                  </button>
               )}
            </div>
         </form>
         <div className="text-[10px] text-zinc-600 text-center mt-2">
            Use <span className="font-mono bg-zinc-800 px-1 rounded text-zinc-500">Shift + Enter</span> for new line
         </div>
      </div>
    </div>
  );
};
