export function deliveryIdentity(reminderId: number, subscriptionId: number) { return `${reminderId}:${subscriptionId}`; }

export function classifyPushFailure(error: unknown) {
  const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
  return { statusCode, expired: statusCode === 404 || statusCode === 410 };
}

export function shouldRecalculateReminder(deliveries: Array<{ status: string }>) {
  return !deliveries.some(delivery => delivery.status === "sent");
}
