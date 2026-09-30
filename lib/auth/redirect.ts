export function safeNextPath(value: string | null, fallback = "/dashboard") {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

export function authCallbackUrl(origin: string, next: string | null) {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", safeNextPath(next));
  return callback.toString();
}
