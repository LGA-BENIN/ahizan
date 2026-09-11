import React, { useState } from 'react';
import { Wrench, ChevronDown, ChevronRight, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { ToolResultRenderer } from './tool-result-renderer';

interface ToolCallProps {
  toolName: string;
  args?: any;
  result?: any;
  state?: 'call' | 'result' | 'running' | 'error';
  errorText?: string;
}

export function ToolCall({ toolName, args, result, state = 'result', errorText }: ToolCallProps) {
  const [isOpen, setIsOpen] = useState(state === 'error');
  const isDone = state === 'result' || (!!result && state !== 'error');
  const isError = state === 'error';

  return (
    <div className={`w-full mt-2 border rounded-xl overflow-hidden text-xs ${isError ? 'border-rose-500/30 bg-rose-950/20' : 'border-slate-800 bg-slate-950/60'}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-900/50 hover:bg-slate-900 transition-colors text-slate-300 font-medium"
      >
        <div className="flex items-center gap-1.5 sm:gap-2 truncate max-w-[65%] sm:max-w-[70%]">
          <Wrench className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="font-mono text-sky-300 truncate text-[11px] sm:text-xs">{toolName}</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isError ? (
            <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full text-[10px]">
              <XCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Échec</span>
            </span>
          ) : isDone ? (
            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full text-[10px]">
              <CheckCircle2 className="w-3 h-3" />
              <span className="hidden sm:inline">Succès</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded-full text-[10px] animate-pulse">
              <Clock className="w-3 h-3" />
              <span className="hidden sm:inline">En cours</span>
            </span>
          )}
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-2.5 sm:p-3 bg-slate-950 border-t border-slate-800/80 font-mono text-[10px] sm:text-[11px] max-h-48 overflow-y-auto space-y-2 text-slate-400">
          {args && (
            <div>
              <span className="text-slate-500 block mb-0.5">Paramètres d'entrée :</span>
              <pre className="bg-slate-900 p-2 rounded border border-slate-800 text-slate-300 overflow-x-auto">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {isError && errorText && (
            <div>
              <span className="text-rose-400 block mb-0.5">Erreur :</span>
              <pre className="bg-slate-900 p-2 rounded border border-rose-500/30 text-rose-300 overflow-x-auto whitespace-pre-wrap">
                {errorText}
              </pre>
            </div>
          )}
          {!isError && result && (
            <div>
              <span className="text-slate-500 block mb-0.5">Résultat :</span>
              <ToolResultRenderer toolName={toolName} result={result} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
