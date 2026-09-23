import { normalizeSubjectName } from "./analytic-parser";

export type WeekSchedule = {
  id: number;
  subject_id: string | null;
  raw_subject_name: string;
  weekday: string;
  start_time: string | null;
  end_time: string | null;
  commission: string | null;
  classroom: string | null;
  campus: string | null;
  curriculum: string | null;
  academic_year: number;
  semester: number | null;
  status: string;
};

export const weekDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] as const;

export function currentAcademicPeriod(date = new Date()) {
  const local = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit" }).format(date);
  const [year, month] = local.split("-").map(Number);
  return { academicYear: year, semester: month < 7 ? 1 : 2 };
}

export function isCurrentSchedule(schedule: WeekSchedule, period: { academicYear: number; semester: number }, curriculum: string) {
  return schedule.academic_year === period.academicYear && schedule.curriculum === curriculum && (schedule.semester === period.semester || schedule.semester == null);
}

export function timeMinutes(value: string | null) {
  const match = value?.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]), minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

export function sortWeekSchedules(schedules: WeekSchedule[]) {
  return [...schedules].sort((a, b) => {
    const day = weekDays.indexOf(a.weekday as typeof weekDays[number]) - weekDays.indexOf(b.weekday as typeof weekDays[number]);
    if (day) return day;
    return (timeMinutes(a.start_time) ?? Infinity) - (timeMinutes(b.start_time) ?? Infinity);
  });
}

export function sameSubject(a: WeekSchedule, b: WeekSchedule) {
  if (a.subject_id && b.subject_id) return a.subject_id === b.subject_id;
  return normalizeSubjectName(a.raw_subject_name) === normalizeSubjectName(b.raw_subject_name);
}

export function detectScheduleConflicts(schedules: WeekSchedule[]) {
  const conflicts: Array<{ first: WeekSchedule; second: WeekSchedule }> = [];
  for (let index = 0; index < schedules.length; index++) {
    for (let other = index + 1; other < schedules.length; other++) {
      const a = schedules[index], b = schedules[other];
      if (a.weekday !== b.weekday) continue;
      const aStart = timeMinutes(a.start_time), aEnd = timeMinutes(a.end_time);
      const bStart = timeMinutes(b.start_time), bEnd = timeMinutes(b.end_time);
      if (aStart == null || aEnd == null || bStart == null || bEnd == null) continue;
      if (aStart < bEnd && bStart < aEnd) conflicts.push({ first: a, second: b });
    }
  }
  return conflicts;
}
