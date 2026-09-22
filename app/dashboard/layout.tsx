import { getCurrentUser } from "@/lib/supabase/current-user";
import { AuthenticatedShell } from "@/components/app-shell/authenticated-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return <AuthenticatedShell user={user}>{children}</AuthenticatedShell>;
}
