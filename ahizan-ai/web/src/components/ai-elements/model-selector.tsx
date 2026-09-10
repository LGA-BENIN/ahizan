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
}

export function ModelSelector({ models, selectedModel, onSelectModel }: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-3 py-1.5 text-xs text-slate-300 shadow-sm">
      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
      <select
        value={selectedModel}
        onChange={(e) => onSelectModel(e.target.value)}
        className="bg-transparent text-slate-200 font-medium outline-none cursor-pointer pr-1"
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
