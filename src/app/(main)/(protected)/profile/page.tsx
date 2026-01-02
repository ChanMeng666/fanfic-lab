"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@stackframe/stack";
import {
  BookOpen,
  Heart,
  MessageSquare,
  Users,
  FileText,
  Trash2,
  Edit,
  BarChart3,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StoryCard } from "@/components/feed";
import { getProfile, updateProfile, getUserStats } from "@/lib/actions/user";
import { getMyStories, deleteStory } from "@/lib/actions/story";
import { getMyDrafts, deleteDraft } from "@/lib/actions/user";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
  preferences: {
    favoriteFandoms: string[];
    favoriteShips: string[];
    darkMode: boolean;
  } | null;
  _count: {
    stories: number;
    followers: number;
    follows: number;
  };
}

interface Story {
  id: string;
  title: string;
  summary: string | null;
  fandom: string;
  ships: string[];
  tags: string[];
  rating: string;
  status: string;
  wordCount: number;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    likes: number;
    comments: number;
    chapters: number;
  };
}

interface Draft {
  id: string;
  title: string | null;
  content: string;
  fandom: string | null;
  ships: string[];
  updatedAt: Date;
}

interface UserStats {
  totalStories: number;
  publishedStories: number;
  totalWords: number;
  totalLikes: number;
  totalComments: number;
  followers: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const stackUser = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stories");

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: "",
    bio: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileData, storiesData, draftsData, statsData] = await Promise.all([
          getProfile(),
          getMyStories(),
          getMyDrafts(),
          getUserStats(),
        ]);

        setProfile(profileData as UserProfile);
        setStories(storiesData as Story[]);
        setDrafts(draftsData as Draft[]);
        setStats(statsData);

        if (profileData) {
          setEditForm({
            displayName: profileData.displayName || "",
            bio: profileData.bio || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch profile data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        displayName: editForm.displayName || undefined,
        bio: editForm.bio || undefined,
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              displayName: editForm.displayName,
              bio: editForm.bio,
            }
          : null
      );
      setIsEditingProfile(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm("Are you sure you want to delete this story? This cannot be undone.")) {
      return;
    }

    try {
      await deleteStory(storyId);
      setStories((prev) => prev.filter((s) => s.id !== storyId));
      toast.success("Story deleted");
    } catch (error) {
      toast.error("Failed to delete story");
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      await deleteDraft(draftId);
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      toast.success("Draft deleted");
    } catch (error) {
      toast.error("Failed to delete draft");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
            <Skeleton className="h-[600px] rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
              <Users className="size-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-2">
              Sign in required
            </h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to view your profile
            </p>
            <Link href="/handler/sign-in">
              <Button>Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          {/* Profile Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4 ring-4 ring-secondary">
                    <AvatarImage src={profile.avatarUrl || undefined} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {profile.displayName?.[0] || profile.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h1 className="text-xl font-display font-bold text-foreground">
                    {profile.displayName || profile.username}
                  </h1>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  {profile.bio && (
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      {profile.bio}
                    </p>
                  )}
                  <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="mt-4 gap-1.5">
                        <Edit className="size-3.5" />
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="font-display">Edit Profile</DialogTitle>
                        <DialogDescription>
                          Update your display name and bio
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Display Name
                          </label>
                          <Input
                            value={editForm.displayName}
                            onChange={(e) =>
                              setEditForm({ ...editForm, displayName: e.target.value })
                            }
                            placeholder="Your display name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Bio</label>
                          <Textarea
                            value={editForm.bio}
                            onChange={(e) =>
                              setEditForm({ ...editForm, bio: e.target.value })
                            }
                            placeholder="Tell us about yourself..."
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsEditingProfile(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleSaveProfile} disabled={isSaving}>
                          {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Social stats */}
                <div className="mt-6 pt-6 border-t border-border grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-foreground">
                      {profile._count.stories}
                    </div>
                    <div className="text-xs text-muted-foreground">Stories</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-foreground">
                      {profile._count.followers}
                    </div>
                    <div className="text-xs text-muted-foreground">Followers</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-foreground">
                      {profile._count.follows}
                    </div>
                    <div className="text-xs text-muted-foreground">Following</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            {stats && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2.5 text-base">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-secondary text-secondary-foreground">
                      <BarChart3 className="size-4" />
                    </div>
                    Writing Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Total Words</span>
                    <span className="font-medium text-foreground">
                      {stats.totalWords.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Published Stories</span>
                    <span className="font-medium text-foreground">{stats.publishedStories}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Total Likes</span>
                    <span className="font-medium text-foreground">{stats.totalLikes}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Total Comments</span>
                    <span className="font-medium text-foreground">{stats.totalComments}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Favorite Fandoms */}
            {profile.preferences?.favoriteFandoms &&
              profile.preferences.favoriteFandoms.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2.5 text-base">
                      <div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
                        <Heart className="size-4" />
                      </div>
                      Favorite Fandoms
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.preferences.favoriteFandoms.map((fandom) => (
                        <Badge key={fandom} variant="secondary">
                          {fandom}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>

          {/* Main Content */}
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="stories" className="gap-1.5">
                  <BookOpen className="size-4" />
                  Stories ({stories.length})
                </TabsTrigger>
                <TabsTrigger value="drafts" className="gap-1.5">
                  <FileText className="size-4" />
                  Drafts ({drafts.length})
                </TabsTrigger>
                <TabsTrigger value="liked" className="gap-1.5">
                  <Heart className="size-4" />
                  Liked
                </TabsTrigger>
              </TabsList>

              <TabsContent value="stories" className="mt-6">
                {stories.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
                        <BookOpen className="size-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No stories yet
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        You haven't created any stories yet.
                      </p>
                      <Link href="/wizard">
                        <Button className="gap-2">
                          <PenLine className="size-4" />
                          Start Writing
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {stories.map((story) => (
                      <Card key={story.id} variant="story">
                        <div className="flex">
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <Link href={`/editor/${story.id}`}>
                                  <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                                    {story.title}
                                  </h3>
                                </Link>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <Badge variant="outline" className="text-xs">
                                    {story.fandom}
                                  </Badge>
                                  <Badge
                                    variant={
                                      story.status === "PUBLISHED"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {story.status === "PUBLISHED" ? "Published" : story.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Link href={`/editor/${story.id}`}>
                                  <Button variant="outline" size="sm" className="gap-1.5">
                                    <Edit className="size-3.5" />
                                    Edit
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                                  onClick={() => handleDeleteStory(story.id)}
                                >
                                  <Trash2 className="size-3.5" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                            {story.summary && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {story.summary}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <FileText className="size-3.5" />
                                {story._count.chapters} chapters
                              </span>
                              <span>{story.wordCount.toLocaleString()} words</span>
                              <span className="flex items-center gap-1">
                                <Heart className="size-3.5" />
                                {story._count.likes}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="size-3.5" />
                                {story._count.comments}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="drafts" className="mt-6">
                {drafts.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
                        <FileText className="size-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No drafts
                      </h3>
                      <p className="text-muted-foreground">No drafts saved</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {drafts.map((draft) => (
                      <Card key={draft.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-foreground">
                              {draft.title || "Untitled Draft"}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                              {draft.fandom && (
                                <Badge variant="outline" className="text-xs">
                                  {draft.fandom}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                Updated {new Date(draft.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="gap-1.5">
                              <Edit className="size-3.5" />
                              Continue
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteDraft(draft.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="liked" className="mt-6">
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="flex items-center justify-center size-16 rounded-2xl bg-accent/10 mx-auto mb-4">
                      <Heart className="size-8 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Liked stories
                    </h3>
                    <p className="text-muted-foreground">
                      Liked stories will appear here
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
