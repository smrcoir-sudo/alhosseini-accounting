/* Demo mode: window.claude.use('db'|'user'|'downloads'|'assets') backed by IndexedDB in this browser.
   Every visitor gets a private, empty shop (currencies pre-loaded) — nothing leaves the device. */
(function(){
  const UID='demo-admin';
  const CK=Object.fromEntries((document.cookie||'').split(/;\s*/).filter(Boolean).map(p=>{ const i=p.indexOf('='); return [p.slice(0,i),decodeURIComponent(p.slice(i+1))]; }));
  const DUSER=CK.hd_u||'', DNOTE=CK.hd_n||'', DEXP=CK.hd_e?new Date(CK.hd_e):null;
  const DBN='hesabati-demo', ST='docs', FST='files';
  const idb = new Promise((res,rej)=>{ const r=indexedDB.open(DBN,1); r.onupgradeneeded=()=>{ r.result.createObjectStore(ST); r.result.createObjectStore(FST); }; r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
  const tx = async (store,mode,fn)=>{ const d=await idb; return new Promise((res,rej)=>{ const t=d.transaction(store,mode); const s=t.objectStore(store); const out=fn(s); t.oncomplete=()=>res(out&&out.result!==undefined?out.result:out); t.onerror=()=>rej(t.error); }); };
  const cache={}; const colL={}; const docL={};
  const clone=o=>o==null?o:JSON.parse(JSON.stringify(o));
  const mkDoc=(col,id)=>{ const d=cache[col]?.get(id); return { id, exists:d!==undefined, data:()=>clone(d) }; };
  const colSnap=col=>{ const m=cache[col]||new Map(); const docs=[...m.keys()].map(id=>mkDoc(col,id)); return { docs, size:docs.length, empty:!docs.length, metadata:{fromCache:false}, forEach:fn=>docs.forEach(fn) }; };
  const pend=new Set(); let pT=null;
  function emit(col,id){ pend.add(col+'\u0000'+id); clearTimeout(pT); pT=setTimeout(flush,20); }
  function flush(){ const items=[...pend]; pend.clear(); const cols=new Set();
    items.forEach(k=>{ const [c,id]=k.split('\u0000'); cols.add(c); (docL[c+'/'+id]||[]).forEach(fn=>{ try{ fn(mkDoc(c,id)); }catch(e){ console.error(e); } }); });
    cols.forEach(c=>(colL[c]||[]).forEach(fn=>{ try{ fn(colSnap(c)); }catch(e){ console.error(e); } })); }
  async function put(col,id,data){ const m=cache[col]||(cache[col]=new Map()); if(data===undefined) m.delete(id); else m.set(id,clone(data)); emit(col,id);
    await tx(ST,'readwrite',s=>data===undefined?s.delete(col+'/'+id):s.put(data,col+'/'+id)); }

  const SEED = window.__DEMO_SEED || {base:'USD',currencies:[]};
  /* sample customers, partners, cash boxes, banks + fictional opening balances (USD / Toman / EUR) */
  async function seedData(){ const now=Date.now(), d=new Date(), pad=n=>String(n).padStart(2,'0'); const day=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const ts=new Date(d.getFullYear(),d.getMonth(),d.getDate(),0,1).getTime(); let code=1000;
    for(const [id,kind,name,mobile,city] of SEED.accounts||[]) await put('accounts',id,{id,kind,name,code:String(++code),active:true,branch:'',mobile,city,remark:'نمونهٔ نمایشی',createdAt:now,updatedAt:now});
    const C=Object.fromEntries((SEED.currencies||[]).map(c=>[c.code,c])); const per=c=>{ const x=C[c]; if(!x) return 1; return x.q==='bc'?(+x.buy||1):1/(+x.buy||1); };
    let no=0;
    for(const [a,c,amt,side] of SEED.opening||[]){ no++; const id='VDEMO'+String(no).padStart(4,'0'); const note='مانده اول دوره (نمونهٔ نمایشی)';
      const lines=side==='dr'?[{a,c,dr:amt,cr:0},{a:'SYS_EQUITY',c,dr:0,cr:amt}]:[{a,c,dr:0,cr:amt},{a:'SYS_EQUITY',c,dr:amt,cr:0}];
      await put('vouchers',id,{id,no,type:'opening',ts,createdAt:now+no,by:UID,base:SEED.base,rb:{[c]:per(c)},note,inote:'',lines,party:null,branch:null,person:null,voided:false,pending:false,needDocs:false,
        meta:{acc:a,amt,cur:c,side,src:'demo'},f:{f_acc:a,f_amt:amt.toLocaleString('en-US'),f_cur:c,f_side:side,f_date:day,f_time:'00:01',f_note:note,f_inote:'',f_pending:false,f_needdocs:false,f_again:false},cc:null,dim:null,deal:null,proj:null,items:null}); }
    await put('counters','main',{a:code+100,v:no}); }
  /* every demo login gets its own cashier box (default cash for the dashboard) with a float and a few of today's deals */
  async function seedCashier(){ if(!DUSER) return; const id='D_K_'+DUSER.replace(/[^a-z0-9]/gi,'').slice(0,24);
    const perm=cache.perms?.get(UID)||{};
    if(cache.accounts?.has(id)){ if(perm.defCash!==id) await put('perms',UID,{...perm,defCash:id,active:true}); return; }
    const now=Date.now(), d=new Date(); const T=(h,m)=>new Date(d.getFullYear(),d.getMonth(),d.getDate(),h,m).getTime();
    const label='کشیر '+(DNOTE||DUSER);
    await put('accounts',id,{id,kind:'cash',name:label,code:String(2000+(cache.accounts?.size||0)),active:true,branch:'',users:[UID],remark:'صندوق نمایشی کاربر '+DUSER,createdAt:now,updatedAt:now});
    await put('perms',UID,{...perm,defCash:id,active:true,updatedAt:now});
    const C=Object.fromEntries((SEED.currencies||[]).map(c=>[c.code,c])); const per=c=>{ const x=C[c]; if(!x) return 1; return x.q==='bc'?(+x.buy||1):1/(+x.buy||1); };
    const ctr=cache.counters?.get('main')||{}; let no=+ctr.v||0; const B=SEED.base;
    const base=(extra)=>({cc:null,dim:null,proj:null,items:null,deal:null,branch:null,person:null,voided:false,pending:false,needDocs:false,inote:'',note:'',by:UID,base:B,...extra});
    const vid=()=>'VK'+id.slice(4,12).toUpperCase()+String(++no).padStart(4,'0');
    // float (opening balance of the cashier box)
    for(const [c,amt] of [['USD',5000],['IQD',15000000],['IRT',200000000]]){ const v=vid();
      await put('vouchers',v,base({id:v,no,type:'opening',ts:T(8,0),createdAt:now+no,rb:{[c]:per(c)},note:'موجودی اول روز '+label,lines:[{a:id,c,dr:amt,cr:0},{a:'SYS_EQUITY',c,dr:0,cr:amt}],party:null,meta:{acc:id,amt,cur:c,side:'dr',src:'demo'}})); }
    // exchange deals: [hh,mm, side, x, xa, y, rate, party]
    const deals=[[9,15,'buy','USD',1000,'IQD',1665,'WALKIN'],[9,40,'sell','USD',500,'IQD',1675,'D_C1'],[10,5,'sell','USD',300,'IRT',168000,'D_C3'],[10,30,'buy','USD',200,'IRT',166500,'WALKIN'],[11,10,'buy','EUR',400,'IQD',1815,'D_C4']];
    for(const [h,m,side,x,xa,y,rate,party] of deals){ const v=vid(); const ya=Math.round(xa*rate);
      const lines=side==='buy'?[{a:id,c:x,dr:xa,cr:0},{a:'SYS_POS',c:x,dr:0,cr:xa},{a:'SYS_POS',c:y,dr:ya,cr:0},{a:id,c:y,dr:0,cr:ya}]
                              :[{a:'SYS_POS',c:x,dr:xa,cr:0},{a:id,c:x,dr:0,cr:xa},{a:id,c:y,dr:ya,cr:0},{a:'SYS_POS',c:y,dr:0,cr:ya}];
      await put('vouchers',v,base({id:v,no,type:'exchange',ts:T(h,m),createdAt:now+no,rb:{[x]:per(x),[y]:per(y)},lines,party,deal:side==='buy'?{ia:xa,ic:x,oa:ya,oc:y}:{ia:ya,ic:y,oa:xa,oc:x},
        meta:{x,y,op:'*',xa,ya,amt:xa,cur:x,rate,side,pay:id,recv:id,payM:'cash',recvM:'cash',comm:0,commp:null,ben:null,mix:null}})); }
    // cash in / out with customers
    for(const [h,m,kind,c,amt,party,note] of [[11,45,'cashIn','USD',2000,'D_C2','واریز نقدی به حساب'],[12,20,'cashOut','IRT',10000000,'D_C3','پرداخت نقدی از حساب']]){ const v=vid();
      const lines=kind==='cashIn'?[{a:id,c,dr:amt,cr:0},{a:party,c,dr:0,cr:amt}]:[{a:party,c,dr:amt,cr:0},{a:id,c,dr:0,cr:amt}];
      await put('vouchers',v,base({id:v,no,type:'recpay',ts:T(h,m),createdAt:now+no,rb:{[c]:per(c)},note,lines,party,meta:{amt,cur:c,ref:'',comm:0,cost:0,fund:id,kind,invref:null}})); }
    await put('counters','main',{...ctr,v:no}); }
  const ready=(async()=>{
    const d=await idb; await new Promise((res,rej)=>{ const t=d.transaction(ST,'readonly'); const r=t.objectStore(ST).openCursor();
      r.onsuccess=()=>{ const c=r.result; if(!c){ res(); return; } const k=String(c.key); const i=k.indexOf('/'); const col=k.slice(0,i), id=k.slice(i+1); (cache[col]||(cache[col]=new Map())).set(id,c.value); c.continue(); }; r.onerror=()=>rej(r.error); });
    const st=cache.app?.get('settings');
    if(!st){ await put('app','settings',{shop:'حساباتي', base:SEED.base, currencies:SEED.currencies, off:SEED.off||[], seedV:SEED.v||1, demo:true, createdAt:Date.now()}); await seedData(); }
    else if(st.demo && (st.seedV||1)<(SEED.v||1)){ /* demo data format changed: start this browser over with fresh sample data */
      await tx(ST,'readwrite',s=>s.clear()); Object.keys(cache).forEach(k=>delete cache[k]);
      await put('app','settings',{shop:'حساباتي', base:SEED.base, currencies:SEED.currencies, off:SEED.off||[], seedV:SEED.v||1, demo:true, createdAt:Date.now()}); await seedData(); }
    await seedCashier();
    return true; })();

  function docRef(col,id){ return {
    id,
    async get(){ await ready; return mkDoc(col,id); },
    async set(data){ await ready; await put(col,id,JSON.parse(JSON.stringify(data??{}))); },
    async update(patch){ await ready; const d={...clone(cache[col]?.get(id)||{})}; for(const [k,v] of Object.entries(patch||{})){ if(v&&typeof v==='object'&&v.__delete__) delete d[k]; else d[k]=v; } await put(col,id,JSON.parse(JSON.stringify(d))); },
    async delete(){ await ready; await put(col,id,undefined); },
    onSnapshot(cb,err){ const k=col+'/'+id; (docL[k]||(docL[k]=new Set())).add(cb); ready.then(()=>cb(mkDoc(col,id))).catch(e=>err&&err(e)); return ()=>docL[k].delete(cb); },
    async acquire(){ return {acquired:true, release:async()=>{}}; }
  }; }
  const db={ doc(p){ const i=p.indexOf('/'); return docRef(p.slice(0,i),p.slice(i+1)); },
    collection(col){ return { doc:id=>docRef(col,id), async get(){ await ready; return colSnap(col); },
      onSnapshot(cb,err){ (colL[col]||(colL[col]=new Set())).add(cb); ready.then(()=>cb(colSnap(col))).catch(e=>err&&err(e)); return ()=>colL[col].delete(cb); } }; } };

  const user={ id:async()=>UID, name:async()=>DUSER||'مدیر', email:async()=>'', can:async()=>true, canEdit:async()=>true, async profiles(ids){ const o={}; (ids||[]).forEach(i=>{ if(i===UID) o[i]={name:DUSER||'مدیر'}; }); return o; } };
  const downloads={ async save({filename,data,type}){ const blob=data instanceof Blob?data:new Blob([data],{type:type||(/\.csv$/i.test(filename)?'text/csv;charset=utf-8':/\.html?$/i.test(filename)?'text/html;charset=utf-8':'application/octet-stream')});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000); } };
  /* attachments / logo: kept in IndexedDB, shown through object URLs */
  const urls=new Map();
  const assets={ async upload(file,opts={}){ const id=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)).replace(/-/g,''); const type=opts.type||file.type||'application/octet-stream';
      await tx(FST,'readwrite',s=>s.put(new Blob([file],{type}),id)); return {id,contentType:type,sizeBytes:file.size}; },
    async delete(id){ await tx(FST,'readwrite',s=>s.delete(id)); } };
  async function blobUrl(id){ if(urls.has(id)) return urls.get(id); const b=await tx(FST,'readonly',s=>s.get(id)); if(!b) return null; const u=URL.createObjectURL(b); urls.set(id,u); return u; }
  function fixBlobs(root){ (root.querySelectorAll?root:document).querySelectorAll('img[src^="/_blob/"],a[href^="/_blob/"]').forEach(async el=>{ const attr=el.tagName==='IMG'?'src':'href'; const id=el.getAttribute(attr).slice(7); el.setAttribute(attr,'data:,'); const u=await blobUrl(id); if(u) el.setAttribute(attr,u); }); }
  new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{ if(n.nodeType===1) fixBlobs(n.parentNode||n); }))).observe(document.documentElement,{childList:true,subtree:true});

  /* demo bar in the footer: explains storage + "start over" */
  async function resetDemo(){ if(!confirm('همهٔ اطلاعات نسخهٔ نمایشی در این مرورگر پاک شود و برنامه از نو شروع شود؟')) return;
    (await idb).close(); await new Promise(r=>{ const q=indexedDB.deleteDatabase(DBN); q.onsuccess=q.onerror=q.onblocked=()=>r(); });
    try{ Object.keys(localStorage).filter(k=>/^sarrafi/.test(k)).forEach(k=>localStorage.removeItem(k)); }catch(e){}
    location.replace(location.pathname); }
  function addBar(){ const foot=document.querySelector('footer.statusbar'); if(!foot){ setTimeout(addBar,500); return; } if(document.getElementById('demoBar')) return;
    const bar=document.createElement('div'); bar.id='demoBar'; bar.className='wrap'; bar.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:4px 16px 8px;font-size:12px';
    bar.innerHTML='<span style="opacity:.85;margin-inline-end:auto">نسخهٔ نمایشی «حساباتي» — اطلاعات فقط در همین مرورگر ذخیره می‌شود و برای کسی ارسال نمی‌شود.</span><button type="button" id="demoReset" class="btn sm" style="background:transparent;color:inherit;border-color:rgba(255,255,255,.35)">شروع از نو</button>'+(DUSER?`<span style="opacity:.85">کاربر: <b>${DUSER.replace(/[<>&"]/g,'')}</b>${DEXP&&!isNaN(DEXP)?' · دسترسی تا '+DEXP.toLocaleString('fa-IR',{dateStyle:'medium',timeStyle:'short'}):''}</span><a href="/api/logout" class="btn sm" style="background:#b42318;color:#fff;border-color:#b42318;text-decoration:none">خروج</a>`:'');
    foot.appendChild(bar); bar.querySelector('#demoReset').addEventListener('click',resetDemo); }
  document.addEventListener('DOMContentLoaded',addBar);
  window.__demo={reset:resetDemo};

  const API={db,user,downloads,assets};
  window.claude={ use:async name=>{ await ready; return API[name]||null; } };
})();
