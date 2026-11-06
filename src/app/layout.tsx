import type { Metadata, Viewport } from "next";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import { Shell } from "@/components/shell/Shell";

export const metadata: Metadata = {
  title: "NEXUS — Global Financial Intelligence System",
  description: "Interactive financial intelligence environment: global capital network, markets, macro, company analysis, portfolio risk and quantitative modeling.",
};

export const viewport: Viewport = {
  themeColor: "#020306",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="spectral" suppressHydrationWarning>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
