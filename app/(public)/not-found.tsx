import { NotFoundContent } from "@/components/layout/NotFoundContent";

export const metadata = { title: "Page not found" };

/** Not-found inside the public layout, so the header and footer stay. */
export default function PublicNotFound() {
  return <NotFoundContent />;
}
