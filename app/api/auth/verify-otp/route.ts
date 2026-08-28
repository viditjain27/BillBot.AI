import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otpStore";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, customName } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and 6-digit verification code are required." },
        { status: 400 }
      );
    }

    const result = verifyOtp(email, otp);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    // Determine user's final display name
    const finalName = (customName && customName.trim().length > 0)
      ? customName.trim()
      : result.defaultName;

    // Ephemeral session token (not saved to database)
    const sessionId = uuidv4();

    return NextResponse.json({
      success: true,
      user: {
        id: sessionId,
        name: finalName,
        email: email.trim().toLowerCase(),
        avatarInitial: finalName.charAt(0).toUpperCase() || "U",
        loginTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[VERIFY ERROR]", error);
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
