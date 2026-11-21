import { FileLock2 } from "lucide-react";

/**
 * The one way to get a landscape's full investment table: ask for it.
 * Full tables are shared only on request (a personal, view-only, expiring
 * link after an editor approves), never as downloads, so this is a request
 * button, not a download. /request-access lives on the Ask branch.
 */
export function RequestTableCta({ slug, className = "" }: { slug: string; className?: string }) {
  const href = `/request-access?${new URLSearchParams({ landscape: slug }).toString()}`;
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-2 ${className}`}>
      <a
        href={href}
        className="self-start inline-flex items-center gap-2 min-h-11 px-5 rounded-full bg-deep-teal text-paper text-[14px] font-medium text-left py-2 hover:bg-teal active:scale-[0.97] transition-[background-color,transform] duration-200 ease-out-expo"
      >
        <FileLock2 size={16} strokeWidth={1.8} aria-hidden />
        Request the full investment table
      </a>
      <p className="m-0 text-[13.5px] leading-snug text-muted max-w-[44ch]">
        Shared on request with a personal, view-only link after an editor approves.
      </p>
    </div>
  );
}
