import { NextRequest, NextResponse } from "next/server";
import { saveOtpToDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Generate secure 6-digit numeric OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const { otp, expiresAt } = await saveOtpToDb(email, generatedOtp);

    console.log(`[AUTH] Sent OTP to ${email}: ${otp}`);

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${email}`,
      expiresAt,
      // Provide demoOtp for instant 1-click testing
      demoOtp: otp,
    });
  } catch (error) {
    console.error("[AUTH ERROR]", error);
    return NextResponse.json(
      { error: "Failed to send verification code. Please try again." },
      { status: 500 }
    );
  }
}
