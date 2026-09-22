const fs = require("node:fs");
const { createClient } = require("@supabase/supabase-js");
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

async function createUser(label) {
  const email = `sprint4-${label}-${Date.now()}@example.test`;
  const password = `T-${Date.now()}-${Math.random().toString(36).slice(2)}!Aa9`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  return { id: data.user.id, client };
}

(async () => {
  const a = await createUser("a"), b = await createUser("b");
  const endpoint = `https://push.example.test/${Date.now()}`;
  let subscriptionId, reminderId, deliveryId;
  try {
    ({ data: { id: subscriptionId } } = await admin.from("push_subscriptions").insert({ user_id: a.id, endpoint, p256dh: "fixture-p256dh", auth: "fixture-auth", user_agent: "Sprint 4 RLS test" }).select("id").single());
    ({ data: { id: reminderId } } = await admin.from("event_reminders").insert({ user_id: a.id, academic_event_id: 5, reminder_type: "event_start", scheduled_for: "2026-11-02T12:00:00Z" }).select("id").single());
    ({ data: { id: deliveryId } } = await admin.from("notification_deliveries").insert({ user_id: a.id, reminder_id: reminderId, subscription_id: subscriptionId, scheduled_for: "2026-11-02T12:00:00Z" }).select("id").single());
    const read = async (client, table) => (await client.from(table).select("id")).data?.length ?? 0;
    const updateB = await b.client.from("push_subscriptions").update({ user_agent: "forbidden" }).eq("id", subscriptionId).select("id");
    const duplicate = await admin.from("notification_deliveries").insert({ user_id: a.id, reminder_id: reminderId, subscription_id: subscriptionId, scheduled_for: "2026-11-02T12:00:00Z" });
    console.log(JSON.stringify({
      userA: { subscriptions: await read(a.client, "push_subscriptions"), reminders: await read(a.client, "event_reminders") },
      userB: { subscriptions: await read(b.client, "push_subscriptions"), reminders: await read(b.client, "event_reminders"), modifiedA: updateB.data?.length ?? 0 },
      anonymous: { subscriptions: await read(anon, "push_subscriptions"), reminders: await read(anon, "event_reminders"), deliveries: await read(anon, "notification_deliveries") },
      duplicateDeliveryRejected: duplicate.error?.code === "23505"
    }, null, 2));
  } finally {
    if (deliveryId) await admin.from("notification_deliveries").delete().eq("id", deliveryId);
    if (reminderId) await admin.from("event_reminders").delete().eq("id", reminderId);
    if (subscriptionId) await admin.from("push_subscriptions").delete().eq("id", subscriptionId);
    await admin.auth.admin.deleteUser(a.id); await admin.auth.admin.deleteUser(b.id);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
