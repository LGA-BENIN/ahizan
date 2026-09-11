import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from 'ai';
import { ArrowUp, Square, X, Search, FileEdit, Store, Sparkles, AlertTriangle, ShieldAlert, Check, Ban, Copy, RefreshCw, Loader2 } from 'lucide-react';
import { Conversation, Message, ToolCall } from './ai-elements';
import { authHeaders, type AuthSession } from '../lib/auth';

const CHATGPT_SUGGESTIONS = [
  {
    id: 'sug_1',
    icon: <Search className="w-4 h-4 text-sky-400" />,
    title: 'Auditer le catalogue & doublons',
    prompt: "Audite les fiches produits récemment créées, détecte les doublons potentiels et vérifie les scores FQS.",
  },
  {
    id: 'sug_2',
    icon: <FileEdit className="w-4 h-4 text-emerald-400" />,
    title: 'Rédiger ou corriger une fiche produit',
    prompt: "Propose une fiche produit officielle normalisée et optimisée SEO pour notre catalogue.",
  },
  {
    id: 'sug_3',
    icon: <Store className="w-4 h-4 text-amber-400" />,
    title: 'Performance & Ventes des marchands',
    prompt: "Donne-moi un aperçu des statistiques de vente récentes, du chiffre d'affaires et de l'état des vendeurs.",
  },
  {
    id: 'sug_4',
    icon: <Sparkles className="w-4 h-4 text-purple-400" />,
    title: "Fiches en attente d'approbation",
    prompt: "Quels sont les produits actuellement en attente d'approbation par les administrateurs ?",
  },
];

interface ChatPanelProps {
  sessionId: string;
  initialMessages: UIMessage[];
  authSession: AuthSession;
  selectedModel: string;
  temperature: number;
  onMessagesChange: (messages: UIMessage[]) => void;
  onTitleFromFirstMessage: (text: string) => void;
  onUnauthorized: () => void;
}

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('');
}

/**
 * Carte de confirmation humaine (P3-1) : affichée quand le modèle demande à exécuter
 * une action d'écriture (ex: approuver/rejeter une fiche produit). Rien n'est exécuté
 * côté Vendure avant qu'un administrateur ait cliqué explicitement sur un des boutons.
 */
function ApprovalCard({ toolName, input, onRespond }: { toolName: string; input: any; onRespond: (approved: boolean) => void }) {
  return (
    <div className="w-full mt-2 border border-amber-500/40 bg-amber-950/20 rounded-xl overflow-hidden text-xs">
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 text-amber-300 font-semibold">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>Confirmation requise avant action : {toolName}</span>
      </div>
      <div className="p-3 space-y-2">
        <pre className="bg-slate-950 border border-slate-800 rounded p-2 text-slate-300 text-[11px] overflow-x-auto">
          {JSON.stringify(input, null, 2)}
        </pre>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onRespond(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Confirmer</span>
          </button>
          <button
            type="button"
            onClick={() => onRespond(false)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-all"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Refuser</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Actions sous un message assistant : copier, régénérer (P4-5). */
function MessageActions({ text, onRegenerate, canRegenerate }: { text: string; onRegenerate?: () => void; canRegenerate?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard indisponible */ }
  };
  return (
    <div className="flex items-center gap-1 mt-1.5 -ml-1">
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1 px-1.5 py-1 text-[10px] text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 rounded-lg transition-colors"
        title="Copier le texte"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        <span>{copied ? 'Copié' : 'Copier'}</span>
      </button>
      {canRegenerate && onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          className="flex items-center gap-1 px-1.5 py-1 text-[10px] text-slate-500 hover:text-sky-400 hover:bg-slate-800/60 rounded-lg transition-colors"
          title="Régénérer la réponse"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Régénérer</span>
        </button>
      )}
    </div>
  );
}

/** Section raisonnement repliable (P4-4) : affichée pour les modèles à "thinking". */
function ReasoningBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(true);
  if (!text || !text.trim()) return null;
  return (
    <div className="w-full mt-2 border border-indigo-500/30 bg-indigo-950/20 rounded-xl overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-indigo-500/10 text-indigo-300 font-semibold"
      >
        <span>💭 Réflexion</span>
        <span className="ml-auto">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="p-3 text-indigo-200/80 whitespace-pre-wrap max-h-44 overflow-y-auto text-[11px] leading-relaxed">
          {text}
        </div>
      )}
    </div>
  );
}

/** Rend un message + ses éventuels appels d'outils à partir des `parts` UIMessage (P2-1). */
function renderToolParts(message: UIMessage, onApprovalResponse: (id: string, approved: boolean) => void) {
  // Concatène les parties de raisonnement (le modèle peut produire plusieurs
  // blocs de "thinking" au fil des étapes d'outils).
  const reasoningText = message.parts
    .filter((p: any) => p.type === 'reasoning')
    .map((p: any) => p.text || p.reasoning || '')
    .join('\n');

  return (
    <>
      {reasoningText && <ReasoningBlock text={reasoningText} />}
      {message.parts
        .filter(p => p.type === 'dynamic-tool' || p.type.startsWith('tool-'))
        .map((part: any, idx: number) => {
          const toolName = part.type === 'dynamic-tool' ? part.toolName : part.type.replace(/^tool-/, '');

          if (part.state === 'approval-requested') {
            return (
              <ApprovalCard
                key={part.toolCallId || idx}
                toolName={toolName}
                input={part.input}
                onRespond={approved => onApprovalResponse(part.approval.id, approved)}
              />
            );
          }

          const state =
            part.state === 'output-error' ? 'error' :
            part.state === 'output-available' ? 'result' :
            'running';
          return (
            <ToolCall
              key={part.toolCallId || idx}
              toolName={toolName}
              args={part.input}
              result={part.output}
              state={state}
              errorText={part.errorText}
            />
          );
        })}
    </>
  );
}

