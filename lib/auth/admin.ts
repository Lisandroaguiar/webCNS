import "server-only";

export function isAdminEmail(email?: string | null) {
  const allowed = (process.env.CRONOPIOS_ADMIN_EMAILS ?? "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email && allowed.includes(email.toLowerCase()));
}
