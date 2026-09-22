import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { BrandMark } from "@/components/brand/brand-mark";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <main className="min-h-screen bg-cronopios-paper px-5 py-8 md:px-8"><div className="mx-auto max-w-6xl"><BrandMark /><div className="mt-10"><OnboardingShell /></div></div></main>;
}
