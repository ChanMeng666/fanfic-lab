import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Fandom categories for the Inspiration Hub
const FANDOM_CATEGORIES = [
  { name: "Anime & Manga", icon: "🎌", count: "125K+" },
  { name: "Books & Literature", icon: "📚", count: "89K+" },
  { name: "Movies, TV & RPF", icon: "🎬", count: "156K+" },
  { name: "Video Games", icon: "🎮", count: "67K+" },
  { name: "K-Pop & Music", icon: "🎵", count: "45K+" },
  { name: "Comics & Cartoons", icon: "🦸", count: "34K+" },
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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              FanFic Lab
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/feed"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300"
            >
              Explore
            </Link>
            <Link
              href="/wizard"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300"
            >
              Wizard
            </Link>
            <Link
              href="/editor"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300"
            >
              Editor
            </Link>
            <Link href="/handler/sign-in">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/wizard">
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-4">
          AI-Powered Writing Assistant
        </Badge>
        <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 dark:text-white md:text-6xl">
          Where{" "}
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Fandom Dreams
          </span>
          <br />
          Become Stories
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          Create amazing fanfiction with AI that understands your characters,
          respects canon, and helps bring your OTP to life. Smart Editor,
          Creative Wizard, and a community that gets it.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/wizard">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Start Creating
            </Button>
          </Link>
          <Link href="/feed">
            <Button size="lg" variant="outline">
              Browse Stories
            </Button>
          </Link>
        </div>
      </section>

      {/* Fandom Categories */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-8 text-center text-3xl font-bold text-gray-900 dark:text-white">
          Inspiration Hub
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FANDOM_CATEGORIES.map((category) => (
            <Card
              key={category.name}
              className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <CardContent className="flex items-center gap-4 p-6">
                <span className="text-4xl">{category.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-500">{category.count} stories</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Popular Tags */}
      <section className="container mx-auto px-4 py-8">
        <h3 className="mb-4 text-center text-lg font-medium text-gray-600 dark:text-gray-300">
          Popular Tags
        </h3>
        <div className="flex flex-wrap justify-center gap-2">
          {POPULAR_TAGS.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-white">
          Your AI Writing Companion
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🪄</span>
                Smart Editor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300">
                <strong>Magic Continue</strong> writes naturally from where you
                left off. <strong>Expand & Polish</strong> enriches your prose.{" "}
                <strong>OOC Check</strong> keeps characters true to form.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">✨</span>
                Creative Wizard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300">
                Chat your way through story setup. Pick your fandom, choose your
                ship (pairing), define characters, and brainstorm plot ideas
                with AI guidance.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">💜</span>
                Fandom Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300">
                Discover stories with authentic tags like <em>Drarry</em>,{" "}
                <em>Fluff</em>, and <em>Crack fic</em>. Poke for updates,
                support creators, and find your next obsession.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-12 text-white">
          <h2 className="mb-4 text-3xl font-bold">Ready to write your story?</h2>
          <p className="mb-8 text-lg opacity-90">
            Join thousands of fans bringing their favorite characters to life.
          </p>
          <Link href="/wizard">
            <Button size="lg" variant="secondary">
              Start Creating Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-gray-900/80">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <span className="font-semibold">FanFic Lab</span>
            </div>
            <p className="text-sm text-gray-500">
              Made with 💜 for fans, by fans. AI-powered, community-driven.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
