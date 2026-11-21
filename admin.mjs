import {db, issue} from './db.mjs';
const [cmd, name] = process.argv.slice(2);
if(!name || !/^[a-z0-9][a-z0-9_-]{0,31}$/.test(name)) throw Error('Supply a lowercase name, 1–32 letters, digits, dashes or underscores.');
if(cmd === 'invite') console.log(issue(name));
else if(cmd === 'channel') db.prepare('INSERT INTO channels VALUES (?)').run(name);
else if(cmd === 'revoke') {
 db.exec('BEGIN IMMEDIATE');
 for(const table of ['sessions','tickets']) db.prepare('DELETE FROM '+table+' WHERE name=?').run(name);
 db.exec('COMMIT');
} else throw Error('Usage: node admin.mjs invite|channel|revoke name');
