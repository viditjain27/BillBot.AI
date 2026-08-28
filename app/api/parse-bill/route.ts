import { type NextRequest } from "next/server";
import { parseBill } from "@/lib/gemini";
import { addMessage, saveBill, getSession, createSession } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    let sessionId = formData.get("sessionId") as string | null;
    const userEmail = formData.get("userEmail") as string | null;

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return Response.json(
        {
          error:
            "Unsupported file type. Please upload an image (JPEG, PNG, WebP) or PDF.",
        },
        { status: 400 }
      );
    }

    // Ensure session exists
    if (!sessionId || !getSession(sessionId)) {
      const session = createSession(userEmail || undefined);
      sessionId = session.id;
    }

    // Save user upload message
    addMessage(
      sessionId,
      "user",
      `📎 Uploaded: ${file.name}`,
      "text"
    );

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    // Parse bill with Gemini
    const { parsed, rawResponse } = await parseBill(base64Data, file.type);

    // Check for errors in parsing
    if (parsed.error) {
      const errorMsg = addMessage(
        sessionId,
        "bot",
        parsed.error as string,
        "text"
      );
      return Response.json({
        sessionId,
        message: errorMsg,
        error: parsed.error,
      });
    }

    // Save bill summary message
    const billMsg = addMessage(
      sessionId,
      "bot",
      "",
      "bill-summary",
      parsed
    );

    // Save bill record
    saveBill(
      sessionId,
      billMsg.id,
      file.name,
      file.type,
      parsed,
      rawResponse,
      userEmail
    );

    // Add a follow-up text message about the findings
    const notes = (parsed.notes as string[]) || [];
    const patientBalance = parsed.patientBalance as number;
    const currency = (parsed.currencySymbol as string) || "₹";
    const hasFlags = (parsed.lineItems as Array<{ flag?: string }>)?.some(
      (item) => item.flag
    );

    let followUpText = "Here's a breakdown of your bill! 👇\n\n";
    if (hasFlags) {
      followUpText +=
        "⚠️ **I found some items worth checking** — see the flagged charges above.\n\n";
    }
    if (patientBalance) {
      followUpText += `Your estimated balance is **${currency}${patientBalance.toFixed(2)}**.\n\n`;
    }
    if (notes.length > 0) {
      followUpText += "**Recommended next steps:**\n";
      notes.forEach((note) => {
        followUpText += `• ${note}\n`;
      });
    }
    followUpText +=
      "\nWould you like me to explain any specific charge in more detail?";

    const followUpMsg = addMessage(sessionId, "bot", followUpText, "text");

    return Response.json({
      sessionId,
      bill: parsed,
      billMessage: {
        id: billMsg.id,
        role: "bot",
        content: "",
        type: "bill-summary",
        billData: parsed,
        timestamp: billMsg.created_at,
      },
      followUpMessage: {
        id: followUpMsg.id,
        role: "bot",
        content: followUpText,
        type: "text",
        timestamp: followUpMsg.created_at,
      },
    });
  } catch (error) {
    console.error("Parse bill API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Bill parsing failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
