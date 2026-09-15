import fs from 'fs';
import path from 'path';

export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  enabled?: boolean;
}

export interface AIModelDefinition {
  id: string;
  name: string;
  provider: 'google' | 'openai' | 'openrouter' | 'anthropic' | 'custom';
  description?: string;
  enabled: boolean;
  isCustom?: boolean;
  category?: 'gemma_google' | 'openai' | 'anthropic' | 'deepseek' | 'meta_llama' | 'mistral' | 'other';
  contextWindow?: number;
}

export interface AISettings {
  providers: {
    google: ProviderConfig;
    openai: ProviderConfig;
    openrouter: ProviderConfig;
    anthropic: ProviderConfig;
    custom: ProviderConfig;
  };
  models: AIModelDefinition[];
  activeModel: string;
  defaultTemperature: number;
  // P3 : modèle prioritaire et secondaire utilisés par l'assistant Horizon AI
  // flottant dans le dashboard admin Vendure (administrator.ahizan.com).
  dashboardPrimaryModel?: string;
  dashboardSecondaryModel?: string;
}

// NOTE IMPORTANTE (voir docs/roadmap-produit.md, ticket P0-3/P2-3) :
// ce catalogue "en dur" n'est qu'un ANCRAGE DE REPLI utilisé quand l'appel dynamique
// à l'API du fournisseur (ModelGateway.getAvailableModels) échoue (réseau, quota...).
// Chaque entrée ci-dessous a été vérifiée par un appel réel à l'API au moment de la
// rédaction (11/09/2026) via `ListModels` (Google) et `GET /api/v1/models` (OpenRouter).
// Les identifiants qui n'existaient plus (ex: gemma-2/3 direct sur l'API Google, Claude
// 3.7/3.5 Sonnet et Mistral Large 2411 sur OpenRouter) ont été retirés : ils renvoyaient
// tous une erreur "model not found" au moment du test. En fonctionnement normal, c'est la
// liste live récupérée par ModelGateway qui prévaut sur ce repli statique.
export const PRESET_MODELS_CATALOG: AIModelDefinition[] = [
  // --- Google Gemini (Google API Direct) ---
  {
    id: 'gemini-2.5-flash',
    name: 'Google Gemini 2.5 Flash',
    provider: 'google',
    description: 'Ultra-rapide, performant et économique pour la modération, analyse de produits et le dialogue réactif',
    category: 'gemma_google',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Google Gemini 2.5 Pro',
    provider: 'google',
    description: 'Raisonnement complexe et audit approfondi, haute intelligence multimodale',
    category: 'gemma_google',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Google Gemini 3.8 Flash',
    provider: 'google',
    description: 'Modèle Flash le plus intelligent de Google : ingénierie logicielle et agents autonomes complexes',
    category: 'gemma_google',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Google Gemini 3.5 Flash',
    provider: 'google',
    description: 'Performance frontière soutenue pour les tâches agentiques et de code',
    category: 'gemma_google',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Google Gemini 3.5 Flash-Lite',
    provider: 'google',
    description: 'Modèle ultra-léger et rapide',
    category: 'gemma_google',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Google Gemini 3.1 Pro (Preview)',
    provider: 'google',
    description: 'Raisonnement complexe et audit approfondi, dernière génération Pro',
    category: 'gemma_google',
    enabled: true,
    isCustom: false,
  },

  // --- Google Gemma (Google API Direct) ---
  {
    id: 'gemma-4-31b-it',
    name: 'Google Gemma 4 31B Instruct (Google API Direct)',
    provider: 'google',
    description: 'Modèle Gemma 4 31B officiel connecté directement via votre clé Google AI Studio',
    category: 'gemma_google',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'gemma-4-26b-a4b-it',
    name: 'Google Gemma 4 26B A4B (Google API Direct)',
    provider: 'google',
    description: 'Modèle Gemma 4 26B (Mixture-of-Experts) connecté directement via votre clé Google AI Studio',
    category: 'gemma_google',
    enabled: true,
    isCustom: false,
  },

  // --- OpenRouter : Gemma, DeepSeek, Llama ---
  {
    id: 'google/gemma-2-27b-it',
    name: 'Gemma 2 27B (via OpenRouter)',
    provider: 'openrouter',
    description: 'Modèle Open-Weight de Google accessible via votre clé OpenRouter',
    category: 'gemma_google',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1 (Raisonnement Pur)',
    provider: 'openrouter',
    description: 'Raisonnement étape par étape ultra-performant pour les audits complexes',
    category: 'deepseek',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'openrouter',
    description: 'Modèle rapide, intelligent et très économique',
    category: 'deepseek',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Meta Llama 3.3 70B Instruct',
    provider: 'openrouter',
    description: 'Puissant modèle open source 70B',
    category: 'meta_llama',
    enabled: true,
    isCustom: false,
  },

  // --- OpenAI ---
  {
    id: 'gpt-4o',
    name: 'OpenAI GPT-4o',
    provider: 'openai',
    description: 'Modèle phare multimodal d\'OpenAI',
    category: 'openai',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    provider: 'openai',
    description: 'Léger, rapide et polyvalent',
    category: 'openai',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'o3-mini',
    name: 'OpenAI o3-mini (Reasoning)',
    provider: 'openai',
    description: 'Modèle de raisonnement STEM et logique d\'OpenAI',
    category: 'openai',
    enabled: true,
    isCustom: false,
  },
];

