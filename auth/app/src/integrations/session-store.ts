import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 1 dia

function getSessionFile(): string {
  return path.resolve(process.cwd(), env.sessionsFile);
}

interface SessionData {
  appSession: string;
  expiresAt: string; // ISO 8601
}

type SessionStore = { [email: string]: SessionData };

function readStore(): SessionStore {
  const file = getSessionFile();
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as SessionStore;
  } catch {
    return {};
  }
}

function writeStore(store: SessionStore): void {
  const file = getSessionFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Retorna o appSession armazenado se existir e ainda não tiver expirado.
 * Retorna null se não existir ou se estiver expirado.
 */
export function getValidSession(email: string): string | null {
  const store = readStore();
  const entry = store[email];
  if (!entry) return null;

  const isExpired = new Date(entry.expiresAt) <= new Date();
  if (isExpired) return null;

  return entry.appSession;
}

/**
 * Salva (ou atualiza) a sessão do usuário com validade de 1 dia a partir de agora.
 */
export function saveSession(email: string, appSession: string): void {
  const store = readStore();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  store[email] = { appSession, expiresAt };
  writeStore(store);
}
