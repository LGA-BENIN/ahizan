import React, { useState, useEffect, useRef } from 'react';
import {
  Conversation,
  Message,
  PromptInput,
  Suggestions,
  ToolCall,
  ModelSelector,
  type ModelOption
} from './components/ai-elements';
import { Bot, Sliders, Plus, Trash2, CheckCircle2, Menu, X } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: Array<{
    toolName: string;
    args?: any;
    result?: any;
    state?: 'call' | 'result' | 'running';
  }>;
}

interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
}

const DEFAULT_SUGGESTIONS = [
  { icon: '📦', label: 'Fiches en attente', prompt: "Quelles sont les fiches produits actuellement en attente d'approbation ?" },
  { icon: '📊', label: 'Ventes & CA', prompt: "Donne-moi les statistiques de vente et le chiffre d'affaires récent sur la plateforme." },
  { icon: '🔍', label: 'Audit Doublons & FQS', prompt: "Y a-t-il des risques de doublons dans le catalogue ou des fiches avec un faible score FQS ?" },
  { icon: '🏪', label: 'Performance Vendeurs', prompt: "Liste-moi les vendeurs actifs sur Ahizan et leur état de stock." },
];

export function App() {
  const [models, setModels] = useState<ModelOption[]>([
    { id: 'gemini-2.5-flash', name: 'Google Gemini 2.5 Flash', provider: 'google', available: true },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'openrouter', available: false },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'openrouter', available: false }
  ]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [temperature, setTemperature] = useState<number>(0.2);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const [sessions, setSessions] = useState<Session[]>(() => {
    try {
      const raw = localStorage.getItem('ahizan_ai_react_sessions');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      {
        id: 's_default',
        title: 'Cockpit Administrateur',
        messages: [
          {
            id: 'm_welcome',
            role: 'assistant',
            content: "Bonjour ! Je suis **Ahizan AI**, votre copilote officiel d'intelligence opérationnelle basé sur **Vercel AI Elements** et **AI SDK**.\n\nJe suis relié en temps réel aux données de la marketplace Ahizan pour inspecter le catalogue, auditer les ventes et valider les offres marchandes."
          }
        ]
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0]?.id || 's_default');
  const [input, setInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [streamingChunk, setStreamingChunk] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    localStorage.setItem('ahizan_ai_react_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Charger les modèles réels depuis le backend
  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then(data => {
        if (data.models && data.models.length > 0) setModels(data.models);
      })
      .catch(() => {});
  }, []);

  const handleCreateNewSession = () => {
    const newSession: Session = {
      id: `session_${Date.now()}`,
      title: 'Nouvelle session',
      messages: [
        {
          id: `m_${Date.now()}`,
          role: 'assistant',
          content: "Bonjour ! Je suis **Ahizan AI**. Que souhaitez-vous inspecter sur la plateforme Ahizan ?"
        }
      ]
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    setIsSidebarOpen(false);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter(s => s.id !== id);
    if (filtered.length === 0) {
      handleCreateNewSession();
    } else {
      setSessions(filtered);
      if (activeSessionId === id) setActiveSessionId(filtered[0].id);
    }
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setIsSidebarOpen(false);
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: textToSend.trim()
    };

    const updatedMessages = [...activeSession.messages, userMessage];
    const sessionTitle = activeSession.messages.length <= 1 
      ? textToSend.slice(0, 24) + (textToSend.length > 24 ? '...' : '') 
      : activeSession.title;

    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      title: sessionTitle,
      messages: updatedMessages
    } : s));

    setInput('');
    setIsGenerating(true);
    setStreamingChunk('');

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
          temperature
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let toolInvocations: ChatMessage['toolInvocations'] = [];

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            if (line.startsWith('0:')) {
              try {
                const token = JSON.parse(line.slice(2));
                accumulated += token;
                setStreamingChunk(accumulated);
              } catch (e) {}
            } else if (line.startsWith('9:') || line.startsWith('a:') || line.startsWith('b:')) {
              try {
                const toolData = JSON.parse(line.slice(2));
                toolInvocations.push({
                  toolName: toolData.toolName || 'Outil GraphQL',
                  args: toolData.args,
                  result: toolData.result || toolData,
                  state: 'result'
                });
              } catch (e) {}
            }
          }
        }
      }

      const assistantMessage: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: accumulated,
        toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined
      };

      setSessions(prev => prev.map(s => s.id === activeSessionId ? {
        ...s,
        messages: [...updatedMessages, assistantMessage]
      } : s));

      setStreamingChunk('');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setSessions(prev => prev.map(s => s.id === activeSessionId ? {
          ...s,
          messages: [...updatedMessages, {
            id: `a_abort_${Date.now()}`,
            role: 'assistant',
            content: (streamingChunk || '*(Génération arrêtée)*') + '\n\n*[Arrêté par l\'administrateur]*'
          }]
        } : s));
      } else {
        setSessions(prev => prev.map(s => s.id === activeSessionId ? {
          ...s,
          messages: [...updatedMessages, {
            id: `a_err_${Date.now()}`,
            role: 'assistant',
            content: `❌ Erreur : ${err.message}`
          }]
        } : s));
      }
      setStreamingChunk('');
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#090d16] text-slate-100 font-sans overflow-hidden relative">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar (AI Elements Shell) — Drawer on mobile, fixed on desktop */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-[#0b1120] border-r border-slate-800/80 flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  Ahizan AI
                  <span className="text-[10px] px-1.5 py-0.2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded font-mono font-medium">V2</span>
                </div>
                <div className="text-[11px] text-slate-400">Vercel AI Elements UI</div>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 text-slate-400 hover:text-white md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-3">
            <button
              type="button"
              onClick={handleCreateNewSession}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/25 text-sky-400 rounded-xl text-xs font-semibold transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau chat</span>
            </button>
          </div>

          {/* Sessions List */}
          <div className="px-3 py-2">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">
              Historique des sessions
            </div>
            <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
              {sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-all ${
                    s.id === activeSessionId
                      ? 'bg-slate-800 text-sky-400 font-medium border border-sky-500/30'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate max-w-[180px]">{s.title}</span>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity p-0.5"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0" />
            <span className="truncate">Passerelle : Connectée</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsSettingsOpen(true);
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs text-slate-300 font-medium transition-all"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Paramètres du modèle</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-full bg-[#0f172a] relative overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="h-14 px-3 sm:px-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40 backdrop-blur shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Hamburger button for mobile */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg md:hidden"
              title="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-semibold text-slate-100 truncate">{activeSession.title}</h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate hidden xs:block">GraphQL Vendure & AI Elements</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ModelSelector
              models={models}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
            />
          </div>
        </header>

        {/* AI Elements: <Conversation> */}
        <Conversation>
          {activeSession.messages.map(msg => (
            <Message
              key={msg.id}
              role={msg.role}
              content={msg.content}
              header={
                <span className="font-semibold text-slate-400">
                  {msg.role === 'assistant' ? 'Ahizan AI' : 'Super Admin'}
                </span>
              }
            >
              {msg.toolInvocations?.map((tool, idx) => (
                <ToolCall
                  key={idx}
                  toolName={tool.toolName}
                  args={tool.args}
                  result={tool.result}
                  state={tool.state}
                />
              ))}
            </Message>
          ))}

          {/* Streaming Message Indicator */}
          {isGenerating && streamingChunk && (
            <Message
              role="assistant"
              content={streamingChunk}
              isStreaming={true}
              header={<span className="font-semibold text-sky-400">Ahizan AI (Streaming...)</span>}
            />
          )}
        </Conversation>

        {/* AI Elements: <Suggestions> */}
        <Suggestions
          suggestions={DEFAULT_SUGGESTIONS}
          onSelect={(p) => handleSend(p)}
        />

        {/* AI Elements: <PromptInput> */}
        <PromptInput
          value={input}
          onChange={setInput}
          onSubmit={() => handleSend()}
          isGenerating={isGenerating}
          onStop={handleStop}
          placeholder="Interroger Ahizan AI..."
          footnote={
            <span>
              Ahizan AI V2 • Modèle : <strong>{selectedModel}</strong> • Connecté à <code>admin-api</code>
            </span>
          }
        />
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0b1120] border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h2 className="text-sm font-bold text-white">Configuration Ahizan AI</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Modèle actif</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none"
                >
                  {models.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-400 font-medium">Température (Précision)</label>
                  <span className="font-mono text-sky-400">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-sky-950/20 border border-sky-500/20 rounded-xl space-y-1">
                <span className="text-sky-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Guardrails Inviolables
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  L'identité est strictement verrouillée sur <strong>Ahizan AI</strong>. Quel que soit le modèle sous-jacent, tout sujet politique ou hors e-commerce est systématiquement décliné.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
