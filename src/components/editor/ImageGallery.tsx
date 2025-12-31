"use client";

import { useState } from "react";
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

export function ImageGallery({ images, onDelete, onInsert }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<StoryImage | null>(null);

  const typeIcons = {
    portrait: "🎨",
    illustration: "🖼️",
    cover: "📚",
  };

  const portraits = images.filter((img) => img.type === "portrait");
  const illustrations = images.filter((img) => img.type === "illustration");
  const covers = images.filter((img) => img.type === "cover");

  const ImageCard = ({ image }: { image: StoryImage }) => (
    <div
      className="relative group cursor-pointer rounded-lg overflow-hidden border bg-white hover:shadow-md transition-shadow"
      onClick={() => setSelectedImage(image)}
    >
      <img
        src={image.url}
        alt={image.prompt}
        className="w-full h-24 object-cover"
      />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <span className="text-white text-xs">View</span>
      </div>
      {image.characterName && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">
          {image.characterName}
        </div>
      )}
    </div>
  );

  const renderImageSection = (
    title: string,
    icon: string,
    sectionImages: StoryImage[]
  ) => {
    if (sectionImages.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-1">
          <span>{icon}</span>
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
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <span>🖼️</span>
              Images
            </span>
            <Badge variant="secondary">{images.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            {images.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl block mb-2">🎨</span>
                <p className="text-sm">No images yet</p>
                <p className="text-xs">
                  Use the chat to generate character portraits or scene
                  illustrations
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {renderImageSection("Portraits", typeIcons.portrait, portraits)}
                {renderImageSection(
                  "Illustrations",
                  typeIcons.illustration,
                  illustrations
                )}
                {renderImageSection("Covers", typeIcons.cover, covers)}
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
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedImage && typeIcons[selectedImage.type]}</span>
              {selectedImage?.characterName ||
                (selectedImage?.type === "portrait"
                  ? "Character Portrait"
                  : selectedImage?.type === "illustration"
                  ? "Scene Illustration"
                  : "Story Cover")}
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.prompt}
                  className="max-w-full max-h-[400px] rounded-lg object-contain"
                />
              </div>
              <div className="bg-gray-50 rounded p-3">
                <span className="text-xs font-medium text-gray-500">
                  Prompt:
                </span>
                <p className="text-sm text-gray-700 italic mt-1">
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
