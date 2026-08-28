import { type NextRequest } from "next/server";
import { getMessages } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messages = getMessages(id);

    // Parse bill_data JSON strings back to objects
    const formatted = messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      type: msg.type,
      billData: msg.bill_data ? JSON.parse(msg.bill_data) : null,
      timestamp: msg.created_at,
    }));

    return Response.json({ messages: formatted });
  } catch (error) {
    console.error("Failed to get messages:", error);
    return Response.json(
      { error: "Failed to get messages" },
      { status: 500 }
    );
  }
}
