import type { Metadata } from "next";
import { headers } from "next/headers";
import { Space_Mono } from "next/font/google";
import { LandscapesPhase1Dashboard } from "@/components/dashboards/landscapes-phase1/Dashboard";
import { DashboardGate } from "@/components/dashboards/landscapes-phase1/Gate";
import { dashboardAccess } from "@/lib/dashboards/landscapes-phase1/access";
import { getPhase1Data } from "@/lib/dashboards/landscapes-phase1/sheet";
import { getClientIp } from "@/lib/security/ratelimit";
import { logShareView } from "@/lib/share/links";

/**
 * "All landscapes, Phase 1": the full investment dashboard. Open to signed-in
 * editors and admins, and to holders of an approved share link; everyone else
 * gets the gate page (no figures) with the request-access button.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "All landscapes, Phase 1",
  description: "CAT landscape investment plans, Phase 1: the full investment dashboard, shared on request.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--ld-font-mono", display: "swap" });

export default async function Page({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const sp = await searchParams;
  const access = await dashboardAccess();
  if (!access) {
    return (
      <div className={mono.variable}>
        <DashboardGate unavailable={sp.link === "unavailable"} />
      </div>
    );
  }
  if (access.kind === "link") {
    const h = await headers();
    await logShareView(access.link.id, getClientIp({ headers: h } as unknown as Request), h.get("user-agent"), "view");
  }

  const res = await getPhase1Data();
  if (!res.ok) {
    return (
      <div className={`${mono.variable} ld-page`}>
        <div className="ld">
          <div className="ld-card ld-error-card" role="alert">
            <h1 className="ld-h3">The dashboard couldn&apos;t load</h1>
            <p className="ld-sub">{res.error}</p>
            <p className="ld-sub">The figures come from the All-Landscape Phase 1 sheet. If its tabs or columns were renamed, the dashboard needs updating to match.</p>
          </div>
        </div>
      </div>
    );
  }

  const shareBar =
    access.kind === "link" ? (
      <p className="ld-share-bar" key="share-bar">
        <b>Shared view</b>
        <span>Shared with {access.link.label}. View only.</span>
        <span>This link works until {new Date(access.link.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.</span>
      </p>
    ) : undefined;

  const { landscapes, lines, cats } = res.data;
  return (
    <div className={mono.variable}>
      <LandscapesPhase1Dashboard landscapes={landscapes} lines={lines} cats={cats} canNotes shareBar={shareBar} />
    </div>
  );
}
