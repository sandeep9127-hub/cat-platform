import { notFound } from "next/navigation";

/**
 * Catch-all for unknown public URLs. Specific routes always win; anything
 * unmatched lands here and renders app/(public)/not-found.tsx inside the
 * public layout (with header and footer) instead of the bare root 404.
 */
export default function MissingPage() {
  notFound();
}
