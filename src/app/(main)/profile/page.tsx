"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@stackframe/stack";
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
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950">
        <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <Skeleton className="h-[600px]" />
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              FanFic Lab
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/editor">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                New Story
              </Button>
            </Link>
            <Link href="/handler/account-settings">
              <Button variant="outline" size="sm">
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          {/* Profile Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={profile.avatarUrl || undefined} />
                    <AvatarFallback className="text-2xl bg-gradient-to-r from-purple-400 to-pink-400 text-white">
                      {profile.displayName?.[0] || profile.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h1 className="text-xl font-bold">
                    {profile.displayName || profile.username}
                  </h1>
                  <p className="text-sm text-gray-500">@{profile.username}</p>
                  {profile.bio && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                      {profile.bio}
                    </p>
                  )}
                  <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="mt-4">
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                        <DialogDescription>
                          Update your display name and bio
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <label className="text-sm font-medium">Display Name</label>
                          <Input
                            value={editForm.displayName}
                            onChange={(e) =>
                              setEditForm({ ...editForm, displayName: e.target.value })
                            }
                            placeholder="Your display name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Bio</label>
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
                <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold">{profile._count.stories}</div>
                    <div className="text-xs text-gray-500">Stories</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{profile._count.followers}</div>
                    <div className="text-xs text-gray-500">Followers</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{profile._count.follows}</div>
                    <div className="text-xs text-gray-500">Following</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Writing Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Words</span>
                    <span className="font-medium">
                      {stats.totalWords.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Published Stories</span>
                    <span className="font-medium">{stats.publishedStories}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Likes</span>
                    <span className="font-medium">{stats.totalLikes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Comments</span>
                    <span className="font-medium">{stats.totalComments}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Favorite Fandoms */}
            {profile.preferences?.favoriteFandoms && profile.preferences.favoriteFandoms.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Favorite Fandoms</CardTitle>
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
                <TabsTrigger value="stories">
                  My Stories ({stories.length})
                </TabsTrigger>
                <TabsTrigger value="drafts">
                  Drafts ({drafts.length})
                </TabsTrigger>
                <TabsTrigger value="liked">Liked</TabsTrigger>
              </TabsList>

              <TabsContent value="stories" className="mt-6">
                {stories.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500 mb-4">
                        You haven't created any stories yet.
                      </p>
                      <Link href="/editor">
                        <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                          Start Writing
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {stories.map((story) => (
                      <Card key={story.id} className="overflow-hidden">
                        <div className="flex">
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <Link href={`/editor/${story.id}`}>
                                  <h3 className="font-bold hover:text-purple-600 transition-colors">
                                    {story.title}
                                  </h3>
                                </Link>
                                <div className="flex items-center gap-2 mt-1">
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
                                    {story.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Link href={`/editor/${story.id}`}>
                                  <Button variant="outline" size="sm">
                                    Edit
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600"
                                  onClick={() => handleDeleteStory(story.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                            {story.summary && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                {story.summary}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                              <span>{story._count.chapters} chapters</span>
                              <span>{story.wordCount.toLocaleString()} words</span>
                              <span>{story._count.likes} likes</span>
                              <span>{story._count.comments} comments</span>
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
                      <p className="text-gray-500">No drafts saved</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {drafts.map((draft) => (
                      <Card key={draft.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">
                              {draft.title || "Untitled Draft"}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              {draft.fandom && (
                                <Badge variant="outline" className="text-xs">
                                  {draft.fandom}
                                </Badge>
                              )}
                              <span className="text-xs text-gray-500">
                                Updated{" "}
                                {new Date(draft.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              Continue
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              onClick={() => handleDeleteDraft(draft.id)}
                            >
                              Delete
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
                    <p className="text-gray-500">
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
