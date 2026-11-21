import { redirect } from "next/navigation";

// The admin home is the Inbox: everything waiting for an editor, in one list.
export default function AdminHome() {
  redirect("/admin/inbox");
}
