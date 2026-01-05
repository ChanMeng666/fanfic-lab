"use client";

import { useState } from "react";
import {
  Sparkles,
  Users,
  BookOpen,
  Globe,
  Heart,
  Check,
  RefreshCw,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { SourceResearchData, ResearchCharacter } from "@/lib/types/agent-state";

interface ResearchResultsCardProps {
  sourceName: string;
  data: SourceResearchData;
  onApprove: () => void;
  onRegenerate: () => void;
}

interface SectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ResultSection({ title, icon: Icon, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
          <span className="font-medium text-foreground">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function CharacterCard({ character }: { character: ResearchCharacter }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-surface">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-foreground">{character.name}</h4>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{character.description}</p>
      <div className="flex flex-wrap gap-1">
        {character.traits.map((trait, i) => (
          <Badge key={i} variant="secondary" className="text-xs">
            {trait}
          </Badge>
        ))}
      </div>
      {character.relationships && character.relationships.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {character.relationships.join(" • ")}
          </p>
        </div>
      )}
    </div>
  );
}

export function ResearchResultsCard({
  sourceName,
  data,
  onApprove,
  onRegenerate,
}: ResearchResultsCardProps) {
  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6 animate-fade-slide-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center size-12 rounded-xl bg-accent/10 text-accent ai-glow">
            <Sparkles className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Research Results
              </h2>
              <Badge variant="secondary" className="gap-1 text-xs">
                <Sparkles className="size-3" />
                AI Generated
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Here&apos;s what we found about{" "}
              <span className="text-primary font-medium">{sourceName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Results Content */}
      <div className="border border-accent/30 rounded-xl bg-ai-surface ai-glow overflow-hidden">
        <ScrollArea className="h-[400px]">
          <div className="divide-y divide-border">
            {/* Characters Section */}
            <ResultSection title="Characters" icon={Users}>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.mainCharacters.map((char, i) => (
                  <CharacterCard key={i} character={char} />
                ))}
              </div>
              {data.mainCharacters.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  No characters found. You can add them manually in the next step.
                </p>
              )}
            </ResultSection>

            {/* Plot Section */}
            <ResultSection title="Original Plot" icon={BookOpen}>
              <p className="text-sm text-foreground leading-relaxed">
                {data.originalPlot || "No plot information available."}
              </p>
            </ResultSection>

            {/* World Section */}
            <ResultSection title="World & Setting" icon={Globe}>
              <p className="text-sm text-foreground leading-relaxed">
                {data.worldSettings || "No world setting information available."}
              </p>
            </ResultSection>

            {/* Ships Section */}
            <ResultSection title="Popular Ships" icon={Heart}>
              {data.popularShips.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.popularShips.map((ship, i) => (
                    <Badge key={i} variant="outline" className="text-sm">
                      {ship}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No popular ships found.
                </p>
              )}
              {data.canonRelationships.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">
                    Canon Relationships:
                  </p>
                  <ul className="text-sm text-foreground space-y-1">
                    {data.canonRelationships.map((rel, i) => (
                      <li key={i}>• {rel}</li>
                    ))}
                  </ul>
                </div>
              )}
            </ResultSection>
          </div>
        </ScrollArea>

        {/* Sources */}
        {data.searchSources.length > 0 && (
          <div className="px-4 py-2 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="size-3" />
              <span>Sources: {data.searchSources.slice(0, 3).join(", ")}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={onRegenerate}
          className="gap-2"
        >
          <RefreshCw className="size-4" />
          Regenerate
        </Button>
        <Button onClick={onApprove} className="gap-2">
          <Check className="size-4" />
          Continue to Characters
          <ArrowRight className="size-4" />
        </Button>
      </div>

      {/* Help Text */}
      <p className="text-center text-xs text-muted-foreground">
        You can edit character details in the next step
      </p>
    </div>
  );
}
