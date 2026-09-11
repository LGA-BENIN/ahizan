// Authentification du cockpit Ahizan AI (voir docs/roadmap-produit.md, ticket P1-1).
// Le cockpit ne fait plus confiance à un rôle déclaré par le client : chaque
// administrateur se connecte avec ses propres identifiants Vendure Admin, et le
// serveur dérive le rôle réel depuis le backend à chaque requête.

const STORAGE_KEY = 'ahizan_ai_session';

export interface AuthSession {
  token: string;
  identifier: string;
  isSuperAdmin: boolean;
}

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.token && parsed?.identifier) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Connexion refusée par Vendure.');
  }
  const session: AuthSession = { token: data.token, identifier: data.identifier, isSuperAdmin: !!data.isSuperAdmin };
  saveSession(session);
  return session;
}

/** En-tête à joindre à chaque appel authentifié vers l'API Ahizan AI. */
export function authHeaders(session: AuthSession | null): Record<string, string> {
  if (!session) return {};
  return { 'vendure-auth-token': session.token };
}
