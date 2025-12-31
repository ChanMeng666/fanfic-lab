import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { CopilotProvider } from "@/components/providers/CopilotProvider";
import { StackProvider } from "@/components/providers/StackProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FanFic Lab - AI-Powered Fanfiction Writing",
  description:
    "Create amazing fanfiction with AI assistance. Smart Editor, Creative Wizard, and Community features for fandom writers.",
  keywords: [
    "fanfiction",
    "fanfic",
    "AI writing",
    "creative writing",
    "fandom",
    "shipping",
    "OTP",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StackProvider>
          <CopilotProvider>
            {children}
            <Toaster />
          </CopilotProvider>
        </StackProvider>
      </body>
    </html>
  );
}
