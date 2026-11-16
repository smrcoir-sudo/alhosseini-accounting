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
const MSG = { bad: 'نام کاربری یا رمز عبور اشتباه است.', expired: 'مهلت این حساب نمایشی تمام شده است. برای تمدید با صرافی تماس بگیرید.', revoked: 'این حساب غیرفعال شده است.', locked: 'تلاش‌های ناموفق زیاد بود؛ ۱۵ دقیقه دیگر دوباره امتحان کنید.', out: 'از حساب خارج شدید.', need: '', err: 'ارتباط با سرور برقرار نشد؛ دوباره امتحان کنید.' };

function loginPage(code, user) {
  const m = MSG[code] ?? '';
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>ورود — حساباتي</title><link rel="icon" href="/icons/icon-192.png">
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#14202b;font-family:Vazirmatn,Tahoma,system-ui,sans-serif;padding:16px;color:#14202b}
.c{background:#fff;border-radius:16px;padding:28px 24px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.l{width:56px;height:56px;border-radius:14px;background:linear-gradient(145deg,#22364a,#14202b);color:#d8b25a;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;margin-bottom:12px}
h1{margin:0 0 4px;font-size:22px}p{margin:0 0 16px;color:#5b6977;font-size:14px;line-height:1.8}label{display:block;font-size:13px;font-weight:600;margin:12px 0 6px}
input{width:100%;padding:11px 12px;border:1px solid #b9c4cf;border-radius:10px;font:inherit;font-size:16px;direction:ltr;text-align:left;background:#fff;color:#14202b}
input:focus{outline:none;border-color:#9a6a1c;box-shadow:0 0 0 3px rgba(154,106,28,.18)}button{width:100%;margin-top:18px;padding:12px;border:0;border-radius:10px;background:#9a6a1c;color:#fff;font:inherit;font-size:15px;font-weight:700;cursor:pointer}
.m{min-height:20px;margin-top:12px;font-size:13px;color:#b42318;line-height:1.7}.ok{color:#067647}.f{margin-top:14px;font-size:12px;color:#5b6977;text-align:center;line-height:1.8}</style></head>
<body><div class="c"><div class="l">ح</div><h1>حساباتي</h1><p>نسخهٔ نمایشی نرم‌افزار حسابداری صرافی — با نام کاربری و رمزی که دریافت کرده‌اید وارد شوید.</p>
<form method="post" action="/api/login"><label for="u">نام کاربری</label><input id="u" name="u" autocomplete="username" autocapitalize="none" required value="${esc(user)}">
<label for="p">رمز عبور</label><input id="p" name="p" type="password" autocomplete="current-password" required><button type="submit">ورود</button></form>
<div class="m ${code === 'out' ? 'ok' : ''}">${esc(m)}</div><div class="f">حساب نمایشی ندارید؟ از صرافی درخواست کنید.</div></div></body></html>`;
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}
const redirect = (to, extra = []) => { const h = new Headers({ Location: to, 'cache-control': 'no-store' }); extra.forEach(c => h.append('Set-Cookie', c)); return new Response(null, { status: 303, headers: h }); };
const clear = ['hd_s=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax', 'hd_u=; Path=/; Max-Age=0; Secure; SameSite=Lax', 'hd_e=; Path=/; Max-Age=0; Secure; SameSite=Lax'];

export default async function middleware(req) {
  const url = new URL(req.url);
  if (url.pathname === '/api/logout') return redirect('/login?m=out', clear);
  if (url.pathname === '/login') return loginPage(url.searchParams.get('m') || '', url.searchParams.get('u') || '');
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
