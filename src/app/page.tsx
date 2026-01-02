"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, stagger, useAnimate } from "motion/react";
import {
  BookOpen,
  Sparkles,
  PenLine,
  Feather,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Floating, { FloatingElement } from "@/components/ui/parallax-floating";

// Literary themed images from Unsplash (known working URLs)
const floatingImages = [
  {
    url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80",
    alt: "Stack of old books",
    className: "top-[8%] left-[5%] md:left-[11%]",
    size: "w-20 h-28 md:w-28 md:h-40",
    depth: 0.5,
  },
  {
    url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80",
    alt: "Open book pages",
    className: "top-[5%] left-[60%] md:left-[68%]",
    size: "w-24 h-16 md:w-36 md:h-24",
    depth: 1,
  },
  {
    url: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&q=80",
    alt: "Library bookshelves",
    className: "top-[2%] left-[30%] md:left-[38%]",
    size: "w-16 h-24 md:w-24 md:h-36",
    depth: 2,
  },
  {
    url: "https://images.unsplash.com/photo-1474932430478-367dbb6832c1?w=400&q=80",
    alt: "Vintage typewriter",
    className: "top-[45%] left-[2%] md:left-[5%]",
    size: "w-24 h-20 md:w-32 md:h-28",
    depth: 1.5,
  },
  {
    url: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&q=80",
    alt: "Books and coffee",
    className: "top-[55%] md:top-[50%] left-[75%] md:left-[82%]",
    size: "w-20 h-20 md:w-28 md:h-28",
    depth: 2.5,
  },
  {
    url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80",
    alt: "Library reading room",
    className: "top-[75%] md:top-[72%] left-[8%] md:left-[15%]",
    size: "w-28 h-20 md:w-40 md:h-28",
    depth: 3,
  },
  {
    url: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80",
    alt: "Book and glasses",
    className: "top-[78%] md:top-[75%] left-[55%] md:left-[60%]",
    size: "w-20 h-20 md:w-28 md:h-28",
    depth: 1,
  },
  {
    url: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400&q=80",
    alt: "Old manuscript pages",
    className: "top-[25%] left-[80%] md:left-[88%]",
    size: "w-16 h-24 md:w-20 md:h-32",
    depth: 4,
  },
];

export default function Home() {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    animate(
      ".floating-image",
      { opacity: [0, 1], scale: [0.8, 1] },
      { duration: 0.5, delay: stagger(0.12) }
    );
  }, [animate]);

  return (
    <main
      ref={scope}
      className="relative h-screen w-full overflow-hidden bg-background"
    >
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

      {/* Floating book images layer */}
      <Floating sensitivity={-0.5} className="overflow-hidden z-0">
        {floatingImages.map((image, index) => (
          <FloatingElement
            key={index}
            depth={image.depth}
            className={image.className}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              className="floating-image"
            >
              <Image
                src={image.url}
                alt={image.alt}
                width={200}
                height={200}
                className={`${image.size} object-cover rounded-2xl shadow-xl hover:scale-105 duration-300 cursor-pointer transition-transform ring-1 ring-border/50`}
                unoptimized
              />
            </motion.div>
          </FloatingElement>
        ))}
      </Floating>

      {/* Centered hero content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        <motion.div
          className="text-center space-y-6 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          {/* AI Badge */}
          <Badge
            variant="secondary"
            className="gap-1.5 px-4 py-1.5 text-sm bg-surface/80 backdrop-blur-sm"
          >
            <Sparkles className="size-3.5 text-accent" />
            AI-Powered Writing Partner
          </Badge>

          {/* Logo and brand */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center justify-center size-12 md:size-14 rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <Feather className="size-6 md:size-7" />
            </div>
          </div>

          {/* Main headline */}
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground">
            FanFic Lab
          </h1>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-muted-foreground font-light">
            Where Stories{" "}
            <span className="text-primary font-medium">Come Alive</span>
          </p>

          {/* Description */}
          <p className="text-base md:text-lg text-muted-foreground/80 max-w-lg mx-auto leading-relaxed">
            Write fanfiction with an AI partner that understands your characters
            and helps bring your stories to life.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            <Link href="/wizard">
              <Button size="lg" className="gap-2 min-w-[180px] shadow-lg">
                <PenLine className="size-5" />
                Start Writing
              </Button>
            </Link>
            <Link href="/feed">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 min-w-[180px] bg-surface/50 backdrop-blur-sm"
              >
                <BookOpen className="size-5" />
                Explore Stories
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Bottom fade for scroll indication (optional) */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </main>
  );
}
