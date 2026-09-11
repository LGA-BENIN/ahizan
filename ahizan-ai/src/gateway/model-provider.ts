import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';
import { configStore, AIModelDefinition } from './config-store';

export interface ModelProviderInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  available: boolean;
  isCustom?: boolean;
  category?: string;
}

interface LiveCatalogEntry {
  ids: Set<string>;
  fetchedAt: number;
}

const LIVE_CATALOG_TTL_MS = 10 * 60 * 1000; // 10 minutes

export class ModelGateway {
  private googleClient: ReturnType<typeof createGoogleGenerativeAI> | null = null;
  private openaiClient: ReturnType<typeof createOpenAI> | null = null;
  private openRouterClient: ReturnType<typeof createOpenAI> | null = null;
  private customClient: ReturnType<typeof createOpenAI> | null = null;

  // Cache du catalogue "live" par fournisseur (voir docs/roadmap-produit.md, P2-3).
  // Un catalogue de modèles codé en dur devient obsolète en quelques mois (les
  // fournisseurs retirent/ajoutent des modèles en continu) : on interroge donc
  // directement l'API du fournisseur, avec un repli sur PRESET_MODELS_CATALOG si
  // l'appel échoue (réseau, clé absente, quota).
  private liveCatalogCache = new Map<string, LiveCatalogEntry>();
  private settingsFingerprint = '';

  constructor() {
    this.refreshClients();
  }

  /**
   * Invalide le cache des clients ET du catalogue live seulement si la configuration
   * a réellement changé (voir P2-4 : refreshClients() ne doit pas recréer les 4 clients
   * SDK ni relire le disque à chaque requête de chat).
   */
  public refreshClientsIfChanged() {
    const settings = configStore.getRawSettings();
    const fingerprint = JSON.stringify(settings.providers);
    if (fingerprint !== this.settingsFingerprint) {
      this.settingsFingerprint = fingerprint;
      this.liveCatalogCache.clear();
      this.refreshClients();
    }
  }

  public refreshClients() {
    const settings = configStore.getRawSettings();

    // 1. Google Gemini
    const googleKey = (settings.providers.google.apiKey || process.env.GEMINI_API_KEY || '').trim();
    if (googleKey) {
      this.googleClient = createGoogleGenerativeAI({
        apiKey: googleKey,
      });
    } else {
      this.googleClient = null;
    }

    // 2. OpenAI Native
    const openaiKey = (settings.providers.openai.apiKey || process.env.OPENAI_API_KEY || '').trim();
    if (openaiKey) {
      this.openaiClient = createOpenAI({
        apiKey: openaiKey,
        baseURL: settings.providers.openai.baseURL || process.env.OPENAI_BASE_URL || undefined,
      });
    } else {
      this.openaiClient = null;
    }

    // 3. OpenRouter (Hosts Gemma 4 31B, Gemma 2, Claude 3.7, DeepSeek R1, Llama 3.3, Mistral, etc.)
    const openRouterKey = (settings.providers.openrouter.apiKey || process.env.OPENROUTER_API_KEY || process.env.DEEPSEEK_API_KEY || '').trim();
    if (openRouterKey) {
      this.openRouterClient = createOpenAI({
        baseURL: settings.providers.openrouter.baseURL || 'https://openrouter.ai/api/v1',
        apiKey: openRouterKey,
        headers: {
          'HTTP-Referer': 'https://ahizan.com',
          'X-Title': 'Ahizan AI Cockpit',
        },
      });
    } else {
      this.openRouterClient = null;
    }

    // 4. Custom / Ollama / Local Server / Groq / OpenAI-compatible
    const customKey = (settings.providers.custom.apiKey || process.env.CUSTOM_AI_API_KEY || '').trim();
    const customBaseURL = (settings.providers.custom.baseURL || process.env.CUSTOM_AI_BASE_URL || '').trim();
    if (customBaseURL || customKey) {
      this.customClient = createOpenAI({
        baseURL: customBaseURL || 'http://localhost:11434/v1',
        apiKey: customKey || 'ollama',
      });
    } else {
      this.customClient = null;
    }
  }

