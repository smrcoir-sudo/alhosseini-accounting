/* Demo mode: window.claude.use('db'|'user'|'downloads'|'assets') backed by IndexedDB in this browser.
   Every visitor gets a private, empty shop (currencies pre-loaded) — nothing leaves the device. */
(function(){
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

  const SEED = window.__DEMO_SEED || {base:'USD-NAJAF',currencies:[]};
  const ready=(async()=>{
    const d=await idb; await new Promise((res,rej)=>{ const t=d.transaction(ST,'readonly'); const r=t.objectStore(ST).openCursor();
      r.onsuccess=()=>{ const c=r.result; if(!c){ res(); return; } const k=String(c.key); const i=k.indexOf('/'); const col=k.slice(0,i), id=k.slice(i+1); (cache[col]||(cache[col]=new Map())).set(id,c.value); c.continue(); }; r.onerror=()=>rej(r.error); });
    if(!cache.app?.get('settings')) await put('app','settings',{shop:'حساباتي', base:SEED.base, currencies:SEED.currencies, demo:true, createdAt:Date.now()});
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

  const UID='demo-admin';
  const user={ id:async()=>UID, name:async()=>'مدیر', email:async()=>'', can:async()=>true, canEdit:async()=>true, async profiles(ids){ const o={}; (ids||[]).forEach(i=>{ if(i===UID) o[i]={name:'مدیر'}; }); return o; } };
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
    bar.innerHTML='<span style="opacity:.85;margin-inline-end:auto">نسخهٔ نمایشی «حساباتي» — اطلاعات فقط در همین مرورگر ذخیره می‌شود و برای کسی ارسال نمی‌شود.</span><button type="button" id="demoReset" class="btn sm" style="background:transparent;color:inherit;border-color:rgba(255,255,255,.35)">شروع از نو</button>';
    foot.appendChild(bar); bar.querySelector('#demoReset').addEventListener('click',resetDemo); }
  document.addEventListener('DOMContentLoaded',addBar);
  window.__demo={reset:resetDemo};

  const API={db,user,downloads,assets};
  window.claude={ use:async name=>{ await ready; return API[name]||null; } };
})();
