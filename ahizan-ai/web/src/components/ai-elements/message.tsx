import React from 'react';
import { marked } from 'marked';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
}

interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  avatar?: React.ReactNode;
  header?: React.ReactNode;
  children?: React.ReactNode;
}

export function Message({ role, content, isStreaming, avatar, header, children }: MessageProps) {
  const isAssistant = role === 'assistant';
  // P4-4 : pendant le streaming, on n'appelle PAS marked.parse à chaque delta
  // (coûteux, provoque un rendu saccadé "disque rayé"). On affiche le texte brut
  // avec conservation des retours à la ligne, et on ne parse le Markdown qu'une
  // fois le stream terminé (isStreaming = false).
  const htmlContent = isStreaming
    ? escapeHtml(content || '').replace(/\n/g, '<br/>')
    : (marked.parse(content || '', { async: false }) as string);

  return (
    <div className={`flex gap-2 sm:gap-3 md:gap-4 w-full transition-all ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className="shrink-0 mt-0.5">
        {avatar || (
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
            isAssistant 
              ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20' 
              : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}>
            {isAssistant ? 'AI' : 'AD'}
          </div>
        )}
      </div>

      {/* Message Content Bubble */}
      <div className={`flex flex-col min-w-0 max-w-[92%] sm:max-w-[85%] md:max-w-[80%] ${isAssistant ? 'items-start' : 'items-end'}`}>
        {header && <div className="mb-1 text-[11px] text-slate-400">{header}</div>}

        <div
          className={`rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm md:text-[15px] leading-relaxed break-words shadow-sm w-full ${
            isAssistant
              ? 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-sm'
              : 'bg-sky-600 text-white rounded-tr-sm ml-auto max-w-fit'
          }`}
        >
          <div
            className="prose prose-invert prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&>table]:w-full [&>table]:border [&>table]:border-slate-800 [&_th]:border [&_th]:border-slate-800 [&_th]:p-1.5 [&_td]:border [&_td]:border-slate-800 [&_td]:p-1.5 [&_code]:bg-slate-950 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sky-400 text-xs sm:text-sm font-sans overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-sky-400 align-middle animate-pulse" />
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
