import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Cpu, 
  Sliders, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Loader2, 
  Sparkles, 
  Save, 
  ShieldCheck,
  Server,
  Zap,
  Check,
  Search
} from 'lucide-react';
import { type ModelOption } from './ai-elements';
import { authHeaders, type AuthSession } from '../lib/auth';

interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  enabled?: boolean;
}

interface AIModelDefinition {
  id: string;
  name: string;
  provider: 'google' | 'openai' | 'openrouter' | 'anthropic' | 'custom';
  description?: string;
  enabled: boolean;
  isCustom?: boolean;
  category?: string;
  contextWindow?: number;
}

interface AISettings {
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
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  authSession: AuthSession;
  onModelsUpdated?: (models: ModelOption[], activeModel: string) => void;
  onUnauthorized?: () => void;
}

export function SettingsModal({ isOpen, onClose, authSession, onModelsUpdated, onUnauthorized }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'models' | 'providers' | 'add_custom' | 'dashboard'>('models');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // P3 : config du modèle utilisé par l'assistant Horizon AI flottant du dashboard admin
  const [dashboardConfig, setDashboardConfig] = useState<{ primaryModel: string; secondaryModel: string }>({ primaryModel: '', secondaryModel: '' });
  const [dashboardSaving, setDashboardSaving] = useState(false);
  const [dashboardStatus, setDashboardStatus] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState<AISettings>({
    providers: {
      google: { apiKey: '', enabled: true },
      openai: { apiKey: '', baseURL: '', enabled: false },
      openrouter: { apiKey: '', baseURL: 'https://openrouter.ai/api/v1', enabled: false },
      anthropic: { apiKey: '', baseURL: '', enabled: false },
      custom: { apiKey: '', baseURL: '', enabled: false },
    },
    models: [],
    activeModel: 'gemini-3.8-flash',
    defaultTemperature: 0.2,
  });

  // Password visibility
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({
    google: false,
    openai: false,
    openrouter: false,
    custom: false,
  });

  // Formulaire d'ajout libre
  const [customForm, setCustomForm] = useState<{
    id: string;
    name: string;
    provider: 'google' | 'openai' | 'openrouter' | 'anthropic' | 'custom';
    description: string;
  }>({
    id: '',
    name: '',
    provider: 'openrouter',
    description: '',
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/models', { headers: authHeaders(authSession) });
      if (res.status === 401) { onUnauthorized?.(); return; }
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
      // P3 : charge aussi la config du modèle dashboard
      try {
        const cfgRes = await fetch('/api/config/dashboard-model', { headers: authHeaders(authSession) });
        if (cfgRes.status === 401) { onUnauthorized?.(); return; }
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          setDashboardConfig({ primaryModel: cfg.primaryModel || '', secondaryModel: cfg.secondaryModel || '' });
        }
      } catch {}
    } catch (e) {
      console.error('Erreur chargement paramètres:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDashboard = async () => {
    setDashboardSaving(true);
    setDashboardStatus(null);
    try {
      const res = await fetch('/api/config/dashboard-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(authSession) },
        body: JSON.stringify(dashboardConfig),
      });
      if (res.status === 401) { onUnauthorized?.(); return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setDashboardStatus('✅ Modèles Ahizan AI configurés !');
        setTimeout(() => setDashboardStatus(null), 3000);
      } else {
        setDashboardStatus(`❌ Erreur: ${data.error || 'Échec'}`);
      }
    } catch (err: any) {
      setDashboardStatus(`❌ Erreur: ${err.message}`);
    } finally {
      setDashboardSaving(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      setTestResult(null);
      setSaveStatus(null);
    }
  }, [isOpen]);

  const handleSave = async (updatedSettingsOverride?: AISettings) => {
    const payload = updatedSettingsOverride || settings;
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/settings/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(authSession) },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { onUnauthorized?.(); return; }
      const data = await res.json();
      if (res.ok) {
        setSaveStatus('✅ Paramètres enregistrés avec succès !');
        if (data.settings) setSettings(data.settings);
        if (data.models && onModelsUpdated) {
          onModelsUpdated(data.models, payload.activeModel);
        }
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus(`❌ Erreur: ${data.error || 'Impossible d\'enregistrer'}`);
      }
    } catch (err: any) {
      setSaveStatus(`❌ Erreur: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (modelIdToTest?: string) => {
    const target = modelIdToTest || settings.activeModel;
    setTestLoading(true);
    setTestResult(null);
    try {
      await fetch('/api/settings/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(authSession) },
        body: JSON.stringify(settings),
      });

      const res = await fetch('/api/settings/models/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(authSession) },
        body: JSON.stringify({ modelId: target }),
      });
      if (res.status === 401) { onUnauthorized?.(); return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Connexion validée avec succès pour "${target}"`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Échec de communication avec le modèle sélectionné.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Erreur réseau : ${err.message}`,
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleAddCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.id.trim() || !customForm.name.trim()) return;

    const added: AIModelDefinition = {
      id: customForm.id.trim(),
      name: customForm.name.trim(),
      provider: customForm.provider,
      description: customForm.description.trim() || `Modèle personnalisé (${customForm.provider})`,
      enabled: true,
      isCustom: true,
    };

    const updatedModels = [...settings.models.filter(m => m.id !== added.id), added];
    const newSettings: AISettings = {
      ...settings,
      models: updatedModels,
      activeModel: added.id,
    };

    setSettings(newSettings);
    handleSave(newSettings);
    setCustomForm({ id: '', name: '', provider: 'openrouter', description: '' });
    setActiveTab('models');
  };

  const handleDeleteModel = (id: string) => {
    const filtered = settings.models.filter(m => m.id !== id);
    const newActive = settings.activeModel === id ? (filtered[0]?.id || 'gemini-2.5-flash') : settings.activeModel;
    const newSettings: AISettings = {
      ...settings,
      models: filtered,
      activeModel: newActive,
    };
    setSettings(newSettings);
    handleSave(newSettings);
  };

  const filteredModels = settings.models.filter(m => 
    m.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
    m.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
    m.provider.toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b1120] border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                Paramètres & Choix Libre des Modèles IA
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Configurez librement vos clés API et utilisez n'importe quel modèle (Gemma, Claude, GPT, DeepSeek...)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors ml-2"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800/80 bg-slate-950/20 px-3 sm:px-5 gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'models'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Catalogue & Choix du Modèle</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('providers')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'providers'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Fournisseurs & Clés API</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add_custom')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'add_custom'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter Modèle Personnalisé</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'dashboard'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Ahizan AI (Dashboard)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              <span className="text-xs">Chargement des modèles...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: CATALOGUE ET SÉLECTION DU MODÈLE */}
              {activeTab === 'models' && (
                <div className="space-y-4 text-xs">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Filtrer parmi les modèles (ex: Gemma, Claude, GPT, DeepSeek...)"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* List of Models */}
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {filteredModels.map(m => {
                      const isSelected = settings.activeModel === m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            setSettings({ ...settings, activeModel: m.id });
                            handleSave({ ...settings, activeModel: m.id });
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                            isSelected
                              ? 'bg-sky-950/40 border-sky-500 text-white shadow-sm'
                              : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2 font-bold text-xs">
                              <span className="truncate">{m.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-mono shrink-0">
                                {m.provider}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-sky-500 text-slate-950 font-bold rounded flex items-center gap-1 shrink-0">
                                  <Check className="w-3 h-3" /> Actif
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">{m.id}</div>
                            {m.description && (
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">{m.description}</div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {m.isCustom && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteModel(m.id);
                                }}
                                className="p-1.5 hover:text-rose-400 text-slate-500 rounded hover:bg-slate-800"
                                title="Supprimer ce modèle"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Temperature slider */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-slate-300 font-semibold">
                        Température : <span className="font-mono text-sky-400">{settings.defaultTemperature}</span>
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {settings.defaultTemperature <= 0.2 ? '🎯 Rigueur analytique' : settings.defaultTemperature <= 0.7 ? '⚖️ Équilibré' : '🎨 Créativité'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.defaultTemperature}
                      onChange={(e) => setSettings({ ...settings, defaultTemperature: parseFloat(e.target.value) })}
                      className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />
                  </div>

                  {/* Test active model */}
                  <div>
                    <button
                      type="button"
                      onClick={() => handleTestConnection(settings.activeModel)}
                      disabled={testLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl font-semibold transition-all"
                    >
                      {testLoading ? <Loader2 className="w-4 h-4 animate-spin text-sky-400" /> : <Zap className="w-4 h-4 text-amber-400" />}
                      <span>Tester la connectivité du modèle sélectionné ({settings.activeModel})</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: CLÉS API ET FOURNISSEURS */}
              {activeTab === 'providers' && (
                <div className="space-y-3.5 text-xs">
                  {/* OpenRouter (Gemma, Claude, DeepSeek, Llama, Mistral) */}
                  <div className="p-3.5 bg-slate-900/80 border border-purple-500/20 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-[10px]">
                          OR
                        </div>
                        <div>
                          <span className="font-bold text-slate-200">OpenRouter API</span>
                          <span className="text-[10px] text-slate-400 block">Donne accès à Gemma 4 31B, Claude 3.7, DeepSeek R1, Llama 3.3...</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {settings.providers.openrouter.apiKey ? 'Configuré' : 'Non renseigné'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showKeys.openrouter ? 'text' : 'password'}
                        placeholder="sk-or-v1-..."
                        value={settings.providers.openrouter.apiKey || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          providers: {
                            ...settings.providers,
                            openrouter: { ...settings.providers.openrouter, apiKey: e.target.value }
                          }
                        })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-9 py-2 text-slate-200 font-mono text-[11px] outline-none focus:border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys({ ...showKeys, openrouter: !showKeys.openrouter })}
                        className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                      >
                        {showKeys.openrouter ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Google Gemini API */}
                  <div className="p-3.5 bg-slate-900/80 border border-sky-500/20 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px]">
                          G
                        </div>
                        <span className="font-bold text-slate-200">Google AI Studio (Gemini 2.5 & Gemma 2 / 3 Direct)</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {settings.providers.google.apiKey ? 'Configuré' : 'Non renseigné'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showKeys.google ? 'text' : 'password'}
                        placeholder="AIzaSy..."
                        value={settings.providers.google.apiKey || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          providers: {
                            ...settings.providers,
                            google: { ...settings.providers.google, apiKey: e.target.value }
                          }
                        })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-9 py-2 text-slate-200 font-mono text-[11px] outline-none focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys({ ...showKeys, google: !showKeys.google })}
                        className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                      >
                        {showKeys.google ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* OpenAI API */}
                  <div className="p-3.5 bg-slate-900/80 border border-emerald-500/20 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                          OA
                        </div>
                        <span className="font-bold text-slate-200">OpenAI (GPT-4o, o3-mini...)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {settings.providers.openai.apiKey ? 'Configuré' : 'Optionnel'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showKeys.openai ? 'text' : 'password'}
                        placeholder="sk-proj-..."
                        value={settings.providers.openai.apiKey || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          providers: {
                            ...settings.providers,
                            openai: { ...settings.providers.openai, apiKey: e.target.value }
                          }
                        })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-9 py-2 text-slate-200 font-mono text-[11px] outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys({ ...showKeys, openai: !showKeys.openai })}
                        className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                      >
                        {showKeys.openai ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Custom Endpoint / Ollama / Local Server */}
                  <div className="p-3.5 bg-slate-900/80 border border-amber-500/20 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                          <Server className="w-3 h-3" />
                        </div>
                        <span className="font-bold text-slate-200">Passerelle Personnalisée (Ollama / Local LLM)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        OpenAI Compatible
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="URL de base (ex: http://localhost:11434/v1)"
                        value={settings.providers.custom.baseURL || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          providers: {
                            ...settings.providers,
                            custom: { ...settings.providers.custom, baseURL: e.target.value }
                          }
                        })}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-[11px] outline-none focus:border-amber-500"
                      />
                      <div className="relative">
                        <input
                          type={showKeys.custom ? 'text' : 'password'}
                          placeholder="Clé API (ou 'ollama')"
                          value={settings.providers.custom.apiKey || ''}
                          onChange={(e) => setSettings({
                            ...settings,
                            providers: {
                              ...settings.providers,
                              custom: { ...settings.providers.custom, apiKey: e.target.value }
                            }
                          })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-9 py-2 text-slate-200 font-mono text-[11px] outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeys({ ...showKeys, custom: !showKeys.custom })}
                          className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                        >
                          {showKeys.custom ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AJOUTER N'IMPORTE QUEL MODÈLE */}
              {activeTab === 'add_custom' && (
                <div className="space-y-4 text-xs">
                  <form onSubmit={handleAddCustomModel} className="p-4 bg-slate-900/90 border border-sky-500/30 rounded-2xl space-y-3 shadow-lg">
                    <div className="flex items-center gap-2 font-bold text-sky-400">
                      <Sparkles className="w-4 h-4" />
                      <span>Ajouter n'importe quel modèle IA (Gemma 4 31B, Claude, Llama, Ollama...)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1 font-medium">Nom d'affichage</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Gemma 4 31B Custom"
                          value={customForm.name}
                          onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1 font-medium">ID Technique du modèle</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: google/gemma-4-31b"
                          value={customForm.id}
                          onChange={(e) => setCustomForm({ ...customForm, id: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono text-[11px] outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1 font-medium">Fournisseur</label>
                        <select
                          value={customForm.provider}
                          onChange={(e) => setCustomForm({ ...customForm, provider: e.target.value as any })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                        >
                          <option value="openrouter">OpenRouter (Prend en charge tous les modèles)</option>
                          <option value="google">Google Gemini</option>
                          <option value="openai">OpenAI Direct</option>
                          <option value="custom">Passerelle Personnalisée / Ollama</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1 font-medium">Description (optionnelle)</label>
                        <input
                          type="text"
                          placeholder="Ex: Raisonnement et audit catalogue"
                          value={customForm.description}
                          onChange={(e) => setCustomForm({ ...customForm, description: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-slate-400">Modèles recommandés en 1 clic :</div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCustomForm({
                            id: 'gemma-2-27b-it',
                            name: 'Google Gemma 2 27B (Google Direct)',
                            provider: 'google',
                            description: 'Gemma 2 27B connecté directement avec votre clé Google API',
                          })}
                          className="px-2.5 py-1 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-500/40 text-sky-300 rounded-lg text-[10px] font-mono transition-colors"
                        >
                          + Gemma 2 27B (Google API)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomForm({
                            id: 'gemma-2-9b-it',
                            name: 'Google Gemma 2 9B (Google Direct)',
                            provider: 'google',
                            description: 'Gemma 2 9B rapide connecté avec votre clé Google API',
                          })}
                          className="px-2.5 py-1 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-500/40 text-sky-300 rounded-lg text-[10px] font-mono transition-colors"
                        >
                          + Gemma 2 9B (Google API)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomForm({
                            id: 'google/gemma-4-31b',
                            name: 'Gemma 4 31B (OpenRouter)',
                            provider: 'openrouter',
                            description: 'Gemma 4 31B haute capacité via OpenRouter',
                          })}
                          className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 rounded-lg text-[10px] font-mono transition-colors"
                        >
                          + Gemma 4 31B (OpenRouter)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomForm({
                            id: 'deepseek/deepseek-r1',
                            name: 'DeepSeek R1 (OpenRouter)',
                            provider: 'openrouter',
                            description: 'Raisonnement profond étape par étape',
                          })}
                          className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 rounded-lg text-[10px] font-mono transition-colors"
                        >
                          + DeepSeek R1
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomForm({
                            id: 'anthropic/claude-3.7-sonnet',
                            name: 'Claude 3.7 Sonnet (OpenRouter)',
                            provider: 'openrouter',
                            description: 'Claude 3.7 hybride avec mode de réflexion',
                          })}
                          className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 rounded-lg text-[10px] font-mono transition-colors"
                        >
                          + Claude 3.7
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-sky-950/20 border border-sky-500/20 rounded-xl text-[11px] text-slate-300">
                      💡 <strong>Astuce</strong> : Vous pouvez connecter les modèles <strong>Gemma</strong> soit directement avec votre clé <strong>Google AI Studio</strong> (ex: <code>gemma-2-27b-it</code>), soit via <strong>OpenRouter</strong> (ex: <code>google/gemma-4-31b</code>).
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Enregistrer et activer ce modèle immédiatement</span>
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 4: HORIZON AI (DASHBOARD ADMIN) */}
              {activeTab === 'dashboard' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-slate-900/80 border border-sky-500/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Server className="w-4 h-4 text-sky-400" />
                      <span className="font-bold text-slate-200">Assistant Ahizan AI du Dashboard Admin</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Configurez les modèles utilisés par l'assistant <strong>Ahizan AI</strong> flottant dans le
                      dashboard administrateur Vendure (<code className="text-sky-400">administrator.ahizan.com</code>).
                      L'assistant utilise d'abord le <strong>modèle prioritaire</strong>, puis le <strong>modèle secondaire</strong>
                      si le premier est indisponible. Les clés API de ces modèles sont configurées dans l'onglet « Fournisseurs ».
                    </p>

                    <div className="space-y-2.5 pt-1">
                      <label className="block text-slate-400 text-[11px] font-medium">Modèle prioritaire</label>
                      <select
                        value={dashboardConfig.primaryModel}
                        onChange={e => setDashboardConfig({ ...dashboardConfig, primaryModel: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                      >
                        <option value="">— Modèle par défaut ({settings.activeModel}) —</option>
                        {settings.models.filter(m => m.enabled).map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2.5">
                      <label className="block text-slate-400 text-[11px] font-medium">Modèle secondaire (repli)</label>
                      <select
                        value={dashboardConfig.secondaryModel}
                        onChange={e => setDashboardConfig({ ...dashboardConfig, secondaryModel: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                      >
                        <option value="">— Aucun —</option>
                        {settings.models.filter(m => m.enabled).map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveDashboard}
                      disabled={dashboardSaving}
                      className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20"
                    >
                      {dashboardSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Enregistrer la configuration Ahizan AI</span>
                    </button>

                    {dashboardStatus && (
                      <div className="p-2.5 rounded-lg border text-[11px] bg-slate-950 border-slate-700 text-slate-300">
                        {dashboardStatus}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status / Feedback Banner */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2 text-xs animate-in fade-in duration-200 ${
                    testResult.success
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="leading-tight">{testResult.message}</div>
                </div>
              )}

              {saveStatus && (
                <div className="p-3 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl text-xs">
                  {saveStatus}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-950/50 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 truncate hidden xs:block">
            Modèle actif : <span className="text-sky-400 font-mono font-bold">{settings.activeModel}</span>
          </div>

          <div className="flex items-center gap-2 w-full xs:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-sky-500/20"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Sauvegarder</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
