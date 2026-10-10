import { currentUserId } from "@clickjournal/auth";
import { prisma } from "@clickjournal/db";

export async function POST(request: Request) {
  const userId = await currentUserId();
  const body = await request.json();

  if (
    typeof body.caption !== "string" ||
    typeof body.photoBlobName !== "string" ||
    typeof body.latitude !== "number" ||
    typeof body.longitude !== "number"
  ) {
    return Response.json(
      { error: { code: "INVALID_INPUT", message: "Invalid post data" } },
      { status: 400 }
    );
  }

  const post = await prisma.post.create({
    data: {
      authorId: userId,
      caption: body.caption,
      photoBlobName: body.photoBlobName,
      latitude: body.latitude,
      longitude: body.longitude,
      visibility: body.visibility ?? "PRIVATE",
    },
  });

  return Response.json({ post }, { status: 201 });
}