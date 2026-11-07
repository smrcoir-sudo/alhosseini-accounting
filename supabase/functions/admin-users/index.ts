// Admin-only user management: create a login, set a new password, or remove a user.
// The caller must be an active admin in public.members.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { persistSession: false } });

  // identify caller from their JWT
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who?.user) return json({ error: "unauthorized" }, 401);
  const { data: me } = await admin.from("members").select("role,active").eq("uid", who.user.id).maybeSingle();
  if (!me || !me.active || me.role !== "admin") return json({ error: "forbidden" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const action = String(body.action || "");

  if (action === "create") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const role = body.role === "admin" ? "admin" : "user";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "invalid_email" }, 400);
    if (password.length < 8) return json({ error: "weak_password" }, 400);
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
    if (error) return json({ error: error.message }, 400);
    const uid = data.user!.id;
    const { error: mErr } = await admin.from("members").upsert({ uid, email, name, role, active: true });
    if (mErr) return json({ error: mErr.message }, 500);
    return json({ ok: true, uid });
  }

  if (action === "password") {
    const uid = String(body.uid || "");
    const password = String(body.password || "");
    if (password.length < 8) return json({ error: "weak_password" }, 400);
    const { error } = await admin.auth.admin.updateUserById(uid, { password });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  if (action === "delete") {
    const uid = String(body.uid || "");
    if (uid === who.user.id) return json({ error: "cannot_delete_self" }, 400);
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: "unknown_action" }, 400);
});