  isProviderAvailable(provider: string): boolean {
    const settings = configStore.getRawSettings();
    switch (provider) {
      case 'google':
        return !!(settings.providers.google.apiKey || process.env.GEMINI_API_KEY);
      case 'openai':
        return !!(settings.providers.openai.apiKey || process.env.OPENAI_API_KEY);
      case 'openrouter':
        return !!(settings.providers.openrouter.apiKey || process.env.OPENROUTER_API_KEY || process.env.DEEPSEEK_API_KEY);
      case 'custom':
        return !!(settings.providers.custom.baseURL || settings.providers.custom.apiKey || process.env.CUSTOM_AI_BASE_URL);
      default:
        return false;
    }
  }

  /** Interroge l'API Google (ListModels) pour la liste réelle des modèles disponibles avec la clé configurée. */
  private async fetchGoogleModelIds(apiKey: string): Promise<Set<string> | null> {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const json = await res.json();
      const ids = new Set<string>();
      for (const m of json.models || []) {
        if ((m.supportedGenerationMethods || []).includes('generateContent')) {
          ids.add(String(m.name || '').replace(/^models\//, ''));
        }
      }
      return ids;
    } catch {
      return null;
    }
  }

  /** Interroge le catalogue public OpenRouter (aucune clé nécessaire pour la liste). */
  private async fetchOpenRouterModelIds(): Promise<Set<string> | null> {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const json = await res.json();
      return new Set<string>((json.data || []).map((m: any) => String(m.id)));
    } catch {
      return null;
    }
  }

