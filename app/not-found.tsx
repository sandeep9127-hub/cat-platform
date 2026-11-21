import { NotFoundContent } from "@/components/layout/NotFoundContent";

export const metadata = { title: "Page not found" };

/** Root fallback for paths outside the public layout (e.g. under /admin). */
export default function NotFound() {
  return (
    <main className="relative z-10">
      <NotFoundContent />
    </main>
  );
}
