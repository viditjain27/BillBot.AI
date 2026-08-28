import { type NextRequest } from "next/server";
import { getSession, deleteSession } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(id);

    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    return Response.json({ session });
  } catch (error) {
    console.error("Failed to get session:", error);
    return Response.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteSession(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return Response.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
