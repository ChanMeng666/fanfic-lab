import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Source_Sans_3,
  Lora,
  JetBrains_Mono,
} from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { StackProvider } from "@/components/providers/StackProvider";
import { ConditionalHeader } from "@/components/layout";
import "./globals.css";

// Display font - Literary, elegant headers
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Body font - Clean, modern interface text
const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Prose font - Comfortable reading for story content
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

// Mono font - Code, metadata
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FanFic Lab - Your AI Writing Partner",
  description:
    "Write stories together with AI. FanFic Lab is your collaborative writing studio for fanfiction, featuring smart continuation, character consistency, and creative assistance.",
  keywords: [
    "fanfiction",
    "fanfic",
    "AI writing",
    "creative writing",
    "fandom",
    "collaborative writing",
    "story writing",
    "AI assistant",
  ],
  openGraph: {
    title: "FanFic Lab - Your AI Writing Partner",
    description:
      "Write stories together with AI. Your collaborative writing studio for fanfiction.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${cormorant.variable} ${sourceSans.variable} ${lora.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <StackProvider>
          <Suspense fallback={null}>
            <ConditionalHeader />
          </Suspense>
          {children}
          <Toaster />
        </StackProvider>
      </body>
    </html>
  );
}
