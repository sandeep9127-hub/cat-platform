import { listOrgsAdmin } from "@/lib/db/directory";
import { AdminOrgWebsites } from "@/components/admin/AdminOrgWebsites";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organisations · Admin" };

export default async function AdminOrganizationsPage() {
  const orgs = await listOrgsAdmin();
  return (
    <div className="max-w-[1100px] mx-auto px-5 sm:px-7 lg:px-10 py-10">
      <h1 className="font-sans font-semibold text-[clamp(28px,3.4vw,40px)] tracking-[-0.035em] text-ink">
        Organisations
      </h1>
      <p className="text-[14.5px] text-ink-soft leading-[1.6] mt-2 max-w-[64ch]">
        Vet the websites. Many were auto-sourced from the web at high confidence; eyeball
        them, fix any that are wrong, and paste in the ones that are missing. Saves on blur.
      </p>
      <div className="mt-7">
        <AdminOrgWebsites orgs={orgs} />
      </div>
    </div>
  );
}
