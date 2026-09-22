import { describe, expect, it } from "vitest";
import { classifyPushFailure, deliveryIdentity, shouldRecalculateReminder } from "./push-policy";

describe("push delivery policy", () => {
  it("uses one stable delivery identity across consecutive runs", () => {
    const first = new Set<string>();
    first.add(deliveryIdentity(10, 20));
    first.add(deliveryIdentity(10, 20));
    expect(first.size).toBe(1);
  });
  it("expires subscriptions on 410 and 404", () => {
    expect(classifyPushFailure({ statusCode: 410 }).expired).toBe(true);
    expect(classifyPushFailure({ statusCode: 404 }).expired).toBe(true);
  });
  it("keeps subscriptions enabled after a temporary failure", () => expect(classifyPushFailure({ statusCode: 503 }).expired).toBe(false));
  it("recalculates pending reminders but preserves sent history", () => {
    expect(shouldRecalculateReminder([{ status: "pending" }, { status: "failed" }])).toBe(true);
    expect(shouldRecalculateReminder([{ status: "sent" }])).toBe(false);
  });
});
