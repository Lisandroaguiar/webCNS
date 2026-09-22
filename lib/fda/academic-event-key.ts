import { createHash } from "node:crypto";

// Version 2 replaced legacy raw-line hashing with normalized semantic input.
export const ACADEMIC_EVENT_KEY_VERSION = 2;

export function normalizeAcademicEventKeyPart(value: string) {
  return value.replace(/\s+/g, " ").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

export function buildAcademicEventExternalKey(event: { title: string; startsAt?: string | null; endsAt?: string | null }) {
  return createHash("sha256")
    .update(`${normalizeAcademicEventKeyPart(event.title)}|${event.startsAt ?? ""}|${event.endsAt ?? ""}`)
    .digest("hex")
    .slice(0, 32);
}

export type AcademicEventKeyRow = {
  id: number;
  source_id: number;
  external_key: string;
  title: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at?: string | null;
};

export type AcademicEventKeyBackfill = {
  canonicalId: number;
  duplicateId: number | null;
  oldKey: string;
  newKey: string;
  status: string;
};

export function planAcademicEventKeyBackfill(rows: AcademicEventKeyRow[]) {
  const groups = new Map<string, AcademicEventKeyRow[]>();
  for (const row of rows) {
    const newKey = buildAcademicEventExternalKey({ title: row.title, startsAt: row.starts_at, endsAt: row.ends_at });
    const groupKey = `${row.source_id}|${newKey}`;
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), row]);
  }

  const plans: AcademicEventKeyBackfill[] = [];
  for (const group of Array.from(groups.values())) {
    const newKey = buildAcademicEventExternalKey({ title: group[0].title, startsAt: group[0].starts_at, endsAt: group[0].ends_at });
    const legacyRows = group.filter(row => row.external_key !== newKey);
    if (!legacyRows.length) continue;
    const canonical = [...legacyRows].sort((left, right) => {
      if (left.status === "published" && right.status !== "published") return -1;
      if (right.status === "published" && left.status !== "published") return 1;
      return left.id - right.id;
    })[0];
    const duplicate = group.find(row => row.id !== canonical.id && row.external_key === newKey) ?? null;
    plans.push({ canonicalId: canonical.id, duplicateId: duplicate?.id ?? null, oldKey: canonical.external_key, newKey, status: canonical.status });
  }
  return plans.sort((left, right) => left.canonicalId - right.canonicalId);
}
