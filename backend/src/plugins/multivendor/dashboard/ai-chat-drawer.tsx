import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ahizanAi, ChatMessage, ModelInfo, type StreamEvent } from './ahizan-ai-client';

/* ---------- Rendu Markdown léger (sans dépendance externe) ---------- */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
}

function renderMarkdown(md: string): string {
  if (!md) return '';
  // Tableaux Markdown simples
  const lines = md.split('\n');
  let html = '';
  let inTable = false;
  let tableHeader: string[] | null = null;
  const flushTable = () => {
    if (!inTable || !tableHeader) return;
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0">';
    html += '<thead><tr>' + tableHeader.map(h => `<th style="border:1px solid #334155;padding:6px;text-align:left;background:#1e293b;color:#cbd5e1">${h}</th>`).join('') + '</tr></thead>';
    inTable = false;
    tableHeader = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      // ligne de séparation |---|---|
      if (cells.every(c => /^[-:]+$/.test(c))) continue;
      if (!inTable) { inTable = true; tableHeader = cells; html += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0"><thead><tr>' + cells.map(h => `<th style="border:1px solid #334155;padding:6px;text-align:left;background:#1e293b;color:#cbd5e1">${escapeHtml(h)}</th>`).join('') + '</tr></thead><tbody>'; continue; }
      html += '<tr>' + cells.map(c => `<td style="border:1px solid #334155;padding:6px;color:#e2e8f0">${escapeHtml(c)}</td>`).join('') + '</tr>';
      continue;
    }
    if (inTable) { html += '</tbody></table>'; inTable = false; tableHeader = null; }
    if (!line.trim()) { html += '<br/>'; continue; }
    let l = escapeHtml(line);
    // headings
    if (l.startsWith('### ')) { html += `<h4 style="margin:8px 0 4px;font-size:13px;color:#f1f5f9">${l.slice(4)}</h4>`; continue; }
    if (l.startsWith('## ')) { html += `<h3 style="margin:10px 0 4px;font-size:14px;color:#f1f5f9">${l.slice(3)}</h3>`; continue; }
    if (l.startsWith('# ')) { html += `<h2 style="margin:10px 0 4px;font-size:15px;color:#f8fafc">${l.slice(2)}</h2>`; continue; }
    // bold / italic / code
    l = l.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    l = l.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    l = l.replace(/`([^`]+)`/g, '<code style="background:#0f172a;padding:1px 4px;border-radius:3px;color:#38bdf8;font-size:11px">$1</code>');
    // list items
    if (l.startsWith('- ') || l.startsWith('* ')) { html += `<div style="padding-left:14px;color:#cbd5e1">• ${l.slice(2)}</div>`; continue; }
    if (/^\d+\.\s/.test(l)) { html += `<div style="padding-left:14px;color:#cbd5e1">${l}</div>`; continue; }
    html += `<p style="margin:4px 0;color:#e2e8f0;line-height:1.55">${l}</p>`;
  }
  if (inTable) html += '</tbody></table>';
  return html;
}

/* ---------- Carte d'outil repliable ---------- */
function ToolCard({ name, input, output, state }: { name: string; input?: any; output?: any; state: string }) {
  const [open, setOpen] = useState(false);
  const isError = state === 'error';
  const isDone = state === 'output-available' || !!output;
  const badge = isError ? '❌ Échec' : isDone ? '✅ Succès' : '⏳ En cours';
  const badgeColor = isError ? '#fca5a5' : isDone ? '#86efac' : '#7dd3fc';
  return (
    <div style={{ margin: '6px 0', border: `1px solid ${isError ? '#7f1d1d' : '#1e293b'}`, borderRadius: 8, overflow: 'hidden', fontSize: 12 }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#0f172a', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}>
        <span style={{ fontFamily: 'monospace', color: '#7dd3fc' }}>🔧 {name}</span>
        <span style={{ fontSize: 10, color: badgeColor }}>{badge} {open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div style={{ padding: 8, background: '#020617', borderTop: '1px solid #1e293b', fontFamily: 'monospace', fontSize: 10, maxHeight: 200, overflow: 'auto' }}>
          {input && (<div style={{ marginBottom: 4 }}><span style={{ color: '#64748b' }}>Entrée :</span><pre style={{ color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(input, null, 2)}</pre></div>)}
          {output && (<div><span style={{ color: '#64748b' }}>Résultat :</span><pre style={{ color: '#86efac', margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(output, null, 2)}</pre></div>)}
        </div>
      )}
    </div>
  );
}

/* ---------- Section raisonnement repliable ---------- */
function ReasoningBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(true);
  if (!text) return null;
  return (
    <div style={{ margin: '6px 0', border: '1px solid #312e81', borderRadius: 8, overflow: 'hidden', fontSize: 11 }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#1e1b4b', border: 'none', cursor: 'pointer', color: '#a5b4fc' }}>
        <span>💭 Réflexion</span><span style={{ marginLeft: 'auto' }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div style={{ padding: 8, background: '#0f0a2e', color: '#c7d2fe', whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto' }}>{text}</div>}
    </div>
  );
}

/* ---------- Carte d'approbation humaine ---------- */
function ApprovalCard({ toolName, input }: { toolName: string; input: any }) {
  return (
    <div style={{ margin: '6px 0', border: '1px solid #b45309', borderRadius: 8, overflow: 'hidden', fontSize: 12 }}>
      <div style={{ padding: '6px 10px', background: '#422006', color: '#fcd34d', fontWeight: 600 }}>⚠️ Confirmation requise : {toolName}</div>
      <div style={{ padding: 8, background: '#0f172a' }}>
        <pre style={{ color: '#e2e8f0', fontSize: 10, margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(input, null, 2)}</pre>
      </div>
    </div>
  );
}

/* ---------- Composant principal : Drawer flottant ---------- */
export function AhizanAIChatDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Bonjour ! Je suis **Ahizan AI**, votre assistant opérationnel marketplace. Je suis connecté à Vendure pour auditer le catalogue, modérer les produits et suivre les ventes. Posez-moi une question." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [toolCalls, setToolCalls] = useState<Record<string, { name: string; input?: any; output?: any; state: string; error?: string }>>({});
  const [approvalPending, setApprovalPending] = useState<{ toolName: string; input: any } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (models.length === 0) ahizanAi.getModels().then(m => { setModels(m); }).catch(() => {});
      // Charge le modèle configuré (primaire/secondaire) pour le dashboard
      ahizanAi.getDashboardModelConfig().then((cfg) => {
        if (cfg.primaryModel) setSelectedModel(cfg.primaryModel);
        else if (cfg.secondaryModel) setSelectedModel(cfg.secondaryModel);
      }).catch(() => {});
    }
  }, [isOpen, messages, streamingText]);

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
    setApprovalPending(null);

    try {
      await ahizanAi.streamChat(
        newHistory,
        (evt: StreamEvent) => {
          switch (evt.type) {
            case 'text-delta':
              setStreamingText(prev => prev + (evt.textDelta || ''));
              break;
            case 'reasoning':
              setReasoning(prev => prev + (evt.textDelta || evt.reasoning || ''));
              break;
            case 'tool-input-start':
              setToolCalls(prev => ({ ...prev, [evt.toolCallId]: { name: evt.toolName, state: 'running' } }));
              break;
            case 'tool-input-available':
              setToolCalls(prev => ({ ...prev, [evt.toolCallId]: { ...(prev[evt.toolCallId] || { name: evt.toolName }), name: evt.toolName, input: evt.input, state: 'running' } }));
              break;
            case 'tool-output-available':
              setToolCalls(prev => ({ ...prev, [evt.toolCallId]: { ...(prev[evt.toolCallId] || {}), output: evt.output, state: 'output-available' } }));
              break;
            case 'tool-output-error':
              setToolCalls(prev => ({ ...prev, [evt.toolCallId]: { ...(prev[evt.toolCallId] || {}), error: evt.errorText, state: 'error' } }));
              break;
          }
        },
        selectedModel || undefined
      );
      setStreamingText(prev => {
        setMessages([...newHistory, { role: 'assistant', content: prev }]);
        return '';
      });
    } catch (err: any) {
      setMessages([...newHistory, { role: 'assistant', content: `❌ Erreur : ${err.message}` }]);
      setStreamingText('');
    } finally {
      setIsLoading(false);
      setReasoning('');
      setToolCalls({});
    }
  }, [input, isLoading, messages, selectedModel]);

  const quickPrompts = [
    { label: '📊 Ventes & CA', query: "Quel est le chiffre d'affaires et le nombre total de ventes ?" },
    { label: '⏳ En attente', query: 'Combien de produits sont en attente d\'approbation ?' },
    { label: '👥 Vendeurs', query: 'Quels sont les vendeurs enregistrés et leur statut ?' },
    { label: '🔍 Doublons', query: 'Y a-t-il des produits potentiellement en doublon ?' },
  ];

  const toolCallList = Object.entries(toolCalls);

  return (
    <>
      {!isOpen && (
        <button
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
          position: 'fixed', bottom: 0, right: 0, zIndex: 99999, width: '420px', maxWidth: '100vw', height: '100dvh',
          background: '#020617', borderLeft: '1px solid #1e293b', display: 'flex', flexDirection: 'column',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.5)', fontFamily: 'system-ui, sans-serif',
        }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#0284c7,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
              <div>
                <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 14 }}>Ahizan AI</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>Cockpit opérationnel marketplace</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, background: msg.role === 'user' ? '#334155' : 'linear-gradient(135deg,#0284c7,#2563eb)', color: '#fff' }}>
                  {msg.role === 'user' ? 'AD' : 'AI'}
                </div>
                <div style={{ maxWidth: '82%' }}>
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
                  <ToolCard key={id} name={tc.name} input={tc.input} output={tc.output} state={tc.state} />
                ))}
                {streamingText && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg,#0284c7,#2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>AI</div>
                    <div style={{ maxWidth: '82%', padding: '10px 12px', borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0', fontSize: 13, lineHeight: 1.5 }}
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

          {/* Quick prompts */}
          {messages.length <= 1 && !isLoading && (
            <div style={{ padding: '0 16px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {quickPrompts.map(p => (
                <button key={p.label} onClick={() => handleSend(p.query)} style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: 16, color: '#cbd5e1', fontSize: 11, cursor: 'pointer' }}>{p.label}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: 12, borderTop: '1px solid #1e293b', background: '#0f172a' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 8 }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Posez votre question à Horizon AI…"
                rows={1}
                style={{ flex: 1, background: 'transparent', color: '#e2e8f0', border: 'none', outline: 'none', resize: 'none', fontSize: 13, fontFamily: 'inherit', maxHeight: 100 }}
              />
              <button
                onClick={() => isLoading ? null : handleSend()}
                disabled={isLoading || !input.trim()}
                style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: isLoading ? '#475569' : '#0284c7', color: '#fff', cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >↑</button>
            </div>
            <div style={{ textAlign: 'center', fontSize: 10, color: '#475569', marginTop: 6 }}>
              Ahizan AI • Assistant opérationnel
            </div>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </>
  );
}
