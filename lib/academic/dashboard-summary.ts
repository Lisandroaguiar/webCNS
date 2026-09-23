export type DashboardEvent = {
  title: string;
  event_type: string;
  registration_start: string | null;
  registration_end: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

export function localDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function progressSummary(rows: Array<{ status: string; grade: number | null }>, total: number) {
  const approved = rows.filter(item => item.status === "passed");
  const grades = approved.map(item => item.grade).filter((grade): grade is number => typeof grade === "number");
  return {
    approved: approved.length,
    percent: total ? Math.round(approved.length / total * 100) : 0,
    average: grades.length ? (grades.reduce((sum, grade) => sum + grade, 0) / grades.length).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—",
  };
}

function dayDistance(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
}

export function nextRelevantEvent<T extends DashboardEvent>(events: T[], today: string) {
  const candidates = events.flatMap(event => {
    const dates = event.event_type === "course_registration" || event.event_type === "final_registration"
      ? [event.registration_start, event.registration_end]
      : [event.starts_at, event.ends_at];
    return dates.filter((date): date is string => Boolean(date && date >= today)).map(date => ({ event, date, daysAway: dayDistance(today, date) }));
  }).filter(item => item.daysAway <= 45).sort((a, b) => a.daysAway - b.daysAway);
  return candidates[0] ?? null;
}

export type DashboardMeeting = { raw_subject_name: string; weekday: string | null; start_time: string | null; academic_year: number; semester: number | null; curriculum?: string | null; status?: string };
export const dashboardDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export function upcomingWeekMeetings<T extends DashboardMeeting>(meetings: T[], period: { academicYear: number; semester: number }, curriculum: string, date = new Date(), limit = 3) {
  const currentWeekday = (date.getDay() + 6) % 7;
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  return meetings.filter(item => item.academic_year === period.academicYear && (item.semester === period.semester || item.semester == null) &&
    (item.curriculum == null || item.curriculum === curriculum) && (!item.status || item.status === "published") && item.start_time && dashboardDays.includes(item.weekday ?? ""))
    .map(item => {
      const weekday = dashboardDays.indexOf(item.weekday!);
      const [hour, minute] = item.start_time!.split(":").map(Number);
      const minutes = hour * 60 + minute;
      return { item, distance: (weekday - currentWeekday + 7) % 7 + (weekday === currentWeekday && minutes < currentMinutes ? 7 : 0), minutes };
    }).sort((a, b) => a.distance - b.distance || a.minutes - b.minutes).slice(0, limit).map(entry => entry.item);
}
