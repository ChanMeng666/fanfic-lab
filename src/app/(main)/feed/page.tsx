"use client";

import { useState, useEffect } from "react";
import { Search, BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StoryCard, FilterBar } from "@/components/feed";
import type { StoryCardData } from "@/components/feed";

const PAGE_SIZE = 8;

// Sample data for demonstration
const SAMPLE_STORIES: StoryCardData[] = [
  {
    id: "1",
    title: "The Stars Between Us",
    summary:
      "When Harry discovers an ancient spell that allows him to communicate across dimensions, he finds himself connected to a version of Draco who made very different choices. A story about forgiveness, second chances, and the paths not taken.",
    fandom: "Harry Potter",
    ships: ["Drarry"],
    tags: ["Slow Burn", "Alternate Universe", "Angst", "Hurt/Comfort", "Post-War"],
    rating: "TEEN",
    status: "PUBLISHED",
    wordCount: 45000,
    chapterCount: 12,
    likes: 1234,
    comments: 89,
    author: { id: "a1", username: "stargazer_writes" },
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Coffee & Confessions",
    summary:
      "Bucky works at a coffee shop. Steve is his most frustrating customer. A modern AU where everyone deserves happiness and good coffee.",
    fandom: "Marvel",
    ships: ["Stucky"],
    tags: ["Fluff", "AU - Coffee Shop", "Modern AU", "Getting Together"],
    rating: "GENERAL",
    status: "COMPLETE",
    wordCount: 28000,
    chapterCount: 8,
    likes: 892,
    comments: 56,
    author: { id: "a2", username: "shield_writer" },
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "3",
    title: "Seasons of Love",
    summary:
      "Four seasons, four moments, four chances for Taehyung and Jungkook to realize what's been in front of them all along.",
    fandom: "BTS",
    ships: ["Taekook"],
    tags: ["Fluff", "Mutual Pining", "Friends to Lovers", "One Shot Collection"],
    rating: "TEEN",
    status: "COMPLETE",
    wordCount: 15000,
    chapterCount: 4,
    likes: 2341,
    comments: 178,
    author: { id: "a3", username: "purple_army_writer" },
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "4",
    title: "Midnight in the Garden of Cloud Recesses",
    summary:
      "Wei Wuxian returns to Cloud Recesses after the Sunshot Campaign, haunted by memories and drawn to a certain Second Jade who seems equally unable to forget.",
    fandom: "The Untamed",
    ships: ["WangXian"],
    tags: ["Post-Canon", "Healing", "Slow Burn", "Angst with Happy Ending"],
    rating: "MATURE",
    status: "PUBLISHED",
    wordCount: 67000,
    chapterCount: 18,
    likes: 3456,
    comments: 234,
    author: { id: "a4", username: "lotus_pier_writer" },
    updatedAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: "5",
    title: "The Devil Wears Prada (But Make It Gay)",
    summary:
      "Andy Sachs takes a job at Runway Magazine and discovers that Miranda Priestly is nothing like she expected. A retelling with the romance we deserved.",
    fandom: "The Devil Wears Prada",
    ships: ["Mirandy"],
    tags: ["Romance", "Slow Burn", "Boss/Employee", "Fashion"],
    rating: "MATURE",
    status: "COMPLETE",
    wordCount: 52000,
    chapterCount: 15,
    likes: 1876,
    comments: 145,
    author: { id: "a5", username: "runway_dreams" },
    updatedAt: new Date(Date.now() - 345600000).toISOString(),
  },
  {
    id: "6",
    title: "A Thousand Paper Cranes",
    summary:
      "Bakugou makes a wish. Midoriya folds a thousand paper cranes. Sometimes miracles happen to those who believe.",
    fandom: "My Hero Academia",
    ships: ["BakuDeku"],
    tags: ["Hurt/Comfort", "Healing", "Friends to Lovers", "Magical Realism"],
    rating: "TEEN",
    status: "COMPLETE",
    wordCount: 34000,
    chapterCount: 10,
    likes: 2134,
    comments: 167,
    author: { id: "a6", username: "plus_ultra_writes" },
    updatedAt: new Date(Date.now() - 432000000).toISOString(),
  },
  {
    id: "7",
    title: "Starlight and Shadows",
    summary:
      "In a galaxy far, far away, a Jedi and a Sith discover that the Force has plans neither of them expected. An enemies-to-lovers tale across the stars.",
    fandom: "Star Wars",
    ships: ["Reylo"],
    tags: ["Enemies to Lovers", "Force Bond", "Alternate Universe", "Epic"],
    rating: "TEEN",
    status: "PUBLISHED",
    wordCount: 89000,
    chapterCount: 25,
    likes: 4521,
    comments: 312,
    author: { id: "a7", username: "force_writer" },
    updatedAt: new Date(Date.now() - 518400000).toISOString(),
  },
  {
    id: "8",
    title: "221B Baker Street Blues",
    summary:
      "John Watson moves into 221B and discovers that his new flatmate is the most infuriating, brilliant, and utterly captivating person he has ever met.",
    fandom: "Sherlock",
    ships: ["Johnlock"],
    tags: ["Slow Burn", "Case Fic", "Pining", "First Kiss"],
    rating: "MATURE",
    status: "COMPLETE",
    wordCount: 76000,
    chapterCount: 20,
    likes: 3890,
    comments: 278,
    author: { id: "a8", username: "consulting_writer" },
    updatedAt: new Date(Date.now() - 604800000).toISOString(),
  },
  {
    id: "9",
    title: "Crimson Peak: A Love Story",
    summary:
      "Thomas Sharpe never expected to find love in the cold halls of Allerdale. But when Edith arrives, everything changes.",
    fandom: "Crimson Peak",
    ships: ["Thomas/Edith"],
    tags: ["Gothic Romance", "Dark", "Redemption", "Horror Elements"],
    rating: "MATURE",
    status: "COMPLETE",
    wordCount: 41000,
    chapterCount: 12,
    likes: 1234,
    comments: 98,
    author: { id: "a9", username: "gothic_tales" },
    updatedAt: new Date(Date.now() - 691200000).toISOString(),
  },
  {
    id: "10",
    title: "The Proposal (But They're Both Dumb)",
    summary:
      "Jimin needs a fake boyfriend for his sister's wedding. Yoongi needs a place to stay. What could possibly go wrong?",
    fandom: "BTS",
    ships: ["Yoonmin"],
    tags: ["Fake Dating", "Comedy", "Fluff", "Mutual Pining"],
    rating: "TEEN",
    status: "COMPLETE",
    wordCount: 38000,
    chapterCount: 11,
    likes: 2987,
    comments: 203,
    author: { id: "a10", username: "bangtan_writes" },
    updatedAt: new Date(Date.now() - 777600000).toISOString(),
  },
  {
    id: "11",
    title: "Wolfsbane and Moonlight",
    summary:
      "After the war, Remus Lupin thought he had lost everything. Then Sirius Black walks back into his life, and nothing is the same.",
    fandom: "Harry Potter",
    ships: ["Wolfstar"],
    tags: ["Post-War", "Fix-It", "Angst", "Reunion"],
    rating: "MATURE",
    status: "PUBLISHED",
    wordCount: 58000,
    chapterCount: 16,
    likes: 2456,
    comments: 189,
    author: { id: "a11", username: "marauder_era" },
    updatedAt: new Date(Date.now() - 864000000).toISOString(),
  },
  {
    id: "12",
    title: "Stark Industries Internship Program",
    summary:
      "Peter Parker gets an internship at Stark Industries. Tony Stark gets a headache. And maybe, just maybe, they both get a family.",
    fandom: "Marvel",
    ships: [],
    tags: ["Found Family", "Mentor/Protégé", "Fluff", "Humor"],
    rating: "GENERAL",
    status: "COMPLETE",
    wordCount: 45000,
    chapterCount: 14,
    likes: 5678,
    comments: 456,
    author: { id: "a12", username: "iron_dad_writes" },
    updatedAt: new Date(Date.now() - 950400000).toISOString(),
  },
];

