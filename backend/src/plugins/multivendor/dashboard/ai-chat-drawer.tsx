import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ahizanAi, ChatMessage, ModelInfo, ConversationItem, type StreamEvent } from './ahizan-ai-client';

class DrawerErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || 'Erreur du copilote' };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('[AhizanAIChatDrawer] Caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 99999, background: '#1e293b', color: '#fca5a5', padding: '10px 16px', borderRadius: 8, border: '1px solid #7f1d1d', fontSize: 12 }}>
          ⚠️ Ahizan AI indisponible ({this.state.error})
          <button type="button" onClick={() => this.setState({ hasError: false })} style={{ marginLeft: 8, background: '#334155', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}>Réessayer</button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ---------- Rendu Markdown léger (sans dépendance externe) ---------- */
function escapeHtml(s: string): string {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(md: string): string {
  if (!md) return '';
  const text = typeof md === 'string' ? md : String(md || '');
  const lines = text.split('\n');
  let html = '';
  let inTable = false;
  let tableHeader: string[] | null = null;
  let inCodeBlock = false;
  let codeBlockContent = '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Multi-line Code blocks ```
    if (rawLine.trim().startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre style="background:#020617;border:1px solid #1e293b;border-radius:6px;padding:8px 10px;margin:6px 0;font-size:11px;font-family:monospace;color:#38bdf8;overflow-x:auto;white-space:pre-wrap"><code>${escapeHtml(codeBlockContent.trim())}</code></pre>`;
        inCodeBlock = false;
        codeBlockContent = '';
      } else {
        if (inTable) { html += '</tbody></table>'; inTable = false; tableHeader = null; }
        inCodeBlock = true;
        codeBlockContent = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += (codeBlockContent ? '\n' : '') + rawLine;
      continue;
    }

    // Tableaux Markdown simples
    if (rawLine.trim().startsWith('|') && rawLine.trim().endsWith('|')) {
      const cells = rawLine.split('|').slice(1, -1).map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) continue; // séparation |---|---|
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
        html += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0"><thead><tr>' + cells.map(h => `<th style="border:1px solid #334155;padding:6px;text-align:left;background:#1e293b;color:#cbd5e1">${escapeHtml(h)}</th>`).join('') + '</tr></thead><tbody>';
        continue;
      }
      html += '<tr>' + cells.map(c => `<td style="border:1px solid #334155;padding:6px;color:#e2e8f0">${escapeHtml(c)}</td>`).join('') + '</tr>';
      continue;
    }
    if (inTable) { html += '</tbody></table>'; inTable = false; tableHeader = null; }

    if (!rawLine.trim()) { html += '<br/>'; continue; }

    let l = escapeHtml(rawLine);
    // Headings
    if (l.startsWith('#### ')) { html += `<h5 style="margin:6px 0 3px;font-size:12px;font-weight:700;color:#f1f5f9">${l.slice(5)}</h5>`; continue; }
    if (l.startsWith('### ')) { html += `<h4 style="margin:8px 0 4px;font-size:13px;font-weight:700;color:#f1f5f9">${l.slice(4)}</h4>`; continue; }
    if (l.startsWith('## ')) { html += `<h3 style="margin:10px 0 4px;font-size:14px;font-weight:700;color:#f1f5f9">${l.slice(3)}</h3>`; continue; }
    if (l.startsWith('# ')) { html += `<h2 style="margin:10px 0 4px;font-size:15px;font-weight:800;color:#f8fafc">${l.slice(2)}</h2>`; continue; }

    // Bold / italic / inline code
    l = l.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    l = l.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    l = l.replace(/`([^`]+)`/g, '<code style="background:#0f172a;padding:1px 5px;border-radius:4px;color:#38bdf8;font-size:11px;font-family:monospace">$1</code>');

    // List items
    if (l.startsWith('- ') || l.startsWith('* ')) {
      html += `<div style="padding-left:14px;color:#cbd5e1;margin:2px 0">• ${l.slice(2)}</div>`;
      continue;
    }
    if (/^\d+\.\s/.test(l)) {
      html += `<div style="padding-left:14px;color:#cbd5e1;margin:2px 0">${l}</div>`;
      continue;
    }

    html += `<p style="margin:4px 0;color:#e2e8f0;line-height:1.55">${l}</p>`;
  }

  if (inCodeBlock) {
    html += `<pre style="background:#020617;border:1px solid #1e293b;border-radius:6px;padding:8px 10px;margin:6px 0;font-size:11px;font-family:monospace;color:#38bdf8;overflow-x:auto;white-space:pre-wrap"><code>${escapeHtml(codeBlockContent.trim())}</code></pre>`;
  }
  if (inTable) html += '</tbody></table>';
  return html;
}

/* ---------- Carte d'outil repliable ---------- */
function ToolCard({ name, input, output, state, error }: { name: string; input?: any; output?: any; state: string; error?: string }) {
  const [open, setOpen] = useState(false);
  const isError = state === 'error' || Boolean(error);
  const isDone = state === 'output-available' || Boolean(output);
  const badge = isError ? '❌ Échec' : isDone ? '✅ Exécuté' : '⏳ En cours';
  const badgeColor = isError ? '#fca5a5' : isDone ? '#86efac' : '#7dd3fc';

  return (
    <div style={{ margin: '6px 0', border: `1px solid ${isError ? '#7f1d1d' : '#1e293b'}`, borderRadius: 8, overflow: 'hidden', fontSize: 12 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#0f172a', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}
      >
        <span style={{ fontFamily: 'monospace', color: '#7dd3fc', fontWeight: 600 }}>🔧 {name}</span>
        <span style={{ fontSize: 10, color: badgeColor }}>{badge} {open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div style={{ padding: 8, background: '#020617', borderTop: '1px solid #1e293b', fontFamily: 'monospace', fontSize: 10, maxHeight: 220, overflow: 'auto' }}>
          {input && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: '#64748b' }}>Paramètres :</span>
              <pre style={{ color: '#e2e8f0', margin: '2px 0 0 0', whiteSpace: 'pre-wrap' }}>{JSON.stringify(input, null, 2)}</pre>
            </div>
          )}
          {output && (
            <div>
              <span style={{ color: '#64748b' }}>Données retournées :</span>
              <pre style={{ color: '#86efac', margin: '2px 0 0 0', whiteSpace: 'pre-wrap' }}>{JSON.stringify(output, null, 2)}</pre>
            </div>
          )}
          {error && (
            <div>
              <span style={{ color: '#f87171' }}>Erreur :</span>
              <pre style={{ color: '#fca5a5', margin: '2px 0 0 0', whiteSpace: 'pre-wrap' }}>{error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Section raisonnement repliable ---------- */
function ReasoningBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text || !text.trim()) return null;
  return (
    <div style={{ margin: '6px 0', border: '1px solid #312e81', borderRadius: 8, overflow: 'hidden', fontSize: 11 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#1e1b4b', border: 'none', cursor: 'pointer', color: '#a5b4fc' }}
      >
        <span>💭 Réflexion</span><span style={{ marginLeft: 'auto' }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div style={{ padding: 8, background: '#0f0a2e', color: '#c7d2fe', whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto' }}>{text}</div>}
    </div>
  );
}

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: "Bonjour ! Je suis **Ahizan AI**, votre copilote officiel marketplace.\n\nJe suis connecté en direct à la base de données et aux API Vendure pour auditer le catalogue, modérer les fiches et analyser les ventes. Posez-moi une question ou choisissez une action ci-dessous."
};

function createSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/* ---------- Composant principal : Drawer flottant avec Gestion Multi-Discussions ---------- */
function AhizanAIChatDrawerInner() {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string>(() => createSessionId());
  const [currentTitle, setCurrentTitle] = useState<string>('Nouvelle discussion');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [toolCalls, setToolCalls] = useState<Record<string, { name: string; input?: any; output?: any; state: string; error?: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Charge la liste des discussions partagées depuis la base SQLite
  const loadConversations = useCallback(async () => {
    try {
      const list = await ahizanAi.getConversations();
      setConversations(list);
    } catch {}
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      loadConversations();
      if (models.length === 0) ahizanAi.getModels().then(m => { setModels(m); }).catch(() => {});
      ahizanAi.getDashboardModelConfig().then((cfg) => {
        if (cfg.primaryModel) setSelectedModel(cfg.primaryModel);
        else if (cfg.secondaryModel) setSelectedModel(cfg.secondaryModel);
      }).catch(() => {});
    }
  }, [isOpen, messages, streamingText, loadConversations, models.length]);

  // Commencer une nouvelle discussion
  const startNewConversation = () => {
    const newId = createSessionId();
    setCurrentConvId(newId);
    setCurrentTitle('Nouvelle discussion');
    setMessages([WELCOME_MESSAGE]);
    setShowHistory(false);
    setInput('');
    setStreamingText('');
    setReasoning('');
    setToolCalls({});
  };

  // Sélectionner une discussion existante et charger ses messages complets
  const selectConversation = async (id: string) => {
    setShowHistory(false);
    try {
      const data = await ahizanAi.getConversation(id);
      if (data?.conversation) {
        setCurrentConvId(id);
        setCurrentTitle(data.conversation.title || 'Discussion');
      }
      if (data?.messages && Array.isArray(data.messages)) {
        const loaded: ChatMessage[] = data.messages.map((m: any) => {
          let toolCallsParsed: any = undefined;
          let reasoningParsed: string | undefined = undefined;

          if (Array.isArray(m.parts)) {
            const toolParts = m.parts.filter((p: any) => p.type === 'dynamic-tool' || (typeof p.type === 'string' && p.type.startsWith('tool-')));
            if (toolParts.length > 0) {
              toolCallsParsed = toolParts.map((p: any) => ({
                name: p.type === 'dynamic-tool' ? p.toolName : p.type.replace(/^tool-/, ''),
                input: p.input,
                output: p.output,
                state: p.state === 'output-available' ? 'output-available' : p.state === 'output-error' ? 'error' : 'running',
                error: p.errorText
              }));
            }
            const reasoningParts = m.parts.filter((p: any) => p.type === 'reasoning').map((p: any) => p.text || p.reasoning || '').join('\n');
            if (reasoningParts) reasoningParsed = reasoningParts;
          }

          return {
            role: m.role,
            content: m.content || '',
            toolCalls: toolCallsParsed,
            reasoning: reasoningParsed
          };
        });

        setMessages(loaded.length > 0 ? loaded : [WELCOME_MESSAGE]);
      }
    } catch {
      setCurrentConvId(id);
    }
  };

  // Supprimer une discussion
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await ahizanAi.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConvId === id) {
        startNewConversation();
      }
    } catch {}
  };

  const handleSend = useCallback(async (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || isLoading) return;
    const newHistory: ChatMessage[] = [...messages, { role: 'user', content: q }];
    setMessages(newHistory);
    if (!textToSend) setInput('');
    setIsLoading(true);
    setStreamingText('');
    setReasoning('');
    setToolCalls({});

    let activeToolCalls: Record<string, { name: string; input?: any; output?: any; state: string; error?: string }> = {};
    let accumulatedReasoning = '';

    // Détermine le titre si c'est le premier message utilisateur
    const isFirstUserMsg = !messages.some(m => m.role === 'user');
    const computedTitle = isFirstUserMsg
      ? (q.slice(0, 24) + (q.length > 24 ? '...' : ''))
      : currentTitle;

    if (isFirstUserMsg) {
      setCurrentTitle(computedTitle);
    }

    try {
      const fullResponse = await ahizanAi.streamChat(
        newHistory,
        (evt: StreamEvent) => {
          switch (evt.type) {
            case 'text-delta': {
              const delta = (evt as any).delta ?? evt.textDelta ?? '';
              if (delta) setStreamingText(prev => prev + delta);
              break;
            }
            case 'reasoning':
            case 'reasoning-delta': {
              const delta = (evt as any).delta ?? evt.textDelta ?? evt.reasoning ?? '';
              if (delta) {
                accumulatedReasoning += delta;
                setReasoning(prev => prev + delta);
              }
              break;
            }
            case 'tool-input-start': {
              activeToolCalls = { ...activeToolCalls, [evt.toolCallId]: { name: evt.toolName, state: 'running' } };
              setToolCalls({ ...activeToolCalls });
              break;
            }
            case 'tool-input-available': {
              activeToolCalls = {
                ...activeToolCalls,
                [evt.toolCallId]: { ...(activeToolCalls[evt.toolCallId] || { name: evt.toolName }), name: evt.toolName, input: evt.input, state: 'running' }
              };
              setToolCalls({ ...activeToolCalls });
              break;
            }
            case 'tool-output-available': {
              activeToolCalls = {
                ...activeToolCalls,
                [evt.toolCallId]: { ...(activeToolCalls[evt.toolCallId] || {}), output: evt.output, state: 'output-available' }
              };
              setToolCalls({ ...activeToolCalls });
              break;
            }
            case 'tool-output-error': {
              activeToolCalls = {
                ...activeToolCalls,
                [evt.toolCallId]: { ...(activeToolCalls[evt.toolCallId] || {}), error: evt.errorText, state: 'error' }
              };
              setToolCalls({ ...activeToolCalls });
              break;
            }
            case 'error': {
              const errTxt = (evt as any).errorText || (evt as any).error || 'Erreur inconnue';
              setMessages(prev => [...prev, { role: 'assistant', content: `❌ Erreur : ${errTxt}` }]);
              break;
            }
          }
        },
        selectedModel || undefined
      );

      const executedTools = Object.values(activeToolCalls);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: fullResponse || (executedTools.length > 0 ? 'Opération effectuée avec succès.' : 'Aucune réponse générée.'),
        toolCalls: executedTools.length > 0 ? executedTools : undefined,
        reasoning: accumulatedReasoning || undefined,
      };

      const finalMessages = [...newHistory, assistantMsg];
      setMessages(finalMessages);
      setStreamingText('');

      // Synchronisation atomique avec la base SQLite partagée (ai.ahizan.com)
      const syncPayload = finalMessages.map((m, idx) => {
        const parts: any[] = [{ type: 'text', text: m.content || '' }];
        if (m.reasoning) parts.push({ type: 'reasoning', text: m.reasoning });
        if (m.toolCalls && m.toolCalls.length > 0) {
          for (const tc of m.toolCalls) {
            parts.push({
              type: 'dynamic-tool',
              toolName: tc.name,
              input: tc.input,
              output: tc.output,
              state: tc.state,
              errorText: tc.error
            });
          }
        }
        return {
          id: `msg_${currentConvId}_${idx}`,
          role: m.role,
          content: m.content || '',
          parts,
        };
      });

      ahizanAi.syncConversation(currentConvId, computedTitle, syncPayload).then(() => {
        loadConversations();
      }).catch(() => {});

    } catch (err: any) {
      setMessages([...newHistory, { role: 'assistant', content: `❌ Erreur : ${err.message}` }]);
      setStreamingText('');
    } finally {
      setIsLoading(false);
      setReasoning('');
      setToolCalls({});
    }
  }, [input, isLoading, messages, selectedModel, currentConvId, currentTitle, loadConversations]);

  const quickPrompts = [
    { label: '📊 Ventes & CA', query: "Quel est le chiffre d'affaires et le nombre total de ventes ?" },
    { label: '⏳ En attente', query: "Combien de produits sont en attente d'approbation ?" },
    { label: '👥 Vendeurs', query: 'Quels sont les vendeurs enregistrés et leur statut ?' },
    { label: '🔍 Doublons', query: 'Y a-t-il des produits potentiellement en doublon ?' },
  ];

  const toolCallList = Object.entries(toolCalls);

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999,
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#fff', border: '2px solid #38bdf8', borderRadius: '9999px',
            padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4), 0 0 15px rgba(56,189,248,0.3)',
            cursor: 'pointer', fontSize: 14, fontWeight: 700, transition: 'all 0.2s ease',
          }}
        >
          <span>🤖</span>
          <span>Ahizan AI</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
        </button>
      )}

      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 0, right: 0, zIndex: 99999, width: '440px', maxWidth: '100vw', height: '100dvh',
          background: '#020617', borderLeft: '1px solid #1e293b', display: 'flex', flexDirection: 'column',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.5)', fontFamily: 'system-ui, sans-serif',
        }}>
          {/* Header principal */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#0284c7,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
              <div>
                <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Ahizan AI
                  <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'monospace' }}>V2</span>
                </div>
                <div style={{ fontSize: 10, color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentTitle}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Bouton Discussions */}
              <button
                type="button"
                onClick={() => setShowHistory(prev => !prev)}
                title="Historique des discussions"
                style={{
                  padding: '5px 10px', borderRadius: 8, background: showHistory ? '#0284c7' : '#1e293b',
                  color: showHistory ? '#fff' : '#cbd5e1', border: '1px solid #334155', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5
                }}
              >
                <span>💬</span>
                <span>{conversations.length > 0 ? conversations.length : 'Chat'}</span>
              </button>

              {/* Bouton Nouvelle Discussion */}
              <button
                type="button"
                onClick={startNewConversation}
                title="Nouvelle discussion"
                style={{
                  padding: '5px 8px', borderRadius: 8, background: '#1e293b',
                  color: '#38bdf8', border: '1px solid #334155', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700
                }}
              >
                ➕
              </button>

              {/* Lien vers ai.ahizan.com */}
              <a
                href="https://ai.ahizan.com"
                target="_blank"
                rel="noreferrer"
                title="Ouvrir le grand cockpit (ai.ahizan.com)"
                style={{
                  padding: '5px 8px', borderRadius: 8, background: '#1e293b',
                  color: '#94a3b8', border: '1px solid #334155', textDecoration: 'none',
                  fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                ↗
              </a>

              {/* Fermer */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Barre de Modèle & État */}
          <div style={{ padding: '6px 16px', background: '#020617', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
            <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span>Synchro en direct</span>
            </div>
            {models.length > 0 && (
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                style={{ background: '#0f172a', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, padding: '2px 6px', fontSize: 11, outline: 'none' }}
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* VUE HISTORIQUE DES DISCUSSIONS */}
          {showHistory ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Discussions synchronisées
                </span>
                <button
                  type="button"
                  onClick={startNewConversation}
                  style={{ fontSize: 12, color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  + Nouveau chat
                </button>
              </div>

              {conversations.length === 0 ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  Aucune discussion enregistrée pour le moment. Envoyez votre premier message pour démarrer !
                </div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    style={{
                      padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                      background: conv.id === currentConvId ? '#1e293b' : '#0f172a',
                      border: `1px solid ${conv.id === currentConvId ? '#38bdf8' : '#1e293b'}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: conv.id === currentConvId ? '#f1f5f9' : '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.title}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                        {conv.updatedAt ? new Date(conv.updatedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Récent'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      title="Supprimer la discussion"
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, padding: '4px 6px', borderRadius: 4 }}
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* VUE CHAT ACTIF */
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, background: msg.role === 'user' ? '#334155' : 'linear-gradient(135deg,#0284c7,#2563eb)', color: '#fff' }}>
                    {msg.role === 'user' ? 'AD' : 'AI'}
                  </div>
                  <div style={{ maxWidth: '84%', width: '100%' }}>
                    {msg.reasoning && <ReasoningBlock text={msg.reasoning} />}
                    {msg.toolCalls && msg.toolCalls.map((tc, idx) => (
                      <ToolCard key={idx} name={tc.name} input={tc.input} output={tc.output} state={tc.state} error={tc.error} />
                    ))}
                    <div
                      style={{ padding: '10px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.5,
                        background: msg.role === 'user' ? '#0284c7' : '#0f172a', color: msg.role === 'user' ? '#fff' : '#e2e8f0',
                        border: msg.role === 'user' ? 'none' : '1px solid #1e293b' }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  </div>
                </div>
              ))}

              {/* Streaming en cours */}
              {isLoading && (
                <>
                  {reasoning && <ReasoningBlock text={reasoning} />}
                  {toolCallList.length > 0 && toolCallList.map(([id, tc]) => (
                    <ToolCard key={id} name={tc.name} input={tc.input} output={tc.output} state={tc.state} error={tc.error} />
                  ))}
                  {streamingText && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg,#0284c7,#2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>AI</div>
                      <div style={{ maxWidth: '84%', width: '100%', padding: '10px 12px', borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0', fontSize: 13, lineHeight: 1.5 }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingText) }} />
                    </div>
                  )}
                  {!streamingText && !reasoning && toolCallList.length === 0 && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#64748b', fontSize: 12 }}>
                      <span style={{ width: 14, height: 14, border: '2px solid #38bdf8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                      Connexion à la marketplace Ahizan…
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Quick prompts */}
          {!showHistory && messages.length <= 1 && !isLoading && (
            <div style={{ padding: '0 16px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {quickPrompts.map(p => (
                <button type="button" key={p.label} onClick={() => handleSend(p.query)} style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: 16, color: '#cbd5e1', fontSize: 11, cursor: 'pointer' }}>{p.label}</button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div style={{ padding: 12, borderTop: '1px solid #1e293b', background: '#0f172a' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 8 }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Posez votre question à Ahizan AI…"
                rows={1}
                style={{ flex: 1, background: 'transparent', color: '#e2e8f0', border: 'none', outline: 'none', resize: 'none', fontSize: 13, fontFamily: 'inherit', maxHeight: 100 }}
              />
              <button
                type="button"
                onClick={() => isLoading ? null : handleSend()}
                disabled={isLoading || !input.trim()}
                style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: isLoading ? '#475569' : '#0284c7', color: '#fff', cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >↑</button>
            </div>
            <div style={{ textAlign: 'center', fontSize: 10, color: '#475569', marginTop: 6, display: 'flex', justifyContent: 'center', gap: 12 }}>
              <span>Ahizan AI • Synchronisé</span>
              <a href="https://ai.ahizan.com" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>Ouvrir Cockpit ↗</a>
            </div>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </>
  );
}

export function AhizanAIChatDrawer() {
  return (
    <DrawerErrorBoundary>
      <AhizanAIChatDrawerInner />
    </DrawerErrorBoundary>
  );
}

