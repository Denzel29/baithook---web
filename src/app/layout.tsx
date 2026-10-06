import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Providers } from "@/providers/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "PhishGuard — Security Awareness Training",
  description: "Phishing simulation and security awareness training platform.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className="h-screen w-full min-w-[320px] bg-white antialiased"
        suppressHydrationWarning={true}
      >
        <main className="h-full w-full">
          <Toaster position="top-center" duration={5000} richColors />
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
