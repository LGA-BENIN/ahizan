/**
 * Persistance server-side des conversations Ahizan AI (P2-3).
 * Utilise node:sqlite (intégré à Node 22, pas de dépendance externe).
 * Les conversations sont liées au compte utilisateur Vendure, pas au navigateur :
 * elles se synchronisent entre tous les appareils connectés au même compte.
 */
import path from 'path';
import fs from 'fs';

// node:sqlite est expérimental dans Node 22 — pas de types TS officiels.
// On déclare un type minimal et on utilise require pour charger le module.
const _sqlite = require('node:sqlite');
const DatabaseSync = _sqlite.DatabaseSync as new (path: string) => {
  exec(sql: string): void;
  prepare(sql: string): { run(...params: any[]): any; get(...params: any[]): any; all(...params: any[]): any[] };
};

export interface StoredConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  parts: string | null; // JSON stringifié des parts (tool calls, etc.)
  createdAt: number;
}

class ConversationStore {
  private db: InstanceType<typeof DatabaseSync>;

  constructor() {
    const dataDir = process.env.AHIZAN_AI_DATA_DIR || path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, 'conversations.db');
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'Nouvelle discussion',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        parts TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        selected_model TEXT,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
    `);
    console.log('[ConversationStore] SQLite initialisé:', dbPath);
  }

  // --- Conversations ---

  listConversations(userId: string): StoredConversation[] {
    const rows = this.db.prepare(
      'SELECT id, user_id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC'
    ).all(userId) as any[];
    return rows.map(r => ({
      id: r.id, userId: r.user_id, title: r.title,
      createdAt: r.created_at, updatedAt: r.updated_at,
    }));
  }

  getConversation(userId: string, convId: string): StoredConversation | null {
    const row = this.db.prepare(
      'SELECT id, user_id, title, created_at, updated_at FROM conversations WHERE id = ? AND user_id = ?'
    ).get(convId, userId) as any;
    if (!row) return null;
    return {
      id: row.id, userId: row.user_id, title: row.title,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }

  createConversation(userId: string, convId: string, title: string = 'Nouvelle discussion'): StoredConversation {
    const now = Date.now();
    this.db.prepare(
      'INSERT OR REPLACE INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(convId, userId, title, now, now);
    return { id: convId, userId, title, createdAt: now, updatedAt: now };
  }

  updateConversationTitle(userId: string, convId: string, title: string): void {
    this.db.prepare(
      'UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?'
    ).run(title, Date.now(), convId, userId);
  }

  touchConversation(userId: string, convId: string): void {
    this.db.prepare(
      'UPDATE conversations SET updated_at = ? WHERE id = ? AND user_id = ?'
    ).run(Date.now(), convId, userId);
  }

  deleteConversation(userId: string, convId: string): void {
    this.db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(convId);
    this.db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(convId, userId);
  }

  // --- Messages ---

  getMessages(userId: string, convId: string): StoredMessage[] {
    // Vérifie que la conversation appartient bien à l'utilisateur
    const conv = this.getConversation(userId, convId);
    if (!conv) return [];
    const rows = this.db.prepare(
      'SELECT id, conversation_id, role, content, parts, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(convId) as any[];
    return rows.map(r => ({
      id: r.id, conversationId: r.conversation_id, role: r.role,
      content: r.content, parts: r.parts, createdAt: r.created_at,
    }));
  }

  addMessage(convId: string, role: string, content: string, parts?: any): void {
    const id = `${convId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.db.prepare(
      'INSERT INTO messages (id, conversation_id, role, content, parts, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, convId, role, content, parts ? JSON.stringify(parts) : null, Date.now());
  }

  // --- User settings (modèle sélectionné) ---

  getUserModel(userId: string): string | null {
    const row = this.db.prepare(
      'SELECT selected_model FROM user_settings WHERE user_id = ?'
    ).get(userId) as any;
    return row?.selected_model || null;
  }

  setUserModel(userId: string, model: string): void {
    this.db.prepare(
      'INSERT OR REPLACE INTO user_settings (user_id, selected_model, updated_at) VALUES (?, ?, ?)'
    ).run(userId, model, Date.now());
  }
}

export const conversationStore = new ConversationStore();
