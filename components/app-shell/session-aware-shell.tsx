import type { User } from "@supabase/supabase-js";
import { AuthenticatedShell } from "@/components/app-shell/authenticated-shell";
import { PublicHeader } from "@/components/app-shell/public-header";

export function SessionAwareShell({ user, children }: { user: User | null; children: React.ReactNode }) {
  if (user) return <AuthenticatedShell user={user}>{children}</AuthenticatedShell>;
  return <main className="min-h-screen bg-cronopios-paper"><PublicHeader />{children}</main>;
}
