const el=id=>document.getElementById(id);
let channel='',seq=0,last='',drafts=new Map();
async function api(path,data){
 const r=await fetch('/api/'+path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const v=await r.json();if(!r.ok){if(r.status===401 && channel)signedOut();throw Error(v.error||'Request failed');}return v;
}
function signedOut(){channel='';seq++;last='';drafts.clear();el('message').value='';el('history').replaceChildren();el('room').hidden=true;el('gate').hidden=false;}
function item(tag,txt){const n=document.createElement(tag);n.textContent=txt;return n;}
async function refresh(){
 const current=channel, id=++seq;if(!current)return;
 try{
 const rows=await api('messages?channel='+encodeURIComponent(current));if(seq!==id)return;
 const sig=current+':'+(rows.at(-1)?.id||0);if(sig===last)return;
 const h=el('history'),atEnd=!last||h.scrollHeight-h.scrollTop-h.clientHeight<70;
 last=sig; h.replaceChildren(...rows.map(m=>{const a=item('article','');a.append(item('strong',m.author),item('time',new Date(m.ts).toLocaleString()),item('p',m.body));return a;}));
 if(!rows.length)h.append(item('p','No messages yet. Start the conversation.'));
 if(atEnd)h.scrollTop=h.scrollHeight;
 }catch(e){if(current===channel)el('status').textContent=e.message;}
}
function choose(name){if(channel)drafts.set(channel,el('message').value);channel=name;last='';el('history').replaceChildren();el('message').value=drafts.get(name)||'';el('title').textContent='# '+name;el('message').placeholder='Message #'+name;el('status').textContent='';for(const b of el('channels').children)b.setAttribute('aria-current',String(b.dataset.name===name));refresh();}
async function enter(){const u=await api('me');el('who').textContent=u.name;el('channels').replaceChildren(...u.channels.map(n=>{const b=item('button','# '+n);b.dataset.name=n;b.onclick=()=>choose(n);return b;}));el('gate').hidden=true;el('room').hidden=false;choose(u.channels[0]);}
el('login').onsubmit=async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;try{await api('login',{code:el('code').value.trim()});el('code').value='';await enter();}catch(err){el('loginmsg').textContent=err.message;}finally{btn.disabled=false;}};
el('out').onclick=async()=>{try{await api('logout',{});signedOut();el('loginmsg').textContent='Signed out. Use a fresh code to return.';}catch(e){el('status').textContent=e.message;}};
el('compose').onsubmit=async e=>{e.preventDefault();const b=el('compose').querySelector('button');if(b.disabled)return;b.disabled=true;const target=channel,body=el('message').value;try{await api('messages?channel='+encodeURIComponent(target),{body});if(target===channel){if(el('message').value===body)el('message').value='';el('status').textContent='';await refresh();}else if(drafts.get(target)===body)drafts.delete(target);}catch(err){el('status').textContent=err.message;}finally{b.disabled=false;}};
el('message').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();el('compose').requestSubmit();}};
enter().catch(e=>{el('loginmsg').textContent=e.message;});setInterval(()=>{if(!document.hidden&&channel)refresh();},2000);
