import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

import { APP_NAME } from "@/lib/format";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Monthly revenue, expenses and profit share for the businesses we invest in.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1330" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers>
          <Aurora />
          {children}
        </Providers>
      </body>
    </html>
  );
}

function Aurora() {
  return (
    <div aria-hidden className="aurora pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <span style={{ background: "var(--revenue)", width: "38vw", height: "38vw", top: "-12vw", left: "-8vw" }} />
      <span style={{ background: "var(--investor)", width: "44vw", height: "44vw", top: "20vh", right: "-14vw", animationDelay: "-8s" }} />
      <span style={{ background: "var(--profit)", width: "30vw", height: "30vw", bottom: "-10vw", left: "30vw", animationDelay: "-15s" }} />
      <span style={{ background: "var(--manager)", width: "18vw", height: "18vw", top: "48vh", left: "8vw", opacity: 0.3, animationDelay: "-4s" }} />
    </div>
  );
}
