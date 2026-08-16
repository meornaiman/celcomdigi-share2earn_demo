import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { LanguageProvider, ToastProvider } from "@/components/providers";
import { ServiceWorker } from "@/components/service-worker";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

/** Empty in development, "/<repo>" when the Pages workflow builds the export. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "CelcomDigi AIdealist",
  description:
    "Help when you need it, independence when you're ready. Ask someone you trust for help with a CelcomDigi task, or move your own number onto your own account.",
  manifest: `${basePath}/manifest.webmanifest`,
  applicationName: "AIdealist",
  appleWebApp: {
    capable: true,
    title: "AIdealist",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: `${basePath}/icon.svg`, type: "image/svg+xml" }],
    apple: [{ url: `${basePath}/apple-icon.png` }],
  },
};

export const viewport: Viewport = {
  themeColor: "#082B75",
  width: "device-width",
  initialScale: 1,
  // Left zoomable on purpose: pinch-zoom is an accessibility requirement.
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <LanguageProvider>
          <ToastProvider>{children}</ToastProvider>
        </LanguageProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
