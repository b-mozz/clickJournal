import { NextResponse } from "next/server";
import { prisma } from "@clickjournal/db";
import { PostVisibility } from "../../../../../packages/db/src/generated/prisma";

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
      data: { username, email, }
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "username or email already in use" },
        { status: 409 }
      );
    }
    console.error(error.message)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
export async function GET(request: Request){
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if(!username){
    return NextResponse.json({ error: "Username is required" }, {status : 400});
  }
  const user = await prisma.user.findFirst({
    where: {username, isActive: true},
    select: {username: true, email: true, isPublic: true, isActive: true, createdAt: true}
  });
  if(!user){
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(user);
}