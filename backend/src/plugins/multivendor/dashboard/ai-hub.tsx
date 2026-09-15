import React, { useState, useEffect } from 'react';
import { ahizanAi, ChatMessage, ProductApprovalAnalysis } from './ahizan-ai-client';
import { AhizanAIChatDrawer } from './ai-chat-drawer';

export function AhizanAIHubComponent() {
  const [health, setHealth] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Bienvenue sur le Cockpit **Ahizan AI** ! Je suis votre agent d\'intelligence opérationnelle. Vous pouvez me poser des questions sur les ventes réelles, les approbations en attente, les statistiques des vendeurs ou faire analyser n\'importe quel produit.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testProductId, setTestProductId] = useState('421');
  const [productAnalysis, setProductAnalysis] = useState<ProductApprovalAnalysis | null>(null);
  const [isAnalyzingProduct, setIsAnalyzingProduct] = useState(false);

  useEffect(() => {
    ahizanAi.checkHealth()
      .then(data => setHealth(data))
      .catch(() => setHealth({ status: 'offline' }));
  }, []);

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || input;
    if (!q.trim() || isLoading) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: q.trim() }];
    setMessages(newMessages);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const res = await ahizanAi.chat(newMessages);
      setMessages([...newMessages, { role: 'assistant', content: res.text }]);
    } catch (err: any) {
      setMessages([...newMessages, { role: 'assistant', content: `❌ Erreur : ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeProduct = async () => {
    if (!testProductId.trim() || isAnalyzingProduct) return;
    setIsAnalyzingProduct(true);
    try {
      const res = await ahizanAi.products.analyze(testProductId.trim());
      setProductAnalysis(res);
    } catch (err: any) {
      alert(`Erreur d'analyse produit : ${err.message}`);
    } finally {
      setIsAnalyzingProduct(false);
    }
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto', color: '#1e293b', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)'
          }}>
            🤖
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
              Ahizan AI — Centre d'Intelligence & Modération
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Super Admin • AI Gateway Multi-Providers & Workflow d'Approbation Catalogue
            </p>
          </div>
        </div>

        {/* Health status badge */}
        <div style={{
          background: health?.status === 'ok' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${health?.status === 'ok' ? '#86efac' : '#fca5a5'}`,
          borderRadius: '9999px',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          fontWeight: 700,
          color: health?.status === 'ok' ? '#166534' : '#991b1b'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: health?.status === 'ok' ? '#10b981' : '#ef4444'
          }} />
          <span>Microservice Ahizan AI : {health?.status === 'ok' ? 'Opérationnel (Port 3005)' : 'Hors-ligne'}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        {/* Left Column: Conversational Assistant */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          height: '680px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              💬 Assistant Conversationnel Super Admin
            </h2>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Zéro hallucination • Connecté à Vendure</span>
          </div>

          {/* Quick Prompts */}
          <div style={{ display: 'flex', gap: '8px', padding: '10px 16px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
            <button
              onClick={() => handleSend('Quel est le chiffre d\'affaires et le nombre total de ventes ?')}
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
            >
              📊 Chiffre d'affaires
            </button>
            <button
              onClick={() => handleSend('Combien de produits sont actuellement en attente d\'approbation ?')}
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
            >
              ⏳ Produits en attente
            </button>
            <button
              onClick={() => handleSend('Quels sont les vendeurs enregistrés et leur statut ?')}
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
            >
              👥 Vendeurs
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.role === 'user' ? '#2563eb' : '#f8fafc',
                  color: m.role === 'user' ? '#ffffff' : '#0f172a',
                  padding: '12px 16px',
                  borderRadius: m.role === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {m.content}
              </div>
            ))}
            {isLoading && (
              <div style={{ alignSelf: 'flex-start', background: '#f8fafc', color: '#64748b', padding: '10px 14px', borderRadius: '12px', fontSize: '12px' }}>
                ⏳ Recherche des données réelles et analyse...
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: '14px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Posez une question sur les ventes, les approbations, les vendeurs..."
              style={{
                flex: 1,
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0 18px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Envoyer
            </button>
          </div>
        </div>

        {/* Right Column: Contextual Product Intelligence Tester */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              🔍 Testeur du Workflow d'Approbation Produit
            </h2>
            <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
              Simulez l'analyse d'une soumission vendeur par l'IA (détection de doublons, proposition de fiche officielle et score FQS).
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <input
                type="text"
                value={testProductId}
                onChange={e => setTestProductId(e.target.value)}
                placeholder="ID Produit (ex: 421)"
                style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}
              />
              <button
                onClick={handleAnalyzeProduct}
                disabled={isAnalyzingProduct}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isAnalyzingProduct ? 'Analyse...' : '🤖 Analyser'}
              </button>
            </div>

            {productAnalysis && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {/* Recommendation badge */}
                <div style={{
                  background: productAnalysis.recommendation === 'APPROVE_OFFICIAL' ? '#dcfce7' :
                              productAnalysis.recommendation === 'REGRAFT_EXISTING' ? '#fef3c7' : '#fee2e2',
                  border: `1px solid ${
                    productAnalysis.recommendation === 'APPROVE_OFFICIAL' ? '#10b981' :
                    productAnalysis.recommendation === 'REGRAFT_EXISTING' ? '#f59e0b' : '#ef4444'
                  }`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: productAnalysis.recommendation === 'APPROVE_OFFICIAL' ? '#065f46' :
                         productAnalysis.recommendation === 'REGRAFT_EXISTING' ? '#92400e' : '#991b1b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>
                    {productAnalysis.recommendation === 'APPROVE_OFFICIAL' ? '✅ CRÉATION FICHE OFFICIELLE' :
                     productAnalysis.recommendation === 'REGRAFT_EXISTING' ? '🔗 RE-GREFFAGE RECOMMANDÉ' :
                     '⚠️ DEMANDE D\'INFORMATIONS'}
                  </span>
                  <span>{Math.round(productAnalysis.confidence * 100)}% confiance</span>
                </div>

                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                  {productAnalysis.decisionRationale}
                </p>

                {/* Proposed Official Data */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>Fiche Officielle Proposée</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {productAnalysis.proposedOfficialProduct.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Marque: <strong>{productAnalysis.proposedOfficialProduct.brand}</strong> • Modèle: <strong>{productAnalysis.proposedOfficialProduct.model}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '4px' }}>
                    SEO: {productAnalysis.proposedOfficialProduct.seoTitle}
                  </div>
                </div>

                {/* Score audit */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                  <span style={{ color: '#64748b' }}>Score de qualité fiche :</span>
                  <span style={{
                    fontWeight: 800,
                    color: productAnalysis.qualityScore.score >= 50 ? '#10b981' : '#ef4444'
                  }}>
                    {productAnalysis.qualityScore.score} / 100 ({productAnalysis.qualityScore.ratingLabel})
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