  /** Interroge l'API OpenAI (nécessite la clé configurée). */
  private async fetchOpenAIModelIds(apiKey: string): Promise<Set<string> | null> {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return new Set<string>((json.data || []).map((m: any) => String(m.id)));
    } catch {
      return null;
    }
  }

  /**
   * Renvoie l'ensemble des identifiants réellement disponibles pour un fournisseur,
   * avec mise en cache (TTL 10 min). Renvoie `null` si l'appel n'a pas pu être vérifié
   * (pas de clé, réseau indisponible) : dans ce cas l'appelant doit se replier sur
   * l'ancienne heuristique ("disponible si le fournisseur est configuré").
   */
  private async getLiveModelIds(provider: string): Promise<Set<string> | null> {
    const cached = this.liveCatalogCache.get(provider);
    if (cached && Date.now() - cached.fetchedAt < LIVE_CATALOG_TTL_MS) {
      return cached.ids;
    }

    const settings = configStore.getRawSettings();
    let ids: Set<string> | null = null;
    if (provider === 'google') {
      const key = (settings.providers.google.apiKey || process.env.GEMINI_API_KEY || '').trim();
      if (key) ids = await this.fetchGoogleModelIds(key);
    } else if (provider === 'openrouter') {
      ids = await this.fetchOpenRouterModelIds();
    } else if (provider === 'openai') {
      const key = (settings.providers.openai.apiKey || process.env.OPENAI_API_KEY || '').trim();
      if (key) ids = await this.fetchOpenAIModelIds(key);
    }

    if (ids) {
      this.liveCatalogCache.set(provider, { ids, fetchedAt: Date.now() });
    }
    return ids;
  }

  getModel(modelId?: string): LanguageModel {
    this.refreshClientsIfChanged();
    const settings = configStore.getRawSettings();

    const targetId = (modelId || settings.activeModel || process.env.AHIZAN_AI_MODEL || 'gemini-3.8-flash').trim();
    const modelDef = settings.models.find(m => m.id.toLowerCase() === targetId.toLowerCase());

    const provider = modelDef?.provider || (
      targetId.startsWith('google/') || targetId.includes('openrouter') || targetId.includes('deepseek') || targetId.includes('claude') || targetId.includes('llama') || targetId.includes('mistral') || targetId.includes('qwen') || targetId.includes('grok') ? 'openrouter' :
      targetId.includes('gpt-') || targetId.includes('o1') || targetId.includes('o3') ? 'openai' :
      targetId.includes('gemini') || targetId.startsWith('gemma') ? 'google' : 'custom'
    );

    // 1. Google Gemini & Google Gemma Native (via Google AI Studio API)
    if (provider === 'google' && this.googleClient) {
      let cleanId = targetId;
      if (cleanId === 'gemini' || cleanId === 'gemini-flash' || cleanId.includes('gemini-2.0') || cleanId.includes('gemini-1.5')) {
        cleanId = 'gemini-2.5-flash';
      }
      if (cleanId.startsWith('google/')) {
        cleanId = cleanId.substring(7);
      }
      return this.googleClient(cleanId);
    }

    // 2. OpenRouter (Handles Gemma 4 31B, Gemma 2 27B, Claude 3.7, DeepSeek R1, Llama 3.3, Mistral...)
    if (provider === 'openrouter' && this.openRouterClient) {
      let cleanOpenRouterId = targetId;
      if (cleanOpenRouterId === 'gemma-4-31b' || cleanOpenRouterId === 'gemma-31b') {
        cleanOpenRouterId = 'google/gemma-4-31b';
      } else if (cleanOpenRouterId === 'gemma-2-27b') {
        cleanOpenRouterId = 'google/gemma-2-27b-it';
      } else if (cleanOpenRouterId === 'gemma-2-9b') {
        cleanOpenRouterId = 'google/gemma-2-9b-it';
      }
      return this.openRouterClient(cleanOpenRouterId);
    }

    // 3. OpenAI
    if (provider === 'openai' && this.openaiClient) {
      return this.openaiClient(targetId);
    }

    // 4. Custom / Ollama / Local
    if (provider === 'custom' && this.customClient) {
      return this.customClient(targetId);
    }

    // Universal Fallbacks if requested client is not configured
    if (this.googleClient) {
      let cleanId = targetId.startsWith('google/') ? targetId.substring(7) : targetId;
      if (cleanId.startsWith('gemma') || cleanId.includes('gemini')) {
        return this.googleClient(cleanId);
      }
    }
    if (this.openRouterClient) {
      let cleanOpenRouterId = targetId;
      if (cleanOpenRouterId.startsWith('gemma-')) {
        cleanOpenRouterId = `google/${cleanOpenRouterId}`;
      }
      return this.openRouterClient(cleanOpenRouterId);
    }
    if (this.googleClient) {
      return this.googleClient('gemini-3.8-flash');
    }
    if (this.openaiClient) {
      return this.openaiClient('gpt-4o-mini');
    }
    if (this.customClient) {
      return this.customClient(targetId);
    }

    throw new Error(
      `Aucun fournisseur LLM configuré pour "${targetId}". Veuillez renseigner votre clé API OpenRouter, Google Gemini ou OpenAI dans les paramètres du cockpit.`
    );
  }

  /**
   * Liste des modèles avec leur disponibilité réelle. Pour chaque fournisseur configuré,
   * on croise le catalogue avec la liste live récupérée chez le fournisseur (P2-3) :
   * un modèle n'est marqué `available: true` que s'il est à la fois configuré (clé
   * présente) ET listé par le fournisseur au moment de l'appel. Si la vérification live
   * échoue (réseau indisponible), on se replie sur l'ancienne heuristique pour ne pas
   * bloquer le cockpit.
   */
  async getAvailableModels(): Promise<ModelProviderInfo[]> {
    this.refreshClientsIfChanged();
    const settings = configStore.getRawSettings();

    const providersUsed = Array.from(new Set(settings.models.map(m => m.provider)));
    const liveByProvider = new Map<string, Set<string> | null>();
    await Promise.all(
      providersUsed.map(async p => {
        if (this.isProviderAvailable(p)) {
          liveByProvider.set(p, await this.getLiveModelIds(p));
        } else {
          liveByProvider.set(p, null);
        }
      })
    );

    return settings.models.map(m => {
      const providerConfigured = this.isProviderAvailable(m.provider);
      const liveIds = liveByProvider.get(m.provider);
      const available = providerConfigured && (liveIds ? liveIds.has(m.id) : true);
      return {
        id: m.id,
        name: m.name,
        provider: m.provider,
        description: m.description || '',
        available,
        isCustom: m.isCustom || false,
        category: m.category,
      };
    });
  }

  /**
   * Valide un identifiant de modèle par un véritable appel de connectivité avant
   * acceptation (P0-3 : "aucune acceptation aveugle d'un modèle personnalisé").
   * Renvoie { valid: true } ou { valid: false, error } avec le message du fournisseur.
   */
  async validateModel(modelId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const { generateText } = await import('ai');
      const model = this.getModel(modelId);
      await generateText({ model, prompt: 'Réponds uniquement "OK".', maxOutputTokens: 5 });
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err?.message || 'Modèle inaccessible.' };
    }
  }
}

export const modelGateway = new ModelGateway();
