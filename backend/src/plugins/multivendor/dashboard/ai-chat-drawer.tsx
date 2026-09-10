import React, { useState, useRef, useEffect } from 'react';
import { ahizanAi, ChatMessage, ModelInfo } from './ahizan-ai-client';

export function AhizanAIChatDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis l\'assistant **Ahizan AI V2** pour le Super Admin, propulsé par Vercel AI SDK. Je réponds en streaming direct et je suis connecté à Vendure pour auditer le catalogue et les ventes. Que souhaitez-vous consulter ?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      ahizanAi.getModels().then(m => setModels(m)).catch(() => {});
    }
  }, [messages, streamingText, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || input;
    if (!q.trim() || isLoading) return;

    const newHistory: ChatMessage[] = [...messages, { role: 'user', content: q.trim() }];
    setMessages(newHistory);
    if (!textToSend) setInput('');
    setIsLoading(true);
    setStreamingText('');

    try {
      let accumulated = '';
      await ahizanAi.streamChat(
        newHistory,
        (token) => {
          accumulated += token;
          setStreamingText(accumulated);
        },
        selectedModel
      );

      setMessages([...newHistory, { role: 'assistant', content: accumulated }]);
      setStreamingText('');
    } catch (err: any) {
      setMessages([
        ...newHistory,
        { role: 'assistant', content: `❌ Une erreur est survenue : ${err.message}` }
      ]);
      setStreamingText('');
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: '📊 Ventes & CA', query: 'Quel est le chiffre d\'affaires et le nombre total de ventes ?' },
    { label: '⏳ En attente', query: 'Combien de produits sont actuellement en attente d\'approbation ?' },
    { label: '👥 Vendeurs actifs', query: 'Quels sont les vendeurs enregistrés et leur statut ?' },
    { label: '🔍 Doublons récents', query: 'Y a-t-il des produits potentiellement en doublon ?' },
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
            border: '2px solid #38bdf8',
            borderRadius: '9999px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 15px rgba(56, 189, 248, 0.3)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 700,
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: '18px' }}>🤖</span>
          <span>Ahizan AI V2</span>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px #10b981',
            display: 'inline-block'
          }} />
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '440px',
          maxWidth: 'calc(100vw - 48px)',
          height: '640px',
          maxHeight: 'calc(100vh - 48px)',
          background: '#0f172a',
          color: '#f8fafc',
          borderRadius: '20px',
          border: '1px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999999,
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          {/* Header */}
          <div style={{
            background: '#1e293b',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}>
                🤖
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
                  Ahizan AI V2 • Console
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    style={{
                      background: '#0f172a',
                      color: '#38bdf8',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {models.length > 0 ? (
                      models.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.available ? '●' : '(Désactivé)'}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="gemini-2.5-flash">Google Gemini 2.5 Flash</option>
                        <option value="deepseek/deepseek-chat">DeepSeek V3</option>
                        <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px',
                lineHeight: 1
              }}
            >
              ✕
            </button>
          </div>

          {/* Quick Prompts */}
          <div style={{
            display: 'flex',
            gap: '6px',
            padding: '8px 12px',
            background: '#0b1120',
            overflowX: 'auto',
            borderBottom: '1px solid #1e293b'
          }}>
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(qp.query)}
                style={{
                  background: '#1e293b',
                  color: '#93c5fd',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            padding: '14px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}
              >
                <div style={{
                  background: m.role === 'user' ? '#2563eb' : '#1e293b',
                  color: '#ffffff',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  border: m.role === 'assistant' ? '1px solid #334155' : 'none'
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {/* Live Streaming Message */}
            {isLoading && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignSelf: 'flex-start',
                maxWidth: '85%'
              }}>
                <div style={{
                  background: '#1e293b',
                  color: '#ffffff',
                  padding: '10px 14px',
                  borderRadius: '14px 14px 14px 2px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  border: '1px solid #38bdf8'
                }}>
                  {streamingText ? (
                    <>
                      {streamingText}
                      <span style={{ display: 'inline-block', width: '6px', height: '14px', background: '#38bdf8', marginLeft: '4px', verticalAlign: 'middle', animation: 'blink 1s infinite' }} />
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                      <span>Recherche et inférence en cours...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: '12px 14px',
            background: '#1e293b',
            borderTop: '1px solid #334155',
            display: 'flex',
            gap: '8px'
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Posez une question sur le catalogue, les ventes..."
              disabled={isLoading}
              style={{
                flex: 1,
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '10px',
                padding: '10px 14px',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              style={{
                background: isLoading || !input.trim() ? '#475569' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0 16px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s ease'
              }}
            >
              {isLoading ? '...' : 'Envoyer'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
