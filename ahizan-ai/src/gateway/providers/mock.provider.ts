import { LLMProvider, ChatMessage, GenerateOptions, GenerateResponse, ToolCall } from '../types';

/**
 * Intelligent deterministic provider for local testing, CI/CD, and offline resilience.
 * Capable of analyzing intent, selecting tools, and formulating synthesized responses.
 */
export class MockProvider implements LLMProvider {
  readonly name = 'mock-local';

  isAvailable(): boolean {
    return true; // Always available as fallback
  }

  async generate(messages: ChatMessage[], options?: GenerateOptions): Promise<GenerateResponse> {
    const startTime = Date.now();
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const lastToolMsg = [...messages].reverse().find(m => m.role === 'tool');
    const userText = (lastUserMsg?.content || '').toLowerCase();

    const toolCalls: ToolCall[] = [];
    let text = '';

    // Step 1: If there is a recent tool result in history, formulate the synthesized answer
    if (lastToolMsg && messages.filter(m => m.role === 'tool').length > 0) {
      let toolData: any = {};
      try {
        toolData = JSON.parse(lastToolMsg.content);
      } catch {
        toolData = { raw: lastToolMsg.content };
      }

      if (lastToolMsg.toolCallId?.includes('pending') || toolData.pendingCount !== undefined || toolData.items) {
        const count = toolData.pendingCount ?? (toolData.items ? toolData.items.length : 0);
        text = `Sur la base des données actuelles d'Ahizan, il y a **${count} produit(s)** en attente d'approbation par l'équipe d'administration.`;
        if (toolData.items && toolData.items.length > 0) {
          text += `\n\nVoici les fiches récentes nécessitant une revue :\n` +
            toolData.items.slice(0, 5).map((p: any) => `- **#${p.id} ${p.name}** (Vendeur: ${p.customFields?.vendor?.name || 'Inconnu'})`).join('\n');
        }
      } else if (lastToolMsg.toolCallId?.includes('sales') || toolData.totalOrders !== undefined) {
        text = `Voici le point actuel sur les ventes Ahizan :\n` +
          `- **Nombre total de commandes :** ${toolData.totalOrders || 0}\n` +
          `- **Chiffre d'affaires consolidé :** ${(toolData.totalSalesFormatted || ((toolData.totalRevenue || 0) / 100).toLocaleString('fr-FR'))} FCFA\n` +
          `- **Commandes récentes validées :** ${toolData.paidOrdersCount || 0}`;
      } else if (lastToolMsg.toolCallId?.includes('duplicates') || toolData.duplicates !== undefined || toolData.matches !== undefined) {
        const matches = toolData.duplicates || toolData.matches || [];
        if (matches.length > 0) {
          text = `🔍 **Analyse de détection de doublons :**\n` +
            `Un ou plusieurs produits très similaires ont été identifiés dans le catalogue officiel :\n` +
            matches.map((m: any) => `- **#${m.id} ${m.name}** (Similarité: ${Math.round((m.similarityScore || 0.85) * 100)}% - Raison: ${m.reason || 'Attributs et titre concordants'})`).join('\n') +
            `\n\n💡 **Recommandation IA :** Re-greffer l'offre vendeur sur la fiche officielle existante #${matches[0].id} via la mutation \`reassignVariantToProduct\`.`;
        } else {
          text = `✅ **Aucun doublon exact détecté dans le catalogue officiel.** Ce produit semble être inédit sur la plateforme Ahizan. Vous pouvez créer une nouvelle fiche officielle.`;
        }
      } else if (lastToolMsg.toolCallId?.includes('vendor') || toolData.vendorsCount !== undefined) {
        text = `Données vendeurs Ahizan :\n- Total vendeurs enregistrés : **${toolData.vendorsCount || toolData.totalItems || 0}**\n` +
          (toolData.topVendors ? `Top vendeurs : ${toolData.topVendors.map((v: any) => v.name).join(', ')}` : '');
      } else {
        text = `Voici les données extraites du système Ahizan :\n\`\`\`json\n${JSON.stringify(toolData, null, 2)}\n\`\`\``;
      }
    } 
    // Step 2: Else determine which tool to call based on the user's intent
    else {
      if (userText.includes('vente') || userText.includes('chiffre') || userText.includes('revenu') || userText.includes('commande')) {
        toolCalls.push({
          id: `call_sales_${Date.now()}`,
          name: 'getSalesStatistics',
          arguments: { period: 'all' }
        });
      } else if (userText.includes('attente') || userText.includes('approbation') || userText.includes('modération') || userText.includes('valider')) {
        toolCalls.push({
          id: `call_pending_${Date.now()}`,
          name: 'getPendingApprovals',
          arguments: { take: 10 }
        });
      } else if (userText.includes('doublon') || userText.includes('similaire') || userText.includes('existe déjà')) {
        toolCalls.push({
          id: `call_duplicates_${Date.now()}`,
          name: 'findPotentialDuplicates',
          arguments: { query: userText.replace(/doublon|similaire|existe|déjà|est-ce|un/gi, '').trim() || 'Samsung' }
        });
      } else if (userText.includes('vendeur') || userText.includes('boutique') || userText.includes('marchand')) {
        toolCalls.push({
          id: `call_vendors_${Date.now()}`,
          name: 'getTopVendors',
          arguments: { limit: 5 }
        });
      } else if (userText.includes('produit') || userText.includes('catalogue')) {
        toolCalls.push({
          id: `call_prods_${Date.now()}`,
          name: 'searchOfficialCatalog',
          arguments: { term: userText.replace(/produit|catalogue|recherche|trouve/gi, '').trim() || '' }
        });
      } else {
        text = `Bonjour ! Je suis l'assistant IA officiel d'Ahizan Marketplace pour le Super Admin.\n\n` +
          `Je suis connecté en direct aux APIs de la plateforme et je peux vous renseigner avec précision sur :\n` +
          `- **Les ventes et commandes en temps réel** ("Combien de ventes avons-nous ?")\n` +
          `- **Les fiches en attente de modération** ("Quels produits sont en attente d'approbation ?")\n` +
          `- **L'analyse des doublons et des correspondances** ("Ce produit existe-t-il déjà ?")\n` +
          `- **L'activité des vendeurs et boutiques** ("Quels sont les vendeurs les plus actifs ?")\n\n` +
          `Que souhaitez-vous examiner ?`;
      }
    }

    return {
      text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: 50,
        completionTokens: 80,
        totalTokens: 130
      },
      modelUsed: 'ahizan-deterministic-engine',
      provider: this.name,
      latencyMs: Date.now() - startTime
    };
  }
}
