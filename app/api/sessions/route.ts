import { type NextRequest } from "next/server";
import { createSession, getUserSessions } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return Response.json({ sessions: [] });
    }

    const sessions = getUserSessions(email);
    return Response.json({ sessions });
  } catch (error) {
    console.error("Failed to get sessions:", error);
    return Response.json(
      { error: "Failed to get sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let userEmail: string | undefined;
    let title: string | undefined;

    try {
      const body = await request.json();
      userEmail = body.userEmail;
      title = body.title;
    } catch {
      // Empty body is okay
    }

    const session = createSession(userEmail, title);
    return Response.json({ sessionId: session.id, session }, { status: 201 });
  } catch (error) {
    console.error("Failed to create session:", error);
    return Response.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
