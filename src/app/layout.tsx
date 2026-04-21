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
import { SITE_URL } from "@/lib/site";
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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FanFic Lab - AI 协作的同人文创作工坊",
    template: "%s | FanFic Lab",
  },
  description:
    "FanFic Lab 是为崩坏：星穹铁道同人爱好者打造的 AI 协作创作工坊。用一句话描述想看的剧情，AI 帮你写出风格贴合、角色到位的同人短篇。",
  keywords: [
    "同人文",
    "崩坏星穹铁道",
    "Honkai Star Rail",
    "HSR",
    "AI 写作",
    "fanfiction",
    "AI fanfic",
  ],
  openGraph: {
    title: "FanFic Lab - AI 协作的同人文创作工坊",
    description:
      "用一句话描述想看的剧情，AI 帮你写出风格贴合、角色到位的同人短篇。",
    type: "website",
    siteName: "FanFic Lab",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "FanFic Lab",
    description: "AI 协作的同人文创作工坊",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${cormorant.variable} ${sourceSans.variable} ${lora.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md"
        >
          跳到主内容
        </a>
        <StackProvider>
          <Suspense fallback={null}>
            <ConditionalHeader />
          </Suspense>
          <div id="main">{children}</div>
          <Toaster />
        </StackProvider>
      </body>
    </html>
  );
}
