import { redirect } from "next/navigation";

// The old editorial Queues are retired (the Atlas is now auto-published fact
// sheets). The admin home goes straight to the fact-sheet manager.
export default function AdminHome() {
  redirect("/admin/factsheets");
}
