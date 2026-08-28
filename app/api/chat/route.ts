import { type NextRequest } from "next/server";
import { streamChat, type ChatMessage } from "@/lib/gemini";
import { addMessage, getSession, createSession } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, message, history = [] } = body as {
      sessionId?: string;
      message: string;
      history?: ChatMessage[];
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
      const session = createSession();
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
        controller.terminate();
      },
    });

    // Pipe the Gemini stream through the transform
    geminiStream.pipeTo(transformStream.writable);

    return new Response(transformStream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
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
