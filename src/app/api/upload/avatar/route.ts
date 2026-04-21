import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/stack";
import { uploadImage } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { stackAuthId: stackUser.id },
      select: { id: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await uploadImage(base64, {
      type: "avatar",
      userId: dbUser.id,
    });

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { avatarUrl: result.url },
    });

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