export class ConfigStore {
  private configPath: string;
  private settings: AISettings;

  constructor() {
    const configDir = path.resolve(__dirname, '../../config');
    if (!fs.existsSync(configDir)) {
      try {
        fs.mkdirSync(configDir, { recursive: true });
      } catch (e) {
        console.warn('[ConfigStore] Could not create config dir:', e);
      }
    }
    this.configPath = path.join(configDir, 'ai-settings.json');
    this.settings = this.loadSettings();
  }

  private loadSettings(): AISettings {
    let saved: Partial<AISettings> = {};
    if (fs.existsSync(this.configPath)) {
      try {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        saved = JSON.parse(raw);
      } catch (e) {
        console.error('[ConfigStore] Failed to read ai-settings.json:', e);
      }
    }

    const googleKey = saved.providers?.google?.apiKey || process.env.GEMINI_API_KEY || '';
    const openaiKey = saved.providers?.openai?.apiKey || process.env.OPENAI_API_KEY || '';
    const openrouterKey = saved.providers?.openrouter?.apiKey || process.env.OPENROUTER_API_KEY || process.env.DEEPSEEK_API_KEY || '';
    const anthropicKey = saved.providers?.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY || '';
    const customKey = saved.providers?.custom?.apiKey || process.env.CUSTOM_AI_API_KEY || '';
    const customBaseURL = saved.providers?.custom?.baseURL || process.env.CUSTOM_AI_BASE_URL || '';

    // Merge default models with saved models.
    // IMPORTANT : seuls les modèles explicitement ajoutés à la main (isCustom === true)
    // sont conservés depuis le fichier sauvegardé. Un modèle preset qui a disparu du
    // catalogue courant (ex: retiré parce qu'il n'existe plus chez le fournisseur) ne
    // doit PAS ressusciter simplement parce qu'il traîne dans un ancien ai-settings.json.
    const modelMap = new Map<string, AIModelDefinition>();
    PRESET_MODELS_CATALOG.forEach(m => modelMap.set(m.id, m));
    if (saved.models && saved.models.length > 0) {
      saved.models.forEach(m => {
        if (m.isCustom) {
          modelMap.set(m.id, m);
        } else if (modelMap.has(m.id)) {
          const preset = modelMap.get(m.id)!;
          modelMap.set(m.id, { ...preset, enabled: m.enabled ?? preset.enabled });
        }
        // sinon : ancien preset obsolète absent du catalogue courant -> ignoré
      });
    }

    return {
      providers: {
        google: {
          apiKey: googleKey,
          enabled: saved.providers?.google?.enabled ?? !!googleKey,
        },
        openai: {
          apiKey: openaiKey,
          baseURL: saved.providers?.openai?.baseURL || process.env.OPENAI_BASE_URL || '',
          enabled: saved.providers?.openai?.enabled ?? !!openaiKey,
        },
        openrouter: {
          apiKey: openrouterKey,
          baseURL: saved.providers?.openrouter?.baseURL || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
          enabled: saved.providers?.openrouter?.enabled ?? !!openrouterKey,
        },
        anthropic: {
          apiKey: anthropicKey,
          baseURL: saved.providers?.anthropic?.baseURL || process.env.ANTHROPIC_BASE_URL || '',
          enabled: saved.providers?.anthropic?.enabled ?? !!anthropicKey,
        },
        custom: {
          apiKey: customKey,
          baseURL: customBaseURL,
          enabled: saved.providers?.custom?.enabled ?? (!!customKey || !!customBaseURL),
        },
      },
      models: Array.from(modelMap.values()),
      activeModel: saved.activeModel || process.env.AHIZAN_AI_MODEL || 'gemini-2.5-flash',
      defaultTemperature: saved.defaultTemperature ?? 0.2,
    };
  }

