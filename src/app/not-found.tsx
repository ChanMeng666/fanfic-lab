import Link from "next/link";
import { Feather, Home, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex items-center justify-center size-20 rounded-3xl bg-primary/10 text-primary mx-auto">
          <Feather className="size-10" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-5xl font-bold text-foreground">404</h1>
          <p className="text-lg text-muted-foreground">
            这页故事还没被写下
          </p>
          <p className="text-sm text-muted-foreground">
            你访问的页面不存在，或许已经被移到了别处。
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link href="/">
            <Button variant="default" className="gap-1.5">
              <Home className="size-4" />
              回到首页
            </Button>
          </Link>
          <Link href="/feed">
            <Button variant="outline" className="gap-1.5">
              <BookOpen className="size-4" />
              浏览故事
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
