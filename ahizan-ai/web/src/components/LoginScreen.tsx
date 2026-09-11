import React, { useState } from 'react';
import { Bot, Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { login, type AuthSession } from '../lib/auth';

interface LoginScreenProps {
  onSuccess: (session: AuthSession) => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const session = await login(username.trim(), password);
      onSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] w-screen items-center justify-center bg-[#070a11] text-slate-100 px-4">
      <div className="w-full max-w-sm bg-[#0b1120] border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Ahizan AI</h1>
            <p className="text-xs text-slate-400 mt-1">
              Connectez-vous avec vos identifiants Administrateur Ahizan pour accéder au cockpit.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              autoFocus
              placeholder="Identifiant"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500"
            />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-semibold rounded-xl transition-all text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Se connecter</span>
          </button>
        </form>

        <p className="text-[11px] text-slate-500 text-center">
          Vos identifiants sont vérifiés directement auprès de l'API Admin Vendure Ahizan.
          Aucun accès n'est possible sans compte administrateur valide.
        </p>
      </div>
    </div>
  );
}
