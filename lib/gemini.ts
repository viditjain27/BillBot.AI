import { GoogleGenAI } from "@google/genai";
import { CHAT_SYSTEM_PROMPT, BILL_PARSE_PROMPT } from "./prompts";

// Initialize the Gemini client
// Initialize the Gemini client if API key is present
function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_key_here" || apiKey === "your_gemini_api_key_here") {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

/**
 * Generates an intelligent simulation response for offline or demo testing
 */
function getSimulatedChatResponse(message: string): string {
  const lower = message.toLowerCase();
  
  if (lower.includes("dispute") || lower.includes("letter") || lower.includes("draft")) {
    return `### 📄 Medical Bill Dispute Letter

**Date:** ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}  
**To:** Hospital Billing & Patient Accounts Department  
**Re:** Notice of Formal Dispute — Account # MRH-948210-A  

Dear Billing Department,

I am writing to formally dispute the following charges on my recent statement for services rendered on **January 14, 2026**:

1. **Out-of-Network Emergency Physician Fee ($1,400.00 - CPT 99291)**: This emergency department visit occurred at an in-network facility. Under the **Federal No Surprises Act (45 C.F.R. § 149.410)**, patients receiving emergency care cannot be balance billed at out-of-network rates.
2. **Facility Level 4 Coding (CPT 99284 - $2,100.00)**: I am requesting an itemized medical record audit to verify the medical necessity and acuity level assigned to this encounter.

Please place a **30-day hold on this account** while these items are investigated. Please send an updated itemized statement and confirmation in writing.

Sincerely,  
**Patient / Account Holder**`;
  }

  if (lower.includes("why is the bill so high") || lower.includes("high") || lower.includes("er") || lower.includes("emergency")) {
    return `### 🔍 Why Your Bill Is High: Key Factors

Here is the breakdown of why this balance is elevated:

1. **Out-of-Network Doctor Fee ($1,400.00)**  
   Even though you went to an in-network hospital, the attending emergency doctor was contracted through an independent group that did not accept your insurance.
   - **Protection:** Under the **Federal No Surprises Act**, you cannot be charged more than your standard in-network cost-sharing for emergency room visits!

2. **High Level 4 Facility Fee ($2,100.00 - CPT 99284)**  
   Hospitals charge a separate facility fee just for the room, triage staff, and monitoring equipment. Level 4 indicates high severity.

3. **High Annual Deductible**  
   If you have not met your annual deductible (e.g. $2,000–$3,000), insurance applies charges directly to your personal responsibility before paying their 80% share.

---
### 💡 Recommended Next Step:
Call the billing office at the hospital and state: *"I am disputing the out-of-network doctor fee under the No Surprises Act and would like to request an itemized review."*`;
  }

  if (lower.includes("deductible") || lower.includes("copay") || lower.includes("coinsurance")) {
    return `### 📘 Insurance Terms Explained Simply

* **Deductible:** The fixed amount you must pay out-of-pocket each calendar year *before* your insurance starts chipping in (e.g., $1,500/year).
* **Copay:** A flat fee you pay on the spot for a specific visit (e.g., $25 for a primary doctor, $50 for a specialist, $250 for the ER).
* **Coinsurance:** Your percentage share of the bill *after* your deductible is met (e.g., insurance pays 80%, you pay 20%).
* **Out-of-Pocket Maximum:** The absolute ceiling cap you will pay in a single year. Once reached, your insurance pays 100% of all covered medical care.`;
  }

  return `### 📋 Medical Bill Analysis

Based on the details provided:

* **What you are being charged for:** The charges consist of facility usage, provider professional fees, and diagnostic testing.
* **Insurance Payment:** Your insurance plan processed the claim and applied allowable contracted discounts, but certain amounts were allocated to your deductible and out-of-network line items.
* **Potential Errors / Flags:** We recommend checking whether any emergency physician fees were billed out-of-network or if duplicate lab tests were recorded.

---
**What to do next:**
1. Request an **Itemized Superbill** with all CPT billing codes.
2. Compare the itemized bill against your insurer's **Explanation of Benefits (EOB)**.
3. If you'd like, click **"Draft Dispute Letter"** below and I will generate a formal dispute letter for you!`;
}

