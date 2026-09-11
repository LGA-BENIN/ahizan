import React from 'react';
import { Sparkles } from 'lucide-react';

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  available?: boolean;
}

interface ModelSelectorProps {
  models: ModelOption[];
  selectedModel: string;
  onSelectModel: (id: string) => void;
  onOpenSettings?: () => void;
}

export function ModelSelector({ models, selectedModel, onSelectModel, onOpenSettings }: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900 border border-slate-800 rounded-full pl-2.5 pr-2 py-1 text-xs text-slate-300 shadow-sm max-w-[210px] sm:max-w-xs transition-all">
      <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
      <select
        value={selectedModel}
        onChange={(e) => onSelectModel(e.target.value)}
        className="bg-transparent text-slate-200 font-medium outline-none cursor-pointer truncate w-full text-[11px] sm:text-xs"
      >
        {models.map((m) => (
          <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
            {m.name} ({m.provider})
          </option>
        ))}
      </select>
    </div>
  );
}
