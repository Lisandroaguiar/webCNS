import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateReminderDate, type ReminderType } from "@/lib/notifications/reminders";
import { classifyPushFailure, shouldRecalculateReminder } from "@/lib/notifications/push-policy";

type PushTransport = (subscription: webpush.PushSubscription, payload: string) => Promise<unknown>;

function configureVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) throw new Error("Falta configurar VAPID para Web Push.");
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function sendDueNotifications(options: { now?: Date; transport?: PushTransport } = {}) {
  configureVapid();
  const admin = createAdminClient();
  const now = options.now ?? new Date();
  const transport = options.transport ?? ((subscription, payload) => webpush.sendNotification(subscription, payload));
  const { data: reminders, error } = await admin.from("event_reminders")
    .select("id,user_id,academic_event_id,reminder_type,scheduled_for,academic_events!inner(title,status)")
    .eq("enabled", true).lte("scheduled_for", now.toISOString()).eq("academic_events.status", "published");
  if (error) throw new Error(error.message);
  const summary = { due: reminders?.length ?? 0, sent: 0, failed: 0, expired: 0, skipped: 0 };

  for (const reminder of reminders ?? []) {
    const { data: subscriptions } = await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth,failure_count").eq("user_id", reminder.user_id).is("disabled_at", null);
    for (const subscription of subscriptions ?? []) {
      const { data: delivery, error: claimError } = await admin.from("notification_deliveries").insert({
        user_id: reminder.user_id, reminder_id: reminder.id, subscription_id: subscription.id,
        scheduled_for: reminder.scheduled_for, status: "pending"
      }).select("id").single();
      if (claimError?.code === "23505") { summary.skipped += 1; continue; }
      if (claimError || !delivery) throw new Error(claimError?.message ?? "No se pudo reservar el envío.");
      const event = Array.isArray(reminder.academic_events) ? reminder.academic_events[0] : reminder.academic_events;
      const payload = JSON.stringify({ title: "Mesita Virtual", body: event?.title ?? "Tenés una fecha académica próxima.", eventId: reminder.academic_event_id, targetUrl: `/agenda#evento-${reminder.academic_event_id}` });
      try {
        await transport({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload);
        await admin.from("notification_deliveries").update({ status: "sent", attempted_at: new Date().toISOString() }).eq("id", delivery.id);
        await admin.from("push_subscriptions").update({ last_success_at: new Date().toISOString(), failure_count: 0 }).eq("id", subscription.id);
        summary.sent += 1;
      } catch (caught) {
        const { statusCode, expired } = classifyPushFailure(caught);
        await admin.from("notification_deliveries").update({ status: expired ? "expired" : "failed", attempted_at: new Date().toISOString(), error_code: statusCode ? String(statusCode) : "temporary" }).eq("id", delivery.id);
        if (expired) await admin.from("push_subscriptions").update({ disabled_at: new Date().toISOString() }).eq("id", subscription.id);
        else await admin.from("push_subscriptions").update({ failure_count: subscription.failure_count + 1 }).eq("id", subscription.id);
        summary[expired ? "expired" : "failed"] += 1;
      }
    }
  }
  return summary;
}

export async function recalculatePendingRemindersForEvent(eventId: number) {
  const admin = createAdminClient();
  const { data: event, error } = await admin.from("academic_events").select("id,registration_start,registration_end,starts_at").eq("id", eventId).single();
  if (error || !event) throw new Error(error?.message ?? "Evento inexistente.");
  const { data: reminders } = await admin.from("event_reminders").select("id,reminder_type,notification_deliveries(status)").eq("academic_event_id", eventId).eq("enabled", true);
  for (const reminder of reminders ?? []) {
    const deliveries = reminder.notification_deliveries ?? [];
    if (!shouldRecalculateReminder(deliveries)) continue;
    const scheduled = calculateReminderDate(event, reminder.reminder_type as ReminderType);
    if (scheduled && scheduled > new Date()) await admin.from("event_reminders").update({ scheduled_for: scheduled.toISOString(), updated_at: new Date().toISOString() }).eq("id", reminder.id);
  }
}
