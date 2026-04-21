import Image from "next/image";
import Link from "next/link";
import { Feather, Sparkles } from "lucide-react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
      >
        <div className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-32 -right-24 size-[24rem] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-10 lg:py-16">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_minmax(360px,440px)] lg:gap-14 items-center">
          <aside className="hidden lg:flex flex-col gap-6">
            <Link
              href="/"
              className="flex items-center gap-3 group w-fit"
              aria-label="FanFic Lab"
            >
              <div className="flex items-center justify-center size-12 rounded-2xl overflow-hidden transition-transform group-hover:scale-105">
                <Image
                  src="/logo/fanfic-lab-logo.svg"
                  alt="FanFic Lab"
                  width={48}
                  height={48}
                  className="size-12"
                  priority
                />
              </div>
              <span className="font-display text-2xl font-semibold text-foreground">
                FanFic Lab
              </span>
            </Link>
            <h1 className="font-display text-4xl xl:text-5xl font-bold text-foreground leading-tight">
              {title}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-md">
              {subtitle}
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center size-7 rounded-lg bg-primary/15 text-primary shrink-0">
                  <Feather className="size-3.5" />
                </span>
                <span>一句话描述想看的剧情，AI 写出风格贴合的同人短篇</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center size-7 rounded-lg bg-accent/15 text-accent shrink-0">
                  <Sparkles className="size-3.5" />
                </span>
                <span>角色到位、文风稳定，免费且可续写</span>
              </li>
            </ul>
          </aside>

          <main className="w-full">
            <div className="lg:hidden mb-6 flex flex-col items-center text-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2"
                aria-label="FanFic Lab"
              >
                <div className="flex items-center justify-center size-9 rounded-xl overflow-hidden">
                  <Image
                    src="/logo/fanfic-lab-logo.svg"
                    alt="FanFic Lab"
                    width={36}
                    height={36}
                    className="size-9"
                    priority
                  />
                </div>
                <span className="font-display text-xl font-semibold text-foreground">
                  FanFic Lab
                </span>
              </Link>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground max-w-xs">
                {subtitle}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface/95 backdrop-blur-sm shadow-xl p-6 sm:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