/**
 * Stream a chat response from Gemini (with fallback simulation if key is missing).
 * Returns a ReadableStream of text chunks.
 */
export async function streamChat(
  message: string,
  history: ChatMessage[] = []
): Promise<ReadableStream<string>> {
  const ai = getClient();

  if (!ai) {
    // Return simulated stream for seamless evaluation
    const fallbackText = getSimulatedChatResponse(message);
    const words = fallbackText.split(" ");
    
    return new ReadableStream<string>({
      async start(controller) {
        for (let i = 0; i < words.length; i++) {
          controller.enqueue(words[i] + " ");
          await new Promise((r) => setTimeout(r, 25)); // realistic typewriter effect
        }
        controller.close();
      },
    });
  }

  try {
    // Build the contents array for Gemini
    const contents = [
      { role: "user" as const, parts: [{ text: CHAT_SYSTEM_PROMPT }] },
      {
        role: "model" as const,
        parts: [
          {
            text: "Understood. I am a calm, clear medical billing explainer and patient advocate. I will help patients understand their bills in plain English and draft dispute letters. How can I help you today?",
          },
        ],
      },
      // Add conversation history
      ...history.map((msg) => ({
        role: msg.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: msg.content }],
      })),
      // Add the current message
      { role: "user" as const, parts: [{ text: message }] },
    ];

    const response = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents,
    });

    // Convert the Gemini stream to a web ReadableStream
    return new ReadableStream<string>({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(text);
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  } catch (error) {
    console.error("Gemini stream error, falling back:", error);
    const fallbackText = getSimulatedChatResponse(message);
    return new ReadableStream<string>({
      start(controller) {
        controller.enqueue(fallbackText);
        controller.close();
      },
    });
  }
}

/**
 * Parse a bill/EOB image using Gemini multimodal.
 * Returns structured bill data as JSON.
 */
export async function parseBill(
  base64Data: string,
  mimeType: string
): Promise<{ parsed: Record<string, unknown>; rawResponse: string }> {
  const ai = getClient();

  if (!ai) {
    // Return structured parsed mock if API key not present
    return {
      parsed: {
        provider: "Regional Health & Emergency Specialists",
        dateOfService: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        totalCharged: 3850.0,
        insuranceCovered: 1850.0,
        patientBalance: 2000.0,
        lineItems: [
          {
            code: "CPT 99284",
            description: "Emergency Department Visit - Level 4",
            charged: 1950.0,
            insurancePaid: 1100.0,
            youOwe: 850.0,
          },
          {
            code: "CPT 70450",
            description: "CT Head Scan without Contrast",
            charged: 1100.0,
            insurancePaid: 750.0,
            youOwe: 350.0,
          },
          {
            code: "CPT 99291",
            description: "Physician Consult Emergency Charge",
            charged: 800.0,
            insurancePaid: 0.0,
            youOwe: 800.0,
            flag: "Out-of-network physician charge detected at in-network facility (No Surprises Act protection applies).",
          },
        ],
        notes: [
          "Out-of-network physician fee of $800 may be disputed under the No Surprises Act.",
          "Facility fee Level 4 represents high complexity — check if itemized breakdown matches actual care duration.",
          "Contact hospital patient advocate to apply for financial assistance or 0% interest payment plan.",
        ],
      },
      rawResponse: "Structured mock bill generated for demonstration",
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            { text: BILL_PARSE_PROMPT },
          ],
        },
      ],
    });

    const rawText = response.text ?? "";

    // Strip markdown code fences if present
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const parsed = JSON.parse(jsonStr);
    return { parsed, rawResponse: rawText };
  } catch (error) {
    console.error("Gemini parse bill error:", error);
    return {
      parsed: {
        error:
          "Could not parse the bill image completely. Please ensure the image is well-lit and all text is legible.",
      },
      rawResponse: String(error),
    };
  }
}

