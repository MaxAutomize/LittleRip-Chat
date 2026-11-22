import http from 'node:http';
import {readFileSync} from 'node:fs';
import {db,hash,joinBoard} from './db.mjs';
const assets=new Map([['/','index.html','text/html'],['/app.js','app.js','text/javascript'],['/style.css','style.css','text/css'],['/winter.svg','winter.svg','image/svg+xml']].map(([route,file,type])=>[route,[readFileSync(new URL('./public/'+file,import.meta.url)),type]]));
const origin=new URL(process.env.CHAT_ORIGIN||'http://localhost:8817').origin;
const secure=origin.startsWith('https:'),key=secure?'__Host-xmas':'xmas';
const fail=(code,msg)=>{throw Object.assign(Error(msg),{status:code})};
let minute=0, joins=0, posts=0;
async function readBody(req){
 if(req.headers['content-type']!=='application/json')fail(415,'Expected JSON.');
 const chunks=[];let size=0;
 for await(const c of req){size+=c.length;if(size>8000)fail(413,'Answer too long.');chunks.push(c);}
 try{return JSON.parse(Buffer.concat(chunks).toString())}catch{fail(400,'Invalid answer.');}
}
const app=http.createServer({requestTimeout:15000,headersTimeout:10000},async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Content-Security-Policy',"default-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 const json=(code,obj)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(obj));};
 try{
 const u=new URL(req.url,origin),p=u.pathname;
 if(secure&&req.method==='GET'&&req.headers.host==='www.'+new URL(origin).host){res.writeHead(302,{Location:origin+'/'});return res.end();}
 if(req.method==='GET'&&assets.has(p)){const [data,type]=assets.get(p);res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});return res.end(data);}
 if(req.method==='GET'&&p==='/api/answers'){
 const after=Number(u.searchParams.get('after')||0);if(!Number.isSafeInteger(after)||after<0)fail(400,'Invalid cursor.');
 return json(200,db.prepare('SELECT a.id,e.number AS guest,a.answer FROM answers a JOIN entrants e ON e.guest=a.guest WHERE a.id>? ORDER BY a.id LIMIT 100').all(after));
 }
 if(req.method!=='POST'||!['/api/join','/api/answers'].includes(p))fail(404,'Not found.');
 if(req.headers.origin!==origin)fail(403,'Origin not allowed.');
 const slot=Math.floor(Date.now()/60000);if(minute!==slot){minute=slot;joins=0;posts=0;}
 const secret=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(key+'='))?.slice(key.length+1);
 const guest=secret?.length===43&&db.prepare('SELECT g.id,e.number FROM guests g LEFT JOIN entrants e ON e.guest=g.id WHERE g.digest=?').get(hash(secret));
 if(p==='/api/join'){
 if(guest)return json(200,{id:guest.number});if(++joins>120)fail(429,'Please try again in a minute.');
 const g=joinBoard();res.setHeader('Set-Cookie',key+'='+g.secret+'; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000'+(secure?'; Secure':''));return json(200,{id:null});
 }
 if(!guest)fail(401,'Allow cookies and refresh to get your number.');
 const b=await readBody(req);const answer=typeof b?.answer==='string'?b.answer.trim():'';
 if(!answer||answer.length>1000)fail(400,'Write an answer between 1 and 1,000 characters.');
 const now=Date.now();
 if(posts>=120||db.prepare('SELECT 1 FROM answers WHERE guest=? AND ts>?').get(guest.id,now-5000))fail(429,'Please wait a moment before posting again.');
 db.prepare('INSERT INTO answers(guest,answer,ts) VALUES (?,?,?)').run(guest.id,answer,now);posts++;json(201,{ok:true,id:db.prepare('SELECT number FROM entrants WHERE guest=?').get(guest.id).number});
 }catch(e){if(!res.headersSent)json(e.status||500,{error:e.status?e.message:'Server error.'});}
});
app.listen(Number(process.env.PORT||8817),'127.0.0.1',()=>console.log('Listening on '+app.address().port));
