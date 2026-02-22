import { Sparkles } from "lucide-react";
import { QuickGenerator } from "@/components/generator/QuickGenerator";

export default function GeneratePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8 animate-fade-slide-in">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-accent/15 text-accent">
              <Sparkles className="size-5" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Generate a Story
            </h1>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Describe your dream fanfic. We'll write it for you.
          </p>
        </div>

        {/* Generator */}
        <QuickGenerator />
      </div>
    </div>
  );
}