export default function FeedPage() {
  const [selectedFandom, setSelectedFandom] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // Filter stories based on selection
  const filteredStories = SAMPLE_STORIES.filter((story) => {
    if (selectedFandom && story.fandom !== selectedFandom) return false;
    if (selectedStatus && story.status !== selectedStatus) return false;
    if (
      searchQuery &&
      !story.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !story.summary.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  // Sort stories
  const sortedStories = [...filteredStories].sort((a, b) => {
    switch (sortBy) {
      case "popular":
        return b.likes - a.likes;
      case "comments":
        return b.comments - a.comments;
      case "words":
        return b.wordCount - a.wordCount;
      default:
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }
  });

  // Paginated stories
  const displayedStories = sortedStories.slice(0, displayCount);
  const hasMore = displayCount < sortedStories.length;

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [selectedFandom, selectedStatus, sortBy, searchQuery]);

  const loadMore = () => {
    setDisplayCount((prev) => prev + PAGE_SIZE);
  };

  const hasActiveFilters = selectedFandom || selectedStatus || searchQuery;

  const clearAllFilters = () => {
    setSelectedFandom(null);
    setSelectedStatus(undefined);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Explore Stories
          </h1>
          <p className="text-muted-foreground">
            Discover fanfiction from your favorite fandoms
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search stories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="mb-6">
          <FilterBar
            selectedFandom={selectedFandom}
            onFandomChange={setSelectedFandom}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            sortBy={sortBy}
            onSortChange={setSortBy}
            resultCount={sortedStories.length}
          />
        </div>

        {/* Story Grid */}
        {displayedStories.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayedStories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
              <BookOpen className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No stories found
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Try adjusting your filters or search query, or explore a
              different fandom
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearAllFilters}>
                Clear All Filters
              </Button>
            )}
          </Card>
        )}

        {/* Load More / End of List */}
        {displayedStories.length > 0 && (
          <div className="text-center mt-8">
            {hasMore ? (
              <Button variant="outline" size="lg" onClick={loadMore}>
                Load More Stories
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                You&apos;ve reached the end
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
