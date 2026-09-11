import React, { useState, useEffect, useCallback } from 'react';
import type { UIMessage } from 'ai';
import { type ModelOption } from './components/ai-elements';
import { SettingsModal } from './components/SettingsModal';
import { LoginScreen } from './components/LoginScreen';
import { ChatPanel } from './components/ChatPanel';
import { loadSession, clearSession, authHeaders, type AuthSession } from './lib/auth';
import {
  Bot,
  Sliders,
  Plus,
  Trash2,
  Menu,
  X,
  ChevronDown,
  SquarePen,
  MessageSquare,
  LogOut,
} from 'lucide-react';

interface Session {
  id: string;
  title: string;
  messages: UIMessage[];
}

function defaultSession(): Session {
  const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    title: 'Nouvelle discussion',
    messages: [
      {
        id: `m_welcome_${Date.now()}`,
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: "Bonjour ! Je suis **Ahizan AI**, votre copilote officiel d'intelligence opérationnelle marketplace.\n\nJe suis relié en temps réel à votre base de données et aux API Vendure pour auditer les fiches, modérer les produits et suivre les performances marchandes.",
          },
        ],
      } as UIMessage,
    ],
  };
}

export function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => loadSession());

  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [temperature, setTemperature] = useState<number>(0.2);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [showModelPickerDropdown, setShowModelPickerDropdown] = useState<boolean>(false);
  // P4-2 : indicateur de santé réel, branché sur /api/health
  const [gatewayHealthy, setGatewayHealthy] = useState<boolean | null>(null);

  const sessionsStorageKey = authSession ? `ahizan_ai_sessions_${authSession.identifier}` : null;

  const [sessions, setSessions] = useState<Session[]>(() => {
    if (!authSession) return [defaultSession()];
    try {
      const raw = localStorage.getItem(`ahizan_ai_sessions_${authSession.identifier}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [defaultSession()];
  });
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0]?.id);

  // Fonction pour charger les messages d'une conversation depuis le serveur
  const loadSessionMessages = useCallback((id: string) => {
    if (!authSession) return;
    const headers = authHeaders(authSession);
    fetch(`/api/conversations/${id}`, { headers })
      .then(r => {
        if (r.status === 401) { handleUnauthorized(); return null; }
        return r.ok ? r.json() : null;
      })
      .then(data => {
        if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          const loadedMsgs: UIMessage[] = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            parts: m.parts || [{ type: 'text', text: m.content || '' }],
          }));
          setSessions(prev =>
            prev.map(s => (s.id === id ? { ...s, messages: loadedMsgs } : s))
          );
        }
      })
      .catch(() => {});
  }, [authSession]);

  // P2-3 : sauvegarde locale (cache)
  useEffect(() => {
    if (sessionsStorageKey) {
      localStorage.setItem(sessionsStorageKey, JSON.stringify(sessions));
    }
  }, [sessions, sessionsStorageKey]);

  // P2-3 : au login, charge les conversations ET le modèle depuis le serveur
  useEffect(() => {
    if (!authSession) return;
    const headers = authHeaders(authSession);
    // Charge les conversations server-side (uniquement celles qui contiennent des messages)
    fetch('/api/conversations', { headers })
      .then(r => {
        if (r.status === 401) { handleUnauthorized(); return null; }
        return r.ok ? r.json() : null;
      })
      .then(async data => {
        if (data?.conversations?.length > 0) {
          const firstId = data.conversations[0].id;
          let firstMsgs: UIMessage[] = [];
          try {
            const res = await fetch(`/api/conversations/${firstId}`, { headers });
            if (res.ok) {
              const d = await res.json();
              if (d?.messages && Array.isArray(d.messages)) {
                firstMsgs = d.messages.map((m: any) => ({
                  id: m.id,
                  role: m.role,
                  parts: m.parts || [{ type: 'text', text: m.content || '' }],
                }));
              }
            }
          } catch {}

          const serverSessions: Session[] = data.conversations.map((c: any, idx: number) => ({
            id: c.id,
            title: c.title,
            messages: idx === 0 ? firstMsgs : [],
          }));
          setSessions(serverSessions);
          setActiveSessionId(firstId);
        } else {
          const fresh = defaultSession();
          setSessions([fresh]);
          setActiveSessionId(fresh.id);
        }
      })
      .catch(() => {});

    // Charge le modèle sélectionné server-side
    fetch('/api/user/model', { headers })
      .then(r => {
        if (r.status === 401) { handleUnauthorized(); return null; }
        return r.ok ? r.json() : null;
      })
      .then(data => {
        if (data?.model) setSelectedModel(data.model);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSession?.identifier]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || defaultSession();

  const handleUnauthorized = () => {
    clearSession();
    setAuthSession(null);
  };

  // Fermer le dropdown en cliquant à l'extérieur
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelPickerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadModels = () => {
    fetch('/api/models')
      .then(r => r.json())
      .then(data => {
        if (data.models && data.models.length > 0) setModels(data.models);
      })
      .catch(() => {});
  };

  const checkHealth = () => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => setGatewayHealthy(data.status === 'ok'))
      .catch(() => setGatewayHealthy(false));
  };

  useEffect(() => {
    if (!authSession) return;
    loadModels();
    checkHealth();
    const interval = setInterval(checkHealth, 30_000);
    return () => clearInterval(interval);
  }, [authSession]);

  const handleLogout = () => {
    clearSession();
    setAuthSession(null);
  };

  if (!authSession) {
    return <LoginScreen onSuccess={setAuthSession} />;
  }

  const handleCreateNewSession = () => {
    // Si la session active est déjà une discussion neuve sans message utilisateur, on reste dessus
    const activeHasUserMsg = activeSession.messages && activeSession.messages.some(m => m.role === 'user');
    if (!activeHasUserMsg) {
      setIsSidebarOpen(false);
      return;
    }
    const newSession = defaultSession();
    // Conserver la session active et les autres sessions existantes, en ajoutant la nouvelle en tête
    setSessions(prev => [newSession, ...prev.filter(s => s.id !== newSession.id)]);
    setActiveSessionId(newSession.id);
    setIsSidebarOpen(false);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter(s => s.id !== id);
    if (filtered.length === 0) {
      const fresh = defaultSession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
    } else {
      setSessions(filtered);
      if (activeSessionId === id) {
        const nextActive = filtered[0];
        setActiveSessionId(nextActive.id);
        handleSelectSession(nextActive.id);
      }
    }
    // Supprime côté serveur
    if (authSession) {
      fetch('/api/conversations/' + id, {
        method: 'DELETE',
        headers: authHeaders(authSession),
      }).catch(() => {});
    }
  };

  const handleSelectSession = (id: string) => {
    setIsSidebarOpen(false);
    const target = sessions.find(s => s.id === id);
    if (!target || !target.messages || target.messages.length === 0) {
      if (authSession) {
        fetch(`/api/conversations/${id}`, { headers: authHeaders(authSession) })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
              const loadedMsgs: UIMessage[] = data.messages.map((m: any) => ({
                id: m.id,
                role: m.role,
                parts: m.parts || [{ type: 'text', text: m.content || '' }],
              }));
              setSessions(prev =>
                prev.map(s => (s.id === id ? { ...s, messages: loadedMsgs } : s))
              );
            }
            setActiveSessionId(id);
          })
          .catch(() => {
            setActiveSessionId(id);
          });
        return;
      }
    }
    setActiveSessionId(id);
  };

  const selectedModelObj = models.find(m => m.id === selectedModel);

  return (
    <div className="flex h-[100dvh] w-screen bg-[#070a11] text-slate-100 font-sans overflow-hidden relative">
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 sm:w-80 bg-[#090e1a] border-r border-slate-800/80 flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-[calc(100dvh-90px)]">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  Ahizan AI
                  <span className="text-[10px] px-1.5 py-0.2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded font-mono font-medium">V2</span>
                </div>
                <div className="text-[11px] text-slate-400">Cockpit Opérationnel</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg md:hidden transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-3 shrink-0">
            <button
              type="button"
              onClick={handleCreateNewSession}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-100 rounded-xl text-xs font-semibold transition-all shadow-sm group"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-400" />
                <span>Nouveau chat</span>
              </div>
              <SquarePen className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
            </button>
          </div>

          <div className="px-3 py-2 flex-1 overflow-y-auto">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" />
              <span>Discussions Récentes</span>
            </div>
            <div className="space-y-1">
              {sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    s.id === activeSessionId
                      ? 'bg-slate-800/90 text-white font-medium border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate max-w-[200px]">{s.title}</span>
                  <button
                    type="button"
                    onClick={e => handleDeleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity p-1"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-slate-800/80 space-y-2 shrink-0 bg-slate-950/40">
          <button
            type="button"
            onClick={() => {
              setIsSettingsOpen(true);
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-200 font-semibold transition-all shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Paramètres & Modèles IA</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Clés & IA</span>
          </button>

          <div className="flex items-center justify-between px-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  gatewayHealthy === null
                    ? 'bg-slate-500'
                    : gatewayHealthy
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                }`}
              />
              <span>
                {gatewayHealthy === null ? 'Vérification...' : gatewayHealthy ? 'Passerelle connectée' : 'Passerelle indisponible'}
              </span>
            </span>
            <span title={authSession.identifier}>{authSession.isSuperAdmin ? 'Super Admin' : 'Staff'}</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] text-slate-500 hover:text-rose-400 hover:bg-slate-900/60 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Se déconnecter ({authSession.identifier})</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full bg-[#070a11] relative overflow-hidden min-w-0">
        <header className="h-14 px-3 sm:px-6 border-b border-slate-900 flex items-center justify-between bg-[#070a11]/90 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors md:hidden"
              title="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowModelPickerDropdown(!showModelPickerDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800/60 text-slate-200 font-bold text-xs sm:text-sm transition-all"
            >
              <span className="truncate max-w-[150px] sm:max-w-[220px]">{selectedModelObj?.name || selectedModel}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {showModelPickerDropdown && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 sm:w-80 bg-[#0c1322] border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[11px] font-semibold text-slate-400 px-3 py-1.5 uppercase tracking-wider">Changer de modèle IA</div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {models.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={!m.available}
                      onClick={() => {
                        setSelectedModel(m.id);
                        setShowModelPickerDropdown(false);
                        // P2-3 : sauvegarde le modèle sélectionné côté serveur
                        fetch('/api/user/model', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...authHeaders(authSession) },
                          body: JSON.stringify({ model: m.id }),
                        }).catch(() => {});
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        m.id === selectedModel
                          ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30'
                          : m.available
                          ? 'text-slate-300 hover:bg-slate-900 hover:text-white'
                          : 'text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate font-semibold">{m.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{m.id}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-mono shrink-0">
                        {m.available ? m.provider : 'indisponible'}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="pt-1.5 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModelPickerDropdown(false);
                      setIsSettingsOpen(true);
                    }}
                    className="w-full py-2 px-3 text-center text-xs text-sky-400 hover:text-sky-300 font-semibold hover:bg-sky-500/10 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Tous les modèles & Clés API...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCreateNewSession}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors"
              title="Nouvelle discussion"
            >
              <SquarePen className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors"
              title="Paramètres IA"
            >
              <Sliders className="w-5 h-5" />
            </button>
          </div>
        </header>

        <ChatPanel
          key={activeSession.id}
          sessionId={activeSession.id}
          initialMessages={activeSession.messages}
          authSession={authSession}
          selectedModel={selectedModel}
          temperature={temperature}
          onUnauthorized={handleUnauthorized}
          onTitleFromFirstMessage={text => {
            const title = text.slice(0, 24) + (text.length > 24 ? '...' : '');
            setSessions(prev =>
              prev.map(s => (s.id === activeSession.id ? { ...s, title } : s))
            );
            // P2-3 : renomme côté serveur
            fetch('/api/conversations/' + activeSession.id, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...authHeaders(authSession) },
              body: JSON.stringify({ title }),
            }).catch(() => {});
          }}
          onMessagesChange={(messages, isReady) => {
            setSessions(prev => prev.map(s => (s.id === activeSession.id ? { ...s, messages } : s)));
            const hasUserMsg = messages.some(m => m.role === 'user');
            if (isReady && hasUserMsg && authSession) {
              fetch('/api/conversations/' + activeSession.id + '/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders(authSession) },
                body: JSON.stringify({
                  title: activeSession.title,
                  messages: messages.map(m => ({
                    id: m.id,
                    role: m.role,
                    content: (m.parts || []).filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join(''),
                    parts: m.parts,
                  })),
                }),
              }).then(() => {
                // Rafraîchit la liste des conversations pour avoir les bons titres et sessions
                fetch('/api/conversations', { headers: authHeaders(authSession) })
                  .then(r => r.ok ? r.json() : null)
                  .then(data => {
                    if (data?.conversations?.length > 0) {
                      setSessions(prev => {
                        const existingMap = new Map(prev.map(s => [s.id, s]));
                        const list: Session[] = data.conversations.map((c: any) => ({
                          id: c.id,
                          title: c.title,
                          messages: existingMap.get(c.id)?.messages || [],
                        }));
                        const serverIds = new Set(data.conversations.map((c: any) => c.id));
                        for (const s of prev) {
                          if (!serverIds.has(s.id)) {
                            list.unshift(s);
                          }
                        }
                        return list;
                      });
                    }
                  }).catch(() => {});
              }).catch(() => {});
            }
          }}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        authSession={authSession}
        onUnauthorized={handleUnauthorized}
        onModelsUpdated={(updatedModels, activeModel) => {
          setModels(updatedModels);
          if (activeModel) {
            setSelectedModel(activeModel);
            // P2-3 : sauvegarde côté serveur
            fetch('/api/user/model', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...authHeaders(authSession) },
              body: JSON.stringify({ model: activeModel }),
            }).catch(() => {});
          }
        }}
      />
    </div>
  );
}

export default App;
