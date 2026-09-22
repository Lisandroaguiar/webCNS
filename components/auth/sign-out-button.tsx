"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    const { error } = await createClient().auth.signOut({ scope: "local" });
    if (error) {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/auth/signout";
      document.body.appendChild(form);
      form.submit();
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      className="mt-3 flex min-h-11 items-center gap-2 text-sm font-bold text-cronopios-ink/55 hover:text-cronopios-magenta"
    >
      <LogOut size={16} /> Cerrar sesión
    </button>
  );
}
