import React, { useRef, useEffect } from 'react';
import { ArrowUp, Square } from 'lucide-react';

interface PromptInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isGenerating?: boolean;
  onStop?: () => void;
  placeholder?: string;
  footnote?: React.ReactNode;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  isGenerating = false,
  onStop,
  placeholder = "Poser une question à Ahizan AI...",
  footnote
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 pb-3 sm:pb-4 pt-1">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(e);
        }}
        className="flex flex-col gap-1.5 sm:gap-2"
      >
        <div className="relative flex items-end bg-slate-900 border border-slate-800 focus-within:border-sky-500 rounded-2xl p-2 sm:p-2.5 shadow-2xl transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-xs sm:text-sm md:text-base outline-none resize-none px-2 py-1 leading-relaxed max-h-36"
          />

          <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 shrink-0">
            {isGenerating ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all"
                title="Arrêter la génération"
              >
                <Square className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline">Arrêter</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!value.trim()}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500 text-slate-950 flex items-center justify-center transition-all shadow-md shadow-sky-500/20"
                title="Envoyer"
              >
                <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {footnote && (
          <div className="text-center text-[10px] sm:text-xs text-slate-500 truncate px-2">
            {footnote}
          </div>
        )}
      </form>
    </div>
  );
}
