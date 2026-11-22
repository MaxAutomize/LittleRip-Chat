import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('public numbered board, separate browser identities and shared history',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'christmas-test-')),origin='https://example.test';
 const proc=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'0',CHAT_ORIGIN:origin,CHAT_DATA:dir}});
 try{const [line]=await once(proc.stdout,'data');const base='http://127.0.0.1:'+String(line).trim().split(' ').at(-1);
 const post=(path,cookie='',body={},site=origin)=>fetch(base+'/api/'+path,{method:'POST',headers:{Cookie:cookie,Origin:site,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const guest=async()=>{const r=await post('join');assert.equal(r.status,200);return {cookie:r.headers.get('set-cookie').split(';')[0],id:(await r.json()).id};};
 const a=await guest(),b=await guest();assert.equal(a.id,null);assert.equal(b.id,null);assert.equal((await (await post('join',a.cookie)).json()).id,a.id);
 assert.equal((await post('answers','',{answer:'test'})).status,401);
 assert.equal((await post('answers',a.cookie,{answer:'test'},'https://wrong.test')).status,403);
 assert.equal((await post('answers',a.cookie,{answer:' '})).status,400);
 for(const [g,n] of [[b,1],[a,2]]){const r=await post('answers',g.cookie,{answer:'wish '+n});assert.equal(r.status,201);assert.equal((await r.json()).id,n);assert.equal((await (await post('join',g.cookie)).json()).id,n);}
 const list=await (await fetch(base+'/api/answers')).json();assert.deepEqual(list.map(x=>[x.guest,x.answer]),[[1,'wish 1'],[2,'wish 2']]);
 assert.equal((await (await fetch(base+'/api/answers?after='+list[0].id)).json()).length,1);
 assert.equal((await fetch(base+'/api/messages?channel=general')).status,404);
 }finally{const stop=once(proc,'exit');proc.kill();await stop;rmSync(dir,{recursive:true,force:true});}
});
