// Login gate for the Hesabati demo: only people given a username/password by the admin
// (valid 1 day / 1 week, issued from the main app) can open the site.
export const config = { matcher: '/((?!icons/|manifest\\.webmanifest|favicon).*)' };

const SB_URL = 'https://mtatozwppyixdtfjiekp.supabase.co';
const SB_KEY = 'sb_publishable_n6Qrv6Ok4ikYVVFNc4jeCg_VIiJLHmU';
const next = () => new Response(null, { headers: { 'x-middleware-next': '1' } });

async function rpc(fn, body) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('rpc ' + r.status);
  return r.json();
}
function cookies(req) {
  const o = {}; (req.headers.get('cookie') || '').split(/;\s*/).forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1)); }); return o;
}
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function loginPage(code, user) {
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>حساباتي</title><link rel="icon" href="/icons/icon-192.png">
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#14202b;font-family:Vazirmatn,Tahoma,system-ui,sans-serif;padding:16px;color:#14202b}
.c{background:#fff;border-radius:16px;padding:24px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
.l{width:56px;height:56px;border-radius:14px;background:linear-gradient(145deg,#22364a,#14202b);color:#d8b25a;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800}
.lg{display:flex;border:1px solid #d5dde5;border-radius:10px;overflow:hidden}.lg button{width:auto;margin:0;padding:7px 10px;border:0;border-radius:0;background:#fff;color:#14202b;font-size:13px;font-weight:600}.lg button+button{border-inline-start:1px solid #d5dde5}.lg button[aria-pressed=true]{background:#14202b;color:#fff}
h1{margin:0 0 4px;font-size:22px}p{margin:0 0 16px;color:#5b6977;font-size:14px;line-height:1.8}label{display:block;font-size:13px;font-weight:600;margin:12px 0 6px}
input{width:100%;padding:11px 12px;border:1px solid #b9c4cf;border-radius:10px;font:inherit;font-size:16px;direction:ltr;text-align:left;background:#fff;color:#14202b}
input:focus{outline:none;border-color:#9a6a1c;box-shadow:0 0 0 3px rgba(154,106,28,.18)}button{width:100%;margin-top:18px;padding:12px;border:0;border-radius:10px;background:#9a6a1c;color:#fff;font:inherit;font-size:15px;font-weight:700;cursor:pointer}
.m{min-height:20px;margin-top:12px;font-size:13px;color:#b42318;line-height:1.7}.ok{color:#067647}.f{margin-top:14px;font-size:12px;color:#5b6977;text-align:center;line-height:1.8}</style></head>
<body><div class="c"><div class="top"><div class="l">ح</div><div class="lg" role="group" aria-label="Language"><button type="button" data-lg="fa">فارسی</button><button type="button" data-lg="ar">العربية</button><button type="button" data-lg="en">English</button></div></div>
<h1 data-t="name"></h1><p data-t="intro"></p>
<form method="post" action="/api/login"><label for="u" data-t="user"></label><input id="u" name="u" autocomplete="username" autocapitalize="none" required value="${esc(user)}">
<label for="p" data-t="pass"></label><input id="p" name="p" type="password" autocomplete="current-password" required><button type="submit" data-t="go"></button></form>
<div class="m ${code === 'out' ? 'ok' : ''}" id="msg"></div><div class="f" data-t="foot"></div></div>
<script>(function(){
var T={fa:{name:'حساباتي',title:'ورود — حساباتي',intro:'نسخهٔ نمایشی نرم‌افزار حسابداری صرافی — با نام کاربری و رمزی که دریافت کرده‌اید وارد شوید.',user:'نام کاربری',pass:'رمز عبور',go:'ورود',foot:'حساب نمایشی ندارید؟ از صرافی درخواست کنید.',
 bad:'نام کاربری یا رمز عبور اشتباه است.',expired:'مهلت این حساب نمایشی تمام شده است. برای تمدید با صرافی تماس بگیرید.',revoked:'این حساب غیرفعال شده است.',locked:'تلاش‌های ناموفق زیاد بود؛ ۱۵ دقیقه دیگر دوباره امتحان کنید.',out:'از حساب خارج شدید.',err:'ارتباط با سرور برقرار نشد؛ دوباره امتحان کنید.'},
ar:{name:'حساباتي',title:'تسجيل الدخول — حساباتي',intro:'النسخة التجريبية لبرنامج محاسبة الصرافة — ادخل باسم المستخدم وكلمة المرور التي استلمتها.',user:'اسم المستخدم',pass:'كلمة المرور',go:'دخول',foot:'ليس لديك حساب تجريبي؟ اطلبه من الصرافة.',
 bad:'اسم المستخدم أو كلمة المرور غير صحيحة.',expired:'انتهت صلاحية هذا الحساب التجريبي. للتمديد تواصل مع الصرافة.',revoked:'تم إيقاف هذا الحساب.',locked:'محاولات فاشلة كثيرة؛ حاول مرة أخرى بعد ١٥ دقيقة.',out:'تم تسجيل الخروج.',err:'تعذّر الاتصال بالخادم؛ حاول مرة أخرى.'},
en:{name:'Hesabati',title:'Sign in — Hesabati',intro:'Demo of the exchange-office accounting software — sign in with the username and password you were given.',user:'Username',pass:'Password',go:'Sign in',foot:'No demo account? Ask the exchange office for one.',
 bad:'Wrong username or password.',expired:'This demo account has expired. Contact the exchange office to extend it.',revoked:'This account has been disabled.',locked:'Too many failed attempts; try again in 15 minutes.',out:'You have signed out.',err:'Could not reach the server; please try again.'}};
var code=${JSON.stringify(code || '')};
function get(){ try{ var l=(JSON.parse(localStorage.getItem('sarrafi_look')||'{}')||{}).lang; if(T[l]) return l; }catch(e){} var n=(navigator.language||'').slice(0,2); return n==='ar'?'ar':'fa'; }
function save(l){ try{ var o=JSON.parse(localStorage.getItem('sarrafi_look')||'{}')||{}; o.lang=l; localStorage.setItem('sarrafi_look',JSON.stringify(o)); }catch(e){} }
function apply(l){ var D=T[l]; document.documentElement.lang=l; document.documentElement.dir=l==='en'?'ltr':'rtl'; document.title=D.title;
  [].forEach.call(document.querySelectorAll('[data-t]'),function(e){ e.textContent=D[e.getAttribute('data-t')]; });
  document.getElementById('msg').textContent=code&&D[code]||'';
  [].forEach.call(document.querySelectorAll('[data-lg]'),function(b){ b.setAttribute('aria-pressed',String(b.getAttribute('data-lg')===l)); }); }
[].forEach.call(document.querySelectorAll('[data-lg]'),function(b){ b.onclick=function(){ var l=b.getAttribute('data-lg'); save(l); apply(l); }; });
apply(get());
})();</script></body></html>`;
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}
const redirect = (to, extra = []) => { const h = new Headers({ Location: to, 'cache-control': 'no-store' }); extra.forEach(c => h.append('Set-Cookie', c)); return new Response(null, { status: 303, headers: h }); };
const clear = ['hd_s=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax', 'hd_u=; Path=/; Max-Age=0; Secure; SameSite=Lax', 'hd_e=; Path=/; Max-Age=0; Secure; SameSite=Lax'];

export default async function middleware(req) {
  const url = new URL(req.url);
  if (url.pathname === '/api/logout') return redirect('/login?m=out', clear);
  if (url.pathname === '/login') return loginPage((url.searchParams.get('m') || '').replace(/[^a-z]/g, ''), url.searchParams.get('u') || '');
  if (url.pathname === '/api/login') {
    if (req.method !== 'POST') return redirect('/login');
    let u = '', p = '';
    try { const f = await req.formData(); u = String(f.get('u') || '').trim(); p = String(f.get('p') || ''); } catch (e) {}
    let r; try { r = await rpc('demo_login', { p_user: u, p_pass: p }); } catch (e) { return redirect('/login?m=err&u=' + encodeURIComponent(u)); }
    if (!r || !r.ok) return redirect('/login?m=' + (r?.err || 'bad') + '&u=' + encodeURIComponent(u));
    const age = Math.max(60, Math.floor((new Date(r.expires_at).getTime() - Date.now()) / 1000));
    return redirect('/', [`hd_s=${r.token}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`, `hd_u=${encodeURIComponent(r.username)}; Path=/; Max-Age=${age}; Secure; SameSite=Lax`, `hd_e=${encodeURIComponent(r.expires_at)}; Path=/; Max-Age=${age}; Secure; SameSite=Lax`]);
  }
  const tok = cookies(req).hd_s;
  let ok = false;
  if (tok && /^[0-9a-f]{48}$/.test(tok)) { try { ok = await rpc('demo_check', { p_token: tok }) === true; } catch (e) { ok = false; } }
  if (ok) return next();
  const isPage = url.pathname === '/' || url.pathname.endsWith('.html');
  if (isPage) return redirect('/login' + (tok ? '?m=expired' : ''), tok ? clear : []);
  return new Response('Unauthorized', { status: 401, headers: { 'cache-control': 'no-store' } });
}
