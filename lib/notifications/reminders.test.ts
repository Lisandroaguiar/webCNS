import { describe, expect, it } from "vitest";
import { ACADEMIC_TIMEZONE, availableReminderTypes, calculateReminderDate } from "./reminders";

const event = { registration_start: "2026-11-02", registration_end: "2026-11-08", starts_at: "2026-11-09" };

describe("academic event reminders", () => {
  it("documents and uses the Argentina timezone", () => {
    expect(ACADEMIC_TIMEZONE).toBe("America/Argentina/Buenos_Aires");
    expect(calculateReminderDate(event, "registration_open")?.toISOString()).toBe("2026-11-02T12:00:00.000Z");
  });
  it("calculates registration opening", () => expect(calculateReminderDate(event, "registration_open")?.toISOString()).toBe("2026-11-02T12:00:00.000Z"));
  it("calculates closing 24 hours before", () => expect(calculateReminderDate(event, "registration_closing_24h")?.toISOString()).toBe("2026-11-07T12:00:00.000Z"));
  it("calculates the last registration day", () => expect(calculateReminderDate(event, "registration_last_day")?.toISOString()).toBe("2026-11-08T12:00:00.000Z"));
  it("calculates event start", () => expect(calculateReminderDate(event, "event_start")?.toISOString()).toBe("2026-11-09T12:00:00.000Z"));
  it("rejects reminders in the past", () => expect(availableReminderTypes(event, new Date("2027-01-01T00:00:00Z"))).toEqual([]));
  it("recalculates a pending reminder when the event date changes", () => {
    const previous = calculateReminderDate(event, "registration_last_day");
    const changed = calculateReminderDate({ ...event, registration_end: "2026-11-09" }, "registration_last_day");
    expect(changed?.getTime()).toBe(previous!.getTime() + 24 * 60 * 60 * 1000);
  });
});
