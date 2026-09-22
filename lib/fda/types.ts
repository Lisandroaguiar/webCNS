export type SourceType = "academic_calendar" | "course_schedule" | "schedule_fallback";
export type DraftStatus = "draft" | "verified" | "published" | "stale";

export type NormalizedEvent = {
  externalKey: string;
  title: string;
  eventType: "course_registration" | "final_registration" | "final_exam_period" | "semester_start" | "semester_end" | "academic_break" | "other";
  registrationStart?: string;
  registrationEnd?: string;
  startsAt?: string;
  endsAt?: string;
  academicYear: number;
  semester?: 1 | 2;
  degree?: string;
  curriculum?: "old" | "new";
  sourceUrl: string;
  sourceLabel: string;
};

export type NormalizedSchedule = {
  externalKey: string;
  rawSubjectName: string;
  curriculum?: "old" | "new";
  academicYear: number;
  semester?: 1 | 2;
  courseYear?: number;
  commission?: string;
  weekday: string;
  startTime: string;
  endTime?: string;
  campus?: string;
  classroom?: string;
  notes?: string;
  sourceUrl: string;
  sourceLabel: string;
};

export type ImportResult = {
  events: NormalizedEvent[];
  schedules: NormalizedSchedule[];
  warnings: string[];
  checksum: string;
};
