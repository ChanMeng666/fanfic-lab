import Link from "next/link";
import {
  BookOpen,
  Film,
  Gamepad2,
  Music,
  Palette,
  Sparkles,
  Wand2,
  PenLine,
  Users,
  Heart,
  ArrowRight,
  Feather,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Fandom categories for the Inspiration Hub
const FANDOM_CATEGORIES = [
  { name: "Anime & Manga", icon: BookOpen, count: "125K+" },
  { name: "Books & Literature", icon: Feather, count: "89K+" },
  { name: "Movies & Television", icon: Film, count: "156K+" },
  { name: "Video Games", icon: Gamepad2, count: "67K+" },
  { name: "K-Pop & Music", icon: Music, count: "45K+" },
  { name: "Comics & Cartoons", icon: Palette, count: "34K+" },
];

// Popular tags for discovery
const POPULAR_TAGS = [
  "Fluff",
  "Angst",
  "Slow Burn",
  "Enemies to Lovers",
  "Coffee Shop AU",
  "Hurt/Comfort",
  "Found Family",
  "Crack fic",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
              <Feather className="size-4" />
            </div>
            <span className="text-xl font-display font-semibold text-foreground">
              FanFic Lab
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/feed"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/wizard"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Wizard
            </Link>
            <Link
              href="/editor"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Editor
            </Link>
            <div className="flex items-center gap-3 ml-2">
              <Link href="/handler/sign-in">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/wizard">
                <Button size="sm">
                  Get Started
                  <ArrowRight className="size-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/30" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

        <div className="container relative mx-auto px-4 py-24 md:py-32 text-center">
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 px-4 py-1.5 text-sm"
          >
            <Sparkles className="size-3.5 text-accent" />
            AI-Powered Writing Partner
          </Badge>

          <h1 className="mb-6 font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
            Where Stories
            <br />
            <span className="text-primary">Come Alive</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
            Write fanfiction with an AI partner that understands your characters,
            respects canon, and helps bring your stories to life. A creative
            collaboration, not just a tool.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/wizard">
              <Button size="lg" className="gap-2 min-w-[180px]">
                <PenLine className="size-5" />
                Start Writing
              </Button>
            </Link>
            <Link href="/feed">
              <Button size="lg" variant="outline" className="gap-2 min-w-[180px]">
                <BookOpen className="size-5" />
                Explore Stories
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="size-4" />
              <span>10,000+ writers</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="size-4" />
              <span>50,000+ stories created</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="size-4 text-accent" />
              <span>Made for fans, by fans</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-surface">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Your AI Writing Partner
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              More than just suggestions—a creative collaborator that helps you
              craft the stories you've always imagined.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card variant="story" className="group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-11 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Wand2 className="size-5" />
                  </div>
                  <CardTitle className="text-lg">Smart Editor</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Magic Continue</strong> writes
                  naturally from where you left off.{" "}
                  <strong className="text-foreground">Expand & Polish</strong> enriches
                  your prose.{" "}
                  <strong className="text-foreground">OOC Check</strong> keeps
                  characters true to form.
                </p>
              </CardContent>
            </Card>

            <Card variant="story" className="group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-11 rounded-xl bg-accent/15 text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                    <Sparkles className="size-5" />
                  </div>
                  <CardTitle className="text-lg">Creative Wizard</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Chat your way through story setup. Pick your fandom, choose your
                  ship, define characters, and brainstorm plot ideas with AI
                  guidance every step of the way.
                </p>
              </CardContent>
            </Card>

            <Card variant="story" className="group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-11 rounded-xl bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Heart className="size-5" />
                  </div>
                  <CardTitle className="text-lg">Fandom Feed</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Discover stories with authentic tags like{" "}
                  <em className="text-foreground">Slow Burn</em>,{" "}
                  <em className="text-foreground">Enemies to Lovers</em>, and{" "}
                  <em className="text-foreground">Found Family</em>. Find your next
                  obsession.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Inspiration Hub */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Inspiration Hub
            </h2>
            <p className="text-lg text-muted-foreground">
              Find your fandom and start creating
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {FANDOM_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <Card
                  key={category.name}
                  className="group cursor-pointer hover:shadow-lg transition-all duration-300"
                >
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex items-center justify-center size-12 rounded-xl bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="size-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {category.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {category.count} stories
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Tags */}
      <section className="py-12 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h3 className="mb-6 text-center text-lg font-medium text-muted-foreground">
            Popular Tags
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors px-4 py-1.5"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl bg-primary p-12 md:p-16 text-center overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-1/4 size-64 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 size-48 bg-accent rounded-full blur-3xl" />
            </div>

            <div className="relative">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready to write your story?
              </h2>
              <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                Join thousands of fans bringing their favorite characters to life
                with an AI partner that truly understands fanfiction.
              </p>
              <Link href="/wizard">
                <Button size="lg" variant="secondary" className="gap-2">
                  <PenLine className="size-5" />
                  Start Creating Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-7 rounded-md bg-primary text-primary-foreground">
                <Feather className="size-3.5" />
              </div>
              <span className="font-display font-semibold text-foreground">
                FanFic Lab
              </span>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              Made with <Heart className="size-3.5 text-accent fill-accent" /> for
              fans, by fans
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
