// «دستیار» — answers "where is / how do I record …" questions for the accounting app with Claude.
// Inactive until the admin adds an ANTHROPIC_API_KEY secret in Supabase (Edge Functions → Secrets).
// Callers: signed-in members of the main app (Supabase JWT) or demo users (x-demo-token, checked with demo_check).
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-demo-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const MODEL = Deno.env.get("ASSISTANT_MODEL") || "claude-haiku-5-5";
const LANG: Record<string, string> = { fa: "Persian (Farsi)", ar: "Arabic", en: "English" };
const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, err: "method" }, 405);
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ ok: false, err: "not_configured" });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // who is asking
  let who = "", limit = 150;
  const demoTok = req.headers.get("x-demo-token");
  if (demoTok) {
    const { data } = await admin.rpc("demo_check", { p_token: demoTok });
    if (data !== true) return json({ ok: false, err: "auth" }, 401);
    who = "demo:" + demoTok.slice(0, 16); limit = 40;
    const { data: all } = await admin.rpc("ai_bump", { p_who: "demo:*" });
    if ((all as number) > 600) return json({ ok: false, err: "limit" });
  } else {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return json({ ok: false, err: "auth" }, 401);
    const { data: m } = await admin.from("members").select("active").eq("uid", u.user.id).maybeSingle();
    if (!m?.active) return json({ ok: false, err: "auth" }, 403);
    who = u.user.id;
  }
  const { data: n } = await admin.rpc("ai_bump", { p_who: who });
  if ((n as number) > limit) return json({ ok: false, err: "limit" });

  let b: any; try { b = await req.json(); } catch { return json({ ok: false, err: "bad" }, 400); }
  const q = clip(b.q, 600).trim(); if (!q) return json({ ok: false, err: "bad" }, 400);
  const lang = LANG[b.lang] ? b.lang : "fa";
  const feat = (a: any[], n: number) => (Array.isArray(a) ? a : []).slice(0, n).map((x: any) => ({ id: clip(x.id, 8), t: clip(x.t, 80), path: clip(x.path, 120), steps: Array.isArray(x.steps) ? x.steps.slice(0, 8).map((s: any) => clip(s, 220)) : undefined }));
  const best = feat(b.ctx, 10), more = feat(b.more, 150);

  const system = `You are «دستیار», the built-in help assistant of a web accounting app for currency-exchange offices (صرافی).
The user says what they want to do. Using ONLY the app features listed below, tell them where to find it and how to record it.
- Reply in the language the user wrote in; if unclear, reply in ${LANG[lang]}.
- Be brief and practical: one short sentence, then at most 6 numbered steps. Use the exact feature names and paths given (e.g. منوی «سند جدید» ← «خرید و فروش»). Never invent menus, buttons or features.
- If nothing listed fits, say plainly that this feature isn't in the app and suggest the closest listed one.
- If the user typed a complete transaction (amount + currency), add that they can press «پر کردن فرم» above to fill the form, then check it and press «ثبت».
- Do not give financial, tax or legal advice; you only explain how to use the app.
- Last line, exactly: OPEN: <ids of the 1–2 most relevant features, comma-separated> or OPEN: none
Current page: ${clip(b.page, 20)}. User is ${b.admin ? "an administrator" : "an employee (some admin pages may be hidden)"}.
BEST MATCHES (with steps): ${JSON.stringify(best)}
OTHER FEATURES: ${JSON.stringify(more.map((x) => ({ id: x.id, t: x.t, path: x.path })))}`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 700, system, messages: [{ role: "user", content: q }] }),
  });
  if (!r.ok) { console.error("anthropic", r.status, (await r.text()).slice(0, 300)); return json({ ok: false, err: "upstream" }); }
  const d = await r.json();
  let text = (d.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
  let open: string[] = [];
  const m = text.match(/\n?OPEN:\s*([^\n]*)\s*$/i);
  if (m) { text = text.slice(0, m.index).trim(); open = m[1].split(/[,\s]+/).filter((x) => /^i\d+$/.test(x)).slice(0, 2); }
  return json({ ok: true, answer: text, open });
});
