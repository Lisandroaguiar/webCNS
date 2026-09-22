import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { measureServerStep } from "@/lib/observability/performance";

export const getCurrentUser = cache(async () => {
  return measureServerStep("auth.getUser", async () => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  });
});
