/* Hosted mode: provides window.claude.use('db'|'user'|'downloads'|'assets') on top of Supabase,
   so the same accounting app runs on its own domain with its own login. */
(function(){
  const SB_URL = 'https://mtatozwppyixdtfjiekp.supabase.co';
  const SB_KEY = 'sb_publishable_n6Qrv6Ok4ikYVVFNc4jeCg_VIiJLHmU';
  const sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  window.__sb = sb;

  /* ---------- login gate ---------- */
  const css = `#authGate{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#14202b;font-family:Vazirmatn,Tahoma,sans-serif;direction:rtl;padding:16px}
  #authGate .card{background:#fff;color:#14202b;border-radius:16px;padding:28px 24px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
  #authGate h1{margin:0 0 4px;font-size:22px} #authGate p{margin:0 0 18px;color:#5b6977;font-size:14px;line-height:1.8}
  #authGate label{display:block;font-size:13px;font-weight:600;margin:12px 0 6px}
  #authGate{color-scheme:light}
  #authGate input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #b9c4cf!important;border-radius:10px;font:inherit;font-size:16px;direction:ltr;text-align:left;background:#ffffff!important;color:#14202b!important;-webkit-text-fill-color:#14202b;caret-color:#14202b;box-shadow:none!important;outline:none}
  #authGate input:focus{border-color:#9a6a1c!important;box-shadow:0 0 0 3px rgba(154,106,28,.18)!important}
  #authGate input:-webkit-autofill,#authGate input:-webkit-autofill:hover,#authGate input:-webkit-autofill:focus{-webkit-box-shadow:0 0 0 1000px #ffffff inset!important;-webkit-text-fill-color:#14202b!important}
  #authGate label{color:#14202b}
  #authGate button{width:100%;margin-top:18px;padding:12px;border:0;border-radius:10px;background:#9a6a1c;color:#fff;font:inherit;font-size:15px;font-weight:700;cursor:pointer}
  #authGate button[disabled]{opacity:.6}
  #authGate .lnk{background:none;color:#9a6a1c;margin-top:10px;padding:6px;font-weight:600}
  #authGate .msg{min-height:20px;margin-top:12px;font-size:13px;color:#b42318;line-height:1.7} #authGate .ok{color:#067647}
  #authGate .logo{width:52px;height:52px;border-radius:14px;background:#9a6a1c;color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;margin-bottom:14px}`;
  const shop = 'مکتب السید الحسینی';
  function gate(mode, note){
    let g = document.getElementById('authGate');
    if(!g){ const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st); g=document.createElement('div'); g.id='authGate'; document.body.appendChild(g); }
    if(mode==='pending'){
      g.innerHTML = `<div class="card"><div class="logo">ح</div><h1>${shop}</h1><p>حساب شما فعال نیست یا توسط مدیر غیرفعال شده است. برای فعال‌سازی با مدیر صرافی تماس بگیرید.</p><div class="msg">${note||''}</div><button id="ag_re">بررسی دوباره</button><button class="lnk" id="ag_out">خروج و ورود با حساب دیگر</button></div>`;
      g.querySelector('#ag_re').onclick=()=>location.reload(); g.querySelector('#ag_out').onclick=async()=>{ await sb.auth.signOut(); location.reload(); };
      return;
    }
    const signup = false, reset = mode==='reset';
    g.innerHTML = `<div class="card"><div class="logo">ح</div><h1>${shop}</h1><p>${signup?'ثبت‌نام همکار جدید — پس از ثبت‌نام، مدیر باید حساب شما را تأیید کند.':reset?'ایمیل خود را وارد کنید تا لینک تغییر رمز برایتان ارسال شود.':'نرم‌افزار حسابداری صرافی — برای ادامه وارد شوید.'}</p>
      <form id="ag_f">${signup?'<label>نام و نام خانوادگی</label><input id="ag_n" autocomplete="name" style="direction:rtl;text-align:right">':''}
      <label>ایمیل</label><input id="ag_e" type="email" autocomplete="username" required>
      ${reset?'':`<label>رمز عبور</label><input id="ag_p" type="password" autocomplete="${signup?'new-password':'current-password'}" required minlength="6">`}
      <button type="submit" id="ag_b">${signup?'ثبت‌نام':reset?'ارسال لینک':'ورود'}</button></form>
      <div class="msg" id="ag_m">${note||''}</div>
      ${reset?'<button class="lnk" id="ag_login">بازگشت به ورود</button>':'<button class="lnk" id="ag_fp">رمز را فراموش کرده‌ام</button><p style="margin:14px 0 0;font-size:12px;text-align:center">حساب کاربری فقط توسط مدیر صرافی ساخته می‌شود.</p>'}</div>`;
    const m=g.querySelector('#ag_m');
    g.querySelector('#ag_login')&&(g.querySelector('#ag_login').onclick=()=>gate('login'));
    g.querySelector('#ag_su')&&(g.querySelector('#ag_su').onclick=()=>gate('signup'));
    g.querySelector('#ag_fp')&&(g.querySelector('#ag_fp').onclick=()=>gate('reset'));
    g.querySelector('#ag_f').onsubmit=async e=>{ e.preventDefault(); const b=g.querySelector('#ag_b'); b.disabled=true; m.className='msg'; m.textContent='…';
      const email=g.querySelector('#ag_e').value.trim(), pw=g.querySelector('#ag_p')?.value||'';
      try{
        if(reset){ const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin}); if(error) throw error; m.className='msg ok'; m.textContent='اگر این ایمیل ثبت شده باشد، لینک تغییر رمز ارسال شد.'; }
        else if(signup){ const {data,error}=await sb.auth.signUp({email,password:pw,options:{data:{name:g.querySelector('#ag_n').value.trim()},emailRedirectTo:location.origin}}); if(error) throw error;
          if(data.session){ location.reload(); return; } m.className='msg ok'; m.textContent='ثبت‌نام انجام شد. ایمیل تأیید را باز کنید، سپس از همین صفحه وارد شوید.'; }
        else { const {error}=await sb.auth.signInWithPassword({email,password:pw}); if(error) throw error; location.reload(); return; }
      }catch(err){ m.className='msg'; m.textContent=faErr(err); }
      b.disabled=false; };
  }
  function faErr(e){ const s=String(e?.message||e); if(/Invalid login/i.test(s)) return 'ایمیل یا رمز عبور اشتباه است.'; if(/Email not confirmed/i.test(s)) return 'ایمیل شما هنوز تأیید نشده؛ لینک ارسال‌شده به ایمیل را باز کنید.'; if(/already registered/i.test(s)) return 'این ایمیل قبلاً ثبت شده است؛ وارد شوید.'; if(/at least 6/i.test(s)) return 'رمز عبور باید حداقل ۶ نویسه باشد.'; if(/rate limit/i.test(s)) return 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره امتحان کنید.'; return s; }
  function newPasswordGate(){ gate('login'); const g=document.getElementById('authGate'); g.querySelector('.card').innerHTML=`<div class="logo">ح</div><h1>تغییر رمز عبور</h1><p>رمز جدید خود را وارد کنید.</p><form id="np_f"><label>رمز جدید</label><input id="np_p" type="password" autocomplete="new-password" minlength="6" required><button type="submit">ذخیرهٔ رمز</button></form><div class="msg" id="np_m"></div>`;
    g.querySelector('#np_f').onsubmit=async e=>{ e.preventDefault(); const {error}=await sb.auth.updateUser({password:g.querySelector('#np_p').value}); if(error){ g.querySelector('#np_m').textContent=faErr(error); return; } location.hash=''; location.reload(); }; }

  let ready;
  const ME = { uid:null, email:'', member:null };
  sb.auth.onAuthStateChange((ev)=>{ if(ev==='PASSWORD_RECOVERY') newPasswordGate(); });
  async function init(){
    if(/type=recovery/.test(location.hash)){ await new Promise(r=>setTimeout(r,800)); newPasswordGate(); return new Promise(()=>{}); }
    const { data:{ session } } = await sb.auth.getSession();
    if(!session){ gate('login'); return new Promise(()=>{}); }
    ME.uid=session.user.id; ME.email=session.user.email||'';
    const { data:m } = await sb.from('members').select('*').eq('uid',ME.uid).maybeSingle();
    ME.member=m;
    if(!m || !m.active){ gate('pending', ME.email); return new Promise(()=>{}); }
    document.getElementById('authGate')?.remove();
    addLogout();
    return true;
  }
  async function doSignOut(){ try{ await Promise.race([sb.auth.signOut({scope:'local'}), new Promise(r=>setTimeout(r,2500))]); }catch(e){}
    try{ Object.keys(localStorage).filter(k=>/^sb-.*-auth-token/.test(k)).forEach(k=>localStorage.removeItem(k)); }catch(e){}
    location.replace(location.pathname); }
  window.__signOut=doSignOut;
  function addLogout(){ const tryAdd=()=>{ const foot=document.querySelector('footer.statusbar'); if(!foot){ setTimeout(tryAdd,500); return; } if(document.getElementById('acctBar')) return;
      const bar=document.createElement('div'); bar.id='acctBar'; bar.className='wrap'; bar.style.cssText='display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap;padding:4px 16px 8px';
      bar.innerHTML=`<span style="font-size:12px;opacity:.8;margin-inline-end:auto">${(ME.member?.name||ME.email).replace(/[<>&"]/g,'')}</span><button type="button" id="sbPw" class="btn sm" style="background:transparent;color:inherit;border-color:rgba(255,255,255,.35)">تغییر رمز</button><button type="button" id="sbOut" class="btn sm" style="background:#b42318;color:#fff;border-color:#b42318;min-height:36px;padding:6px 14px">خروج از حساب</button>`;
      foot.appendChild(bar);
      const out=bar.querySelector('#sbOut'); let busy=false; const go=e=>{ e.preventDefault(); if(busy) return; busy=true; out.textContent='در حال خروج…'; doSignOut(); };
      out.addEventListener('click',go); out.addEventListener('touchend',go,{passive:false});
      bar.querySelector('#sbPw').addEventListener('click',changeMyPassword); };
    tryAdd(); }

  function changeMyPassword(){ gate('login'); const g=document.getElementById('authGate'); g.style.background='rgba(20,32,43,.7)';
    g.querySelector('.card').innerHTML=`<div class="logo">ح</div><h1>تغییر رمز عبور</h1><p>${ME.email}</p><form id="cp_f"><label>رمز جدید (حداقل ۸ نویسه)</label><input id="cp_p" type="password" autocomplete="new-password" minlength="8" required><label>تکرار رمز جدید</label><input id="cp_p2" type="password" autocomplete="new-password" minlength="8" required><button type="submit">ذخیرهٔ رمز</button></form><div class="msg" id="cp_m"></div><button class="lnk" id="cp_x">انصراف</button>`;
    g.querySelector('#cp_x').onclick=()=>g.remove();
    g.querySelector('#cp_f').onsubmit=async e=>{ e.preventDefault(); const p=g.querySelector('#cp_p').value, m=g.querySelector('#cp_m'); if(p!==g.querySelector('#cp_p2').value){ m.textContent='دو رمز یکسان نیستند.'; return; } const {error}=await sb.auth.updateUser({password:p}); if(error){ m.textContent=faErr(error); return; } m.className='msg ok'; m.textContent='رمز عبور تغییر کرد.'; setTimeout(()=>g.remove(),1200); }; }
  async function adminCall(body){ const {data,error}=await sb.functions.invoke('admin-users',{body}); if(error){ let msg=error.message; try{ const j=await error.context?.json?.(); if(j?.error) msg=j.error; }catch(e){} throw new Error(faAdmin(msg)); } if(data?.error) throw new Error(faAdmin(data.error)); return data; }
  function faAdmin(m){ return ({invalid_email:'ایمیل معتبر نیست.',weak_password:'رمز باید حداقل ۸ نویسه باشد.',forbidden:'فقط مدیر کل اجازهٔ این کار را دارد.',unauthorized:'دوباره وارد شوید.',cannot_delete_self:'نمی‌توانید حساب خودتان را حذف کنید.'})[m] || (/already been registered|already registered|exists/i.test(m)?'این ایمیل قبلاً ثبت شده است.':m); }

  /* ---------- document database ---------- */
  const cache = {};            // col -> Map(id -> data)
  const loaded = {};           // col -> Promise
  const colL = {};             // col -> Set(listener)
  const docL = {};             // 'col/id' -> Set(listener)
  const clone = o => o==null ? o : JSON.parse(JSON.stringify(o));
  const mkDoc = (col,id) => { const d=cache[col]?.get(id); return { id, exists: d!==undefined, data: () => clone(d) }; };
  const split = p => { const i=p.indexOf('/'); return [p.slice(0,i), p.slice(i+1)]; };
  async function loadCol(col){
    if(loaded[col]) return loaded[col];
    loaded[col] = (async()=>{ const map=cache[col]||(cache[col]=new Map()); let from=0; const step=1000;
      for(;;){ const {data,error}=await sb.from('docs').select('id,data').eq('col',col).range(from,from+step-1); if(error) throw error; data.forEach(r=>map.set(r.id,r.data)); if(data.length<step) break; from+=step; }
    })();
    return loaded[col];
  }
  const pend = new Set(); let pT=null;
  function emit(col,id){ pend.add(col+'\u0000'+(id??'')); clearTimeout(pT); pT=setTimeout(flush,40); }
  function flush(){ const items=[...pend]; pend.clear(); const cols=new Set();
    items.forEach(k=>{ const [c,id]=k.split('\u0000'); cols.add(c); if(id) (docL[c+'/'+id]||[]).forEach(fn=>{ try{ fn(mkDoc(c,id)); }catch(e){ console.error(e); } }); });
    cols.forEach(c=>(colL[c]||[]).forEach(fn=>{ try{ fn(colSnap(c)); }catch(e){ console.error(e); } })); }
  function colSnap(col){ const map=cache[col]||new Map(); const docs=[...map.keys()].map(id=>mkDoc(col,id)); return { docs, size:docs.length, empty:!docs.length, metadata:{fromCache:false}, forEach:fn=>docs.forEach(fn) }; }
  function local(col,id,data){ const map=cache[col]||(cache[col]=new Map()); if(data===undefined) map.delete(id); else map.set(id,clone(data)); emit(col,id); }
  let channel=null;
  function ensureChannel(){ if(channel) return; channel = sb.channel('docs-all').on('postgres_changes',{event:'*',schema:'public',table:'docs'},p=>{
      const row=p.new&&Object.keys(p.new).length?p.new:p.old; if(!row) return; const col=row.col, id=row.id; if(!cache[col]) return;
      if(p.eventType==='DELETE') local(col,id,undefined); else local(col,id,p.new.data); }).subscribe(st=>{ if(st==='CHANNEL_ERROR'||st==='TIMED_OUT') console.warn('realtime',st); }); }
  const strip = o => JSON.parse(JSON.stringify(o??{}));
  function docRef(col,id){
    return {
      id,
      async get(){ await loadCol(col); return mkDoc(col,id); },
      async set(data){ const d=strip(data); const prev=cache[col]?.get(id); local(col,id,d); const {error}=await sb.from('docs').upsert({col,id,data:d}); if(error){ local(col,id,prev); throw mapErr(error); } },
      async update(patch){ await loadCol(col); const cur=cache[col]?.get(id)||{}; const d={...clone(cur)}; for(const [k,v] of Object.entries(patch||{})){ if(v&&typeof v==='object'&&v.__delete__) delete d[k]; else d[k]=v; } return this.set(d); },
      async delete(){ const prev=cache[col]?.get(id); local(col,id,undefined); const {error}=await sb.from('docs').delete().eq('col',col).eq('id',id); if(error){ local(col,id,prev); throw mapErr(error); } },
      onSnapshot(cb,err){ const k=col+'/'+id; (docL[k]||(docL[k]=new Set())).add(cb); ensureChannel(); loadCol(col).then(()=>cb(mkDoc(col,id))).catch(e=>err&&err(e)); return ()=>docL[k].delete(cb); },
      async acquire(o={}){ const {data,error}=await sb.rpc('acquire_lock',{p_name:col+'/'+id,p_holder:String(o.holder||ME.uid),p_ttl_ms:o.ttlMs||6000}); if(error) throw mapErr(error); return {acquired:!!data, release:()=>sb.rpc('release_lock',{p_name:col+'/'+id,p_holder:String(o.holder||ME.uid)})}; }
    };
  }
  function mapErr(e){ const x=new Error(e.message||'error'); x.code=/row-level security|permission/i.test(e.message||'')?'permission_denied':(e.code||'unknown'); return x; }
  const db = {
    doc(path){ const [c,id]=split(path); return docRef(c,id); },
    collection(col){ return {
      doc(id){ return docRef(col,id); },
      async get(){ await loadCol(col); return colSnap(col); },
      onSnapshot(cb,err){ (colL[col]||(colL[col]=new Set())).add(cb); ensureChannel(); loadCol(col).then(()=>cb(colSnap(col))).catch(e=>err&&err(e)); return ()=>colL[col].delete(cb); }
    }; }
  };

  /* ---------- user ---------- */
  const user = {
    id: async()=>ME.uid, name: async()=>ME.member?.name||ME.email, email: async()=>ME.email,
    can: async()=>!!ME.member?.active, canEdit: async()=>ME.member?.role==='admin',
    async profiles(ids){ const {data}=await sb.from('members').select('uid,name,email').in('uid',ids); const o={}; (data||[]).forEach(r=>o[r.uid]={name:r.name||r.email}); return o; }
  };
  /* ---------- downloads ---------- */
  const downloads = { async save({filename,data,type}){ const blob = data instanceof Blob ? data : new Blob([data],{type:type||(/\.csv$/i.test(filename)?'text/csv;charset=utf-8':/\.html?$/i.test(filename)?'text/html;charset=utf-8':/\.xml$/i.test(filename)?'application/xml':'application/octet-stream')});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000); } };
  /* ---------- files (attachments, logo) ---------- */
  const assets = {
    async upload(file, opts={}){ const id=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)).replace(/-/g,''); const type=opts.type||file.type||'application/octet-stream';
      const {error}=await sb.storage.from('files').upload(id,file,{contentType:type,upsert:false}); if(error) throw mapErr(error); return {id, contentType:type, sizeBytes:file.size}; },
    async delete(id){ await sb.storage.from('files').remove([id]); }
  };
  /* rewrite /_blob/<id> links to short-lived signed URLs */
  const signed = new Map();
  async function signUrl(id){ const c=signed.get(id); if(c&&c.exp>Date.now()) return c.url; const {data}=await sb.storage.from('files').createSignedUrl(id,3600); if(!data) return null; signed.set(id,{url:data.signedUrl,exp:Date.now()+3300e3}); return data.signedUrl; }
  function fixBlobs(root){ (root.querySelectorAll?root:document).querySelectorAll('img[src^="/_blob/"],a[href^="/_blob/"]').forEach(async el=>{ const attr=el.tagName==='IMG'?'src':'href'; const id=el.getAttribute(attr).slice(7); el.setAttribute(attr,'data:,'); const u=await signUrl(id); if(u) el.setAttribute(attr,u); }); }
  new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{ if(n.nodeType===1) fixBlobs(n.parentNode||n); }))).observe(document.documentElement,{childList:true,subtree:true});

  /* ---------- member administration (used by the admin page) ---------- */
  window.__members = {
    list: async()=>{ const {data,error}=await sb.from('members').select('*').order('created_at'); if(error) throw error; return data; },
    set: async(uid,patch)=>{ const {error}=await sb.from('members').update(patch).eq('uid',uid); if(error) throw mapErr(error); },
    remove: async(uid)=>adminCall({action:'delete',uid}),
    create: async(o)=>adminCall({action:'create',...o}),
    setPassword: async(uid,password)=>adminCall({action:'password',uid,password}),
    me: ()=>ME
  };

  ready = init();
  const API = { db, user, downloads, assets };
  window.claude = { use: async name => { const ok=await ready; return ok ? (API[name]||null) : null; } };
})();