  public getRawSettings(): AISettings {
    return this.settings;
  }

  public getMaskedSettings(): AISettings {
    const maskKey = (key?: string) => {
      if (!key) return '';
      if (key.length <= 8) return '••••••••';
      return `${key.slice(0, 4)}••••${key.slice(-4)}`;
    };

    return {
      ...this.settings,
      providers: {
        google: {
          ...this.settings.providers.google,
          apiKey: maskKey(this.settings.providers.google.apiKey),
        },
        openai: {
          ...this.settings.providers.openai,
          apiKey: maskKey(this.settings.providers.openai.apiKey),
        },
        openrouter: {
          ...this.settings.providers.openrouter,
          apiKey: maskKey(this.settings.providers.openrouter.apiKey),
        },
        anthropic: {
          ...this.settings.providers.anthropic,
          apiKey: maskKey(this.settings.providers.anthropic.apiKey),
        },
        custom: {
          ...this.settings.providers.custom,
          apiKey: maskKey(this.settings.providers.custom.apiKey),
        },
      },
    };
  }

  public saveSettings(newSettings: Partial<AISettings>): AISettings {
    const preserveOrUpdateKey = (newKey?: string, oldKey?: string) => {
      if (!newKey || newKey.includes('•')) return oldKey || '';
      return newKey.trim();
    };

    const updated: AISettings = {
      providers: {
        google: {
          ...this.settings.providers.google,
          ...newSettings.providers?.google,
          apiKey: preserveOrUpdateKey(newSettings.providers?.google?.apiKey, this.settings.providers.google.apiKey),
        },
        openai: {
          ...this.settings.providers.openai,
          ...newSettings.providers?.openai,
          apiKey: preserveOrUpdateKey(newSettings.providers?.openai?.apiKey, this.settings.providers.openai.apiKey),
        },
        openrouter: {
          ...this.settings.providers.openrouter,
          ...newSettings.providers?.openrouter,
          apiKey: preserveOrUpdateKey(newSettings.providers?.openrouter?.apiKey, this.settings.providers.openrouter.apiKey),
        },
        anthropic: {
          ...this.settings.providers.anthropic,
          ...newSettings.providers?.anthropic,
          apiKey: preserveOrUpdateKey(newSettings.providers?.anthropic?.apiKey, this.settings.providers.anthropic.apiKey),
        },
        custom: {
          ...this.settings.providers.custom,
          ...newSettings.providers?.custom,
          apiKey: preserveOrUpdateKey(newSettings.providers?.custom?.apiKey, this.settings.providers.custom.apiKey),
        },
      },
      models: newSettings.models || this.settings.models,
      activeModel: newSettings.activeModel || this.settings.activeModel,
      defaultTemperature: newSettings.defaultTemperature ?? this.settings.defaultTemperature,
      dashboardPrimaryModel: newSettings.dashboardPrimaryModel ?? this.settings.dashboardPrimaryModel,
      dashboardSecondaryModel: newSettings.dashboardSecondaryModel ?? this.settings.dashboardSecondaryModel,
    };

    this.settings = updated;

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(updated, null, 2), 'utf8');
      console.log('[ConfigStore] AI Settings successfully saved to', this.configPath);
    } catch (e) {
      console.error('[ConfigStore] Error saving AI Settings:', e);
    }

    return this.settings;
  }
}

export const configStore = new ConfigStore();
