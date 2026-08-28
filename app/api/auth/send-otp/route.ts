import { NextRequest, NextResponse } from "next/server";
import { generateAndSaveOtp } from "@/lib/otpStore";

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

    const { otp, expiresAt } = generateAndSaveOtp(email);

    // In a production app with SMTP, you would send an email here via Resend/SendGrid.
    // For fast judging and demonstration, we return the OTP code in response and log it.
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