export function ChatPanel({
  sessionId,
  initialMessages,
  authSession,
  selectedModel,
  temperature,
  onMessagesChange,
  onTitleFromFirstMessage,
  onUnauthorized,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [suggestionsList, setSuggestionsList] = useState(CHATGPT_SUGGESTIONS);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // P2-1 : useChat gère nativement le streaming, les tool-calls structurés, les erreurs
  // et le "stop" propre, en remplacement du parseur SSE manuel précédent.
  const { messages, sendMessage, status, stop, error, clearError, addToolApprovalResponse, regenerate } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat/stream',
      headers: () => authHeaders(authSession),
      body: () => ({ model: selectedModel, temperature }),
    }),
    // P3-1 : dès que l'administrateur a répondu (confirmé/refusé) à toutes les demandes
    // d'approbation en attente, on relance automatiquement la conversation pour que le
    // modèle poursuive avec le résultat de l'action (ou son refus).
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onError: (err: any) => {
      if (String(err?.message || '').includes('401')) onUnauthorized();
    },
  });

  const isGenerating = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    onMessagesChange(messages);
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleSend = (customPrompt?: string) => {
    const text = (customPrompt ?? input).trim();
    if (!text || isGenerating) return;
    if (messages.length === 0) onTitleFromFirstMessage(text);
    clearError?.();
    sendMessage({ text });
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  return (
    <>
      <Conversation>
        {messages.map((msg, idx) => {
          const isLastAssistant = msg.role === 'assistant' && idx === messages.length - 1;
          const msgText = extractText(msg);
          return (
          <Message
            key={msg.id}
            role={msg.role as 'user' | 'assistant'}
            content={msgText}
            isStreaming={isGenerating && isLastAssistant}
            header={
              <span className="font-semibold text-slate-400 text-xs">
                {msg.role === 'assistant' ? 'Ahizan AI' : 'Super Admin'}
              </span>
            }
          >
            {renderToolParts(msg, (id, approved) => addToolApprovalResponse({ id, approved }))}
            {msg.role === 'assistant' && msgText && (
              <MessageActions
                text={msgText}
                canRegenerate={isLastAssistant && !isGenerating}
                onRegenerate={() => regenerate()}
              />
            )}
          </Message>
          );
        })}

        {/* P4-1 : indicateur de chargement avant l'arrivée du premier token */}
        {status === 'submitted' && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <div className="flex gap-2 sm:gap-3 w-full">
            <div className="shrink-0 mt-0.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-sky-500/20">
                AI
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
              <span className="text-xs text-slate-400">Connexion à la marketplace Ahizan…</span>
            </div>
          </div>
        )}

        {/* P4-1 : erreur explicite plutôt qu'une bulle vide ou un blocage silencieux */}
        {error && (
          <div className="flex items-start gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3 max-w-2xl">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-0.5">Ahizan AI a rencontré une erreur</div>
              <div className="text-rose-300/90">{error.message || 'Erreur inconnue. Réessayez ou vérifiez la connexion à la marketplace.'}</div>
            </div>
          </div>
        )}
      </Conversation>

      {messages.length === 0 && !isGenerating && (
        <div className="w-full max-w-2xl mx-auto px-4 pb-2">
          <div className="space-y-1.5">
            {suggestionsList.map(sug => (
              <div
                key={sug.id}
                onClick={() => handleSend(sug.prompt)}
                className="flex items-center justify-between p-3 bg-[#0d1424] hover:bg-[#121c32] border border-slate-800/70 hover:border-slate-700 rounded-2xl cursor-pointer transition-all shadow-sm group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">{sug.icon}</div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">{sug.title}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setSuggestionsList(suggestionsList.filter(s => s.id !== sug.id));
                  }}
                  className="text-slate-500 hover:text-slate-300 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 pb-3 sm:pb-4 pt-1 z-10">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="flex flex-col gap-1.5"
        >
          <div className="relative flex items-end bg-[#131b2e] border border-slate-800 focus-within:border-slate-700 rounded-3xl p-1.5 sm:p-2 shadow-2xl transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Demandez n'importe quoi à Ahizan AI..."
              className="flex-1 bg-transparent text-slate-100 placeholder-slate-400 text-xs sm:text-sm outline-none resize-none px-3 py-2 leading-relaxed max-h-36"
            />
            <div className="flex items-center gap-1.5 shrink-0 mb-0.5 mr-0.5">
              {isGenerating ? (
                <button
                  type="button"
                  onClick={stop}
                  className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all shadow-md shadow-rose-500/30"
                  title="Arrêter"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-8 h-8 rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-30 disabled:hover:bg-sky-500 text-slate-950 flex items-center justify-center transition-all shadow-md shadow-sky-500/25"
                  title="Envoyer"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
          <div className="text-center text-[10px] text-slate-400 truncate px-2">
            Ahizan AI • Modèle actif : <strong>{selectedModel}</strong>
          </div>
        </form>
      </div>
    </>
  );
}
