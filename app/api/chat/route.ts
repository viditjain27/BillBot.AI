import { type NextRequest } from "next/server";
import { streamChat, type ChatMessage } from "@/lib/gemini";
import { addMessage, getSession, createSession } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, message, history = [], userEmail } = body as {
      sessionId?: string;
      message: string;
      history?: ChatMessage[];
      userEmail?: string;
    };

    if (!message || typeof message !== "string") {
      return Response.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Ensure session exists
    let activeSessionId = sessionId;
    if (!activeSessionId || !getSession(activeSessionId)) {
      const session = createSession(userEmail);
      activeSessionId = session.id;
    }

    // Save user message to DB
    addMessage(activeSessionId, "user", message, "text");

    // Stream Gemini response
    const geminiStream = await streamChat(message, history);
    let fullResponse = "";

    // Create a TransformStream that also captures the text for DB storage
    const encoder = new TextEncoder();
    const transformStream = new TransformStream<string, Uint8Array>({
      transform(chunk, controller) {
        fullResponse += chunk;
        // Send as SSE format
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
        );
      },
      async flush(controller) {
        // Save the complete bot response to DB
        try {
          addMessage(activeSessionId!, "bot", fullResponse, "text");
        } catch (e) {
          console.error("Failed to save bot message:", e);
        }
        // Send done signal
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, sessionId: activeSessionId })}\n\n`
          )
        );
      },
    });

    // Pipe the Gemini stream through the transform safely
    geminiStream.pipeTo(transformStream.writable).catch((err) => {
      console.error("Gemini stream pipe error:", err);
    });

    return new Response(transformStream.readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "X-Session-Id": activeSessionId,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Chat failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
