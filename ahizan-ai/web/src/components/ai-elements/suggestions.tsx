import React from 'react';

interface SuggestionItem {
  icon?: string;
  label: string;
  prompt: string;
}

interface SuggestionsProps {
  suggestions: SuggestionItem[];
  onSelect: (prompt: string) => void;
}

export function Suggestions({ suggestions, onSelect }: SuggestionsProps) {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-2 overflow-x-auto no-scrollbar">
      <div className="flex gap-2 min-w-max pb-1">
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(item.prompt)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 rounded-full text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm"
          >
            {item.icon && <span>{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
