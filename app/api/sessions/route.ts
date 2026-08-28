import { createSession } from "@/lib/db";

export async function POST() {
  try {
    const session = createSession();
    return Response.json({ sessionId: session.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create session:", error);
    return Response.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
