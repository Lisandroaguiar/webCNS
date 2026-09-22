export const ACADEMIC_TIMEZONE = "America/Argentina/Buenos_Aires";
export const DEFAULT_ACADEMIC_NOTIFICATION_TIME = "09:00";
export const ARGENTINA_UTC_OFFSET = "-03:00";

export const REMINDER_TYPES = ["registration_open", "registration_closing_24h", "registration_last_day", "event_start"] as const;
export type ReminderType = typeof REMINDER_TYPES[number];

export type ReminderEvent = {
  registration_start?: string | null;
  registration_end?: string | null;
  starts_at?: string | null;
};

function localAcademicInstant(date: string) {
  return new Date(`${date}T${DEFAULT_ACADEMIC_NOTIFICATION_TIME}:00${ARGENTINA_UTC_OFFSET}`);
}

export function calculateReminderDate(event: ReminderEvent, type: ReminderType) {
  const sourceDate = type === "registration_open" ? event.registration_start
    : type === "registration_closing_24h" || type === "registration_last_day" ? event.registration_end
      : event.starts_at;
  if (!sourceDate) return null;
  const instant = localAcademicInstant(sourceDate);
  if (type === "registration_closing_24h") instant.setTime(instant.getTime() - 24 * 60 * 60 * 1000);
  return instant;
}

export function availableReminderTypes(event: ReminderEvent, now = new Date()) {
  return REMINDER_TYPES.filter(type => {
    const scheduled = calculateReminderDate(event, type);
    return scheduled && scheduled > now;
  });
}

export function reminderLabel(type: ReminderType) {
  return ({
    registration_open: "Cuando abra la inscripción",
    registration_closing_24h: "24 horas antes del cierre",
    registration_last_day: "El último día de inscripción",
    event_start: "Cuando empiece el evento"
  } as const)[type];
}
