"use client";

import { useState } from "react";
import { ImageIcon, Palette, Book, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface StoryImage {
  id: string;
  url: string;
  type: "portrait" | "illustration" | "cover";
  prompt: string;
  characterName?: string;
  createdAt: string;
}

interface ImageGalleryProps {
  images: StoryImage[];
  onDelete?: (imageId: string) => void;
  onInsert?: (image: StoryImage) => void;
}

const typeConfig = {
  portrait: { icon: User, label: "Character Portrait" },
  illustration: { icon: ImageIcon, label: "Scene Illustration" },
  cover: { icon: Book, label: "Story Cover" },
};

export function ImageGallery({ images, onDelete, onInsert }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<StoryImage | null>(null);

  const portraits = images.filter((img) => img.type === "portrait");
  const illustrations = images.filter((img) => img.type === "illustration");
  const covers = images.filter((img) => img.type === "cover");

  const ImageCard = ({ image }: { image: StoryImage }) => (
    <div
      className="relative group cursor-pointer rounded-2xl overflow-hidden border border-border bg-surface hover:shadow-md transition-shadow"
      onClick={() => setSelectedImage(image)}
    >
      <img
        src={image.url}
        alt={image.prompt}
        className="w-full h-24 object-cover"
      />
      <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <span className="text-background text-xs font-medium">View</span>
      </div>
      {image.characterName && (
        <div className="absolute bottom-0 left-0 right-0 bg-foreground/60 text-background text-xs px-2 py-1 truncate">
          {image.characterName}
        </div>
      )}
    </div>
  );

  const renderImageSection = (
    title: string,
    Icon: React.ComponentType<{ className?: string }>,
    sectionImages: StoryImage[]
  ) => {
    if (sectionImages.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-1.5 text-foreground">
          <Icon className="size-4 text-muted-foreground" />
          {title}
          <Badge variant="secondary" className="text-xs ml-1">
            {sectionImages.length}
          </Badge>
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {sectionImages.map((image) => (
            <ImageCard key={image.id} image={image} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-2xl bg-secondary text-secondary-foreground">
                <ImageIcon className="size-4" />
              </div>
              Images
            </span>
            <Badge variant="secondary">{images.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            {images.length === 0 ? (
              <div className="text-center py-8">
                <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
                  <Palette className="size-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No images yet</p>
                <p className="text-xs text-muted-foreground">
                  Use the chat to generate character portraits or scene
                  illustrations
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {renderImageSection("Portraits", User, portraits)}
                {renderImageSection("Illustrations", ImageIcon, illustrations)}
                {renderImageSection("Covers", Book, covers)}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Image Detail Dialog */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              {selectedImage && (
                <>
                  {(() => {
                    const Icon = typeConfig[selectedImage.type].icon;
                    return <Icon className="size-5 text-primary" />;
                  })()}
                  {selectedImage.characterName || typeConfig[selectedImage.type].label}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.prompt}
                  className="max-w-full max-h-[400px] rounded-2xl object-contain"
                />
              </div>
              <div className="bg-surface rounded-2xl p-3 border border-border">
                <span className="text-xs font-medium text-muted-foreground">
                  Prompt:
                </span>
                <p className="text-sm text-foreground italic mt-1">
                  "{selectedImage.prompt}"
                </p>
              </div>
              <div className="flex gap-2">
                {onInsert && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onInsert(selectedImage);
                      setSelectedImage(null);
                    }}
                  >
                    Insert into Story
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      onDelete(selectedImage.id);
                      setSelectedImage(null);
                    }}
                  >
                    Delete
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedImage(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
