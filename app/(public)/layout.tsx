import { BrandBar } from "@/components/layout/BrandBar";
import { Footer } from "@/components/layout/Footer";
import { FloatingAsk } from "@/components/global/FloatingAsk";

/**
 * Chrome for the public site (everything in the (public) route group). The
 * /admin console lives outside this group and renders its own shell, so it
 * never inherits the marketing header, footer, or floating Ask widget.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-to-content">
        Skip to content
      </a>
      <BrandBar />
      <main id="main" className="relative z-10">
        {children}
      </main>
      <Footer />
      <FloatingAsk />
    </>
  );
}
