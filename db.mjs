import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {createHash,randomBytes} from 'node:crypto';
process.umask(0o077);
const dir=process.env.CHAT_DATA||join(homedir(),'.littlerip-chat');
mkdirSync(dir,{recursive:true,mode:0o700});
// Never read the private chat database.
export const db=new DatabaseSync(join(dir,'christmas.sqlite'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS guests(id INTEGER PRIMARY KEY AUTOINCREMENT, digest TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS answers(id INTEGER PRIMARY KEY AUTOINCREMENT, guest INTEGER NOT NULL, answer TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS by_guest ON answers(guest,ts);
BEGIN IMMEDIATE;
CREATE TABLE IF NOT EXISTS entrants(number INTEGER PRIMARY KEY, guest INTEGER NOT NULL UNIQUE);
INSERT INTO entrants(guest) SELECT a.guest FROM answers a
 WHERE NOT EXISTS (SELECT 1 FROM entrants e WHERE e.guest=a.guest)
 GROUP BY a.guest ORDER BY MIN(a.id);
CREATE TRIGGER IF NOT EXISTS number_first_answer AFTER INSERT ON answers
 WHEN NOT EXISTS (SELECT 1 FROM entrants WHERE guest=NEW.guest)
 BEGIN INSERT INTO entrants(guest) VALUES (NEW.guest); END;
COMMIT;`);
export const hash=s=>createHash('sha256').update(s).digest('hex');
export function joinBoard(){const secret=randomBytes(32).toString('base64url');const id=Number(db.prepare('INSERT INTO guests(digest) VALUES (?)').run(hash(secret)).lastInsertRowid);return {id,secret};}
