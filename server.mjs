import http from 'node:http';
import { readFileSync } from 'node:fs';
import { db, token, hash } from './db.mjs';

const assets = new Map([['/','index.html','text/html'],['/app.js','app.js','text/javascript'],['/style.css','style.css','text/css']].map(([route,file,mime])=>[route,[readFileSync(new URL('./public/'+file,import.meta.url)),mime]]));
const origin = new URL(process.env.CHAT_ORIGIN || 'http://localhost:8817').origin;
const secure = origin.startsWith('https:');
const key = secure ? '__Host-lrchat' : 'lrchat';
const cookie = (s,age) => key+'='+s+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+age+(secure?'; Secure':'');
const fail = (code,msg) => { throw Object.assign(Error(msg),{status:code}); };
async function body(req){
 if(req.headers['content-type']!=='application/json') fail(415,'Expected JSON.');
 let bytes=0, parts=[];
 for await(const part of req){bytes+=part.length;if(bytes>16000) fail(413,'Request too large.');parts.push(part);}
 try { const b=JSON.parse(Buffer.concat(parts));if(!b || typeof b!=='object')throw 0;return b; }catch{fail(400,'Invalid request.');}
}
const app = http.createServer({requestTimeout:15000,headersTimeout:10000},async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Content-Security-Policy',"default-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 const json = (code,x)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(x));};
 try {
 const u=new URL(req.url,origin), p=u.pathname;
 if(secure && req.method==='GET' && req.headers.host==='www.'+new URL(origin).host){res.writeHead(302,{Location:origin+'/'});return res.end();}
 if(req.method==='GET' && assets.has(p)){const [buf,type]=assets.get(p);res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});return res.end(buf);}
 if(req.method==='POST' && req.headers.origin!==origin) fail(403,'Origin not allowed.');
 if(p==='/api/login' && req.method==='POST'){
  const b=await body(req);
  if(typeof b.code!=='string'||b.code.length!==43) fail(403,'Invalid or expired code.');
  const row=db.prepare('DELETE FROM tickets WHERE hash=? AND expires>? RETURNING name').get(hash(b.code),Date.now());
  if(!row) fail(403,'Invalid or expired code.');
  const s=token();db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash(s),row.name,Date.now()+30*86400000);
  res.setHeader('Set-Cookie',cookie(s,30*86400));return json(200,{ok:true});
 }
 if(!['/api/me','/api/messages','/api/logout'].includes(p)) fail(404,'Not found.');
 const s=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(key+'='))?.slice(key.length+1)||'';
 const user=db.prepare('SELECT name FROM sessions WHERE hash=? AND expires>?').get(hash(s),Date.now());
 if(!user) fail(401,'Sign in with an invite code.');
 if(p==='/api/logout'&&req.method==='POST'){db.prepare('DELETE FROM sessions WHERE hash=?').run(hash(s));res.setHeader('Set-Cookie',cookie('',0));return json(200,{ok:true});}
 if(p==='/api/me'&&req.method==='GET')return json(200,{name:user.name,channels:db.prepare("SELECT name FROM channels ORDER BY name!='general',name").all().map(c=>c.name)});
 if(p!=='/api/messages')fail(405,'Method not allowed.');
 const channel=u.searchParams.get('channel');
 if(!db.prepare('SELECT 1 FROM channels WHERE name=?').get(channel))fail(404,'Unknown channel.');
 if(req.method==='GET')return json(200,db.prepare('SELECT id,author,body,ts FROM messages WHERE channel=? ORDER BY id DESC LIMIT 100').all(channel).reverse());
 if(req.method!=='POST')fail(405,'Method not allowed.');
 const b=await body(req);
 if(typeof b.body!=='string'||!b.body.trim()||b.body.length>2000)fail(400,'Messages must be 1–2000 characters.');
 const now=Date.now();
 if(db.prepare('SELECT 1 FROM messages WHERE author=? AND ts>? LIMIT 1').get(user.name,now-750))fail(429,'Please wait a moment.');
 db.prepare('INSERT INTO messages(channel,author,body,ts) VALUES (?,?,?,?)').run(channel,user.name,b.body.trim(),now);
 json(201,{ok:true});
 }catch(e){if(!res.headersSent)json(e.status||500,{error:e.status?e.message:'Server error.'});}
});
app.listen(Number(process.env.PORT||8817),'127.0.0.1',()=>console.log('Listening on '+app.address().port));
