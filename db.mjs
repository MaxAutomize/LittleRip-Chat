import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes, createHash } from 'node:crypto';

process.umask(0o077);
export const dir = process.env.CHAT_DATA || join(homedir(), '.littlerip-chat');
mkdirSync(dir, { recursive:true, mode:0o700 });
export const db = new DatabaseSync(join(dir, 'chat.sqlite'));
db.exec(`
 PRAGMA busy_timeout=3000;
 PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS tickets(hash TEXT PRIMARY KEY, name TEXT NOT NULL, expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, name TEXT NOT NULL, expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS channels(name TEXT PRIMARY KEY);
 CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, channel TEXT REFERENCES channels(name), author TEXT NOT NULL, body TEXT NOT NULL, ts INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS history ON messages(channel,id);
 INSERT OR IGNORE INTO channels VALUES ('general'),('projects'),('off-topic');
`);
export const token = () => randomBytes(32).toString('base64url');
export const hash = value => createHash('sha256').update(value).digest('hex');
export function issue(name) {
 const secret = token();
 db.prepare('INSERT INTO tickets VALUES (?,?,?)').run(hash(secret), name, Date.now()+86400000);
 return secret;
}
