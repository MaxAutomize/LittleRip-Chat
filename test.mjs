import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('two members, one-use login, channel separation, restart and revocation', {timeout:12000},async()=>{
 const dir=mkdtempSync(join(tmpdir(),'lr-test-')),origin='https://example.test',env={...process.env,CHAT_DATA:dir,PORT:'0',CHAT_ORIGIN:origin};
 let child,base;
 async function start(){child=spawn(process.execPath,['server.mjs'],{env,stdio:['ignore','pipe','inherit']});const [line]=await once(child.stdout,'data');base='http://127.0.0.1:'+String(line).trim().split(' ').at(-1);}
 async function stop(){const done=once(child,'exit');child.kill();await done;child=null;}
 const admin=(...args)=>execFileSync(process.execPath,['admin.mjs',...args],{env,encoding:'utf8'}).trim();
 const req=(path,cookie='',body,site=origin)=>fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:site,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const signin=async name=>{const code=admin('invite',name);const r=await req('login','',{code});assert.equal(r.status,200);assert.equal((await req('login','',{code})).status,403);return r.headers.get('set-cookie').split(';')[0];};
 try{await start();const general='messages?channel=general';
 assert.equal((await req(general)).status,401);
 const a=await signin('alice'),b=await signin('bob');
 assert.equal((await req(general,a,{body:'no'},'https://other.test')).status,403);
 assert.equal((await req(general,a,{body:'hello'})).status,201);
 const history=async()=>(await req(general,b)).json();
 assert.equal((await history())[0].author,'alice');
 assert.deepEqual(await (await req('messages?channel=projects',b)).json(),[]);
 await stop();await start();assert.equal((await history())[0].body,'hello');
 admin('revoke','alice');assert.equal((await req('me',a)).status,401);
 assert.equal((await req('logout',b,{})).status,200);assert.equal((await req('me',b)).status,401);
 }finally{if(child)await stop();rmSync(dir,{recursive:true,force:true});}
});
