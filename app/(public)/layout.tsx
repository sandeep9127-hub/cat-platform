import { BrandBar } from "@/components/layout/BrandBar";
import { Footer } from "@/components/layout/Footer";

/**
 * Chrome for the public site (everything in the (public) route group). The
 * /admin console lives outside this group and renders its own shell.
 * The floating Ask widget was removed — Ask is now a single highlighted
 * button in the header (no duplicate entry points).
 */
// Voice is on only when the server has it switched on (same rule as
// voiceEnabled() in lib/ask/voice-keys.ts on the Ask branch; use that at merge).
const VOICE_ON =
  process.env.ASK_V2 === "on" && process.env.ASK_VOICE === "on" && !!process.env.SONIOX_API_KEY;

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-to-content">
        Skip to content
      </a>
      <BrandBar voice={VOICE_ON} />
      <main id="main" className="relative z-10">
        {children}
      </main>
      <Footer />
    </>
  );
}
