import { OrganizationsExplorer } from "@/components/organizations/OrganizationsExplorer";

export const metadata = {
  title: "Organisations Atlas: who’s working where",
  description:
    "A searchable directory of organisations working on agroecology across India, mapped by where they work.",
};

export default function OrganizationsPage() {
  return <OrganizationsExplorer />;
}
