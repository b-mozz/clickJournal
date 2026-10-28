import { NextResponse } from "next/server";
import { prisma } from "@clickjournal/db";

export async function POST(request: Request) {
  const body = await request.json();
  const { username, email } = body;

  if (!username || !email) {
    return NextResponse.json(
      { error: "username and email are required" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.create({
      data: { username, email },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "username or email already in use" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}