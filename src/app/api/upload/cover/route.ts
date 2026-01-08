import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/stack";
import { uploadImage } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const storyId = formData.get("storyId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!storyId) {
      return NextResponse.json({ error: "No story ID provided" }, { status: 400 });
    }

    // Verify story ownership
    const dbUser = await prisma.user.findUnique({
      where: { stackAuthId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story || story.authorId !== dbUser.id) {
      return NextResponse.json(
        { error: "Story not found or unauthorized" },
        { status: 403 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    // Convert file to buffer then base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Upload to Cloudinary
    const result = await uploadImage(base64, {
      type: "cover",
      storyId,
    });

    // Track image in database (handle re-uploads by deleting old cover)
    const existingCover = await prisma.image.findFirst({
      where: {
        storyId,
        type: "COVER",
      },
    });

    if (existingCover) {
      await prisma.image.delete({
        where: { id: existingCover.id },
      });
    }

    await prisma.image.create({
      data: {
        url: result.url,
        publicId: result.publicId,
        type: "COVER",
        storyId,
      },
    });

    return NextResponse.json({
      url: result.url,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error("Cover upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
