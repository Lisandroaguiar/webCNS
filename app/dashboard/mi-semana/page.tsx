import { redirect } from "next/navigation";

export default async function MiSemanaPage() {
  redirect("/dashboard/agenda");
}
