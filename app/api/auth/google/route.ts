import { NextRequest, NextResponse } from "next/server";
import { upsertUser } from "@/lib/db";

interface GoogleTokenPayload {
  email: string;
  email_verified: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  sub: string;
  aud: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential } = body;

    if (!credential || typeof credential !== "string") {
      return NextResponse.json(
        { error: "Google credential token is required." },
        { status: 400 }
      );
    }

    // Verify the Google JWT token via Google's tokeninfo endpoint
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );

    if (!verifyRes.ok) {
      console.error("[GOOGLE AUTH] Token verification failed:", verifyRes.status);
      return NextResponse.json(
        { error: "Invalid Google token. Please try signing in again." },
        { status: 401 }
      );
    }

    const payload: GoogleTokenPayload = await verifyRes.json();

    // Validate the token audience matches our client ID
    const expectedClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (expectedClientId && expectedClientId !== "your_google_client_id_here" && payload.aud !== expectedClientId) {
      console.error("[GOOGLE AUTH] Token audience mismatch:", payload.aud);
      return NextResponse.json(
        { error: "Token was not issued for this application." },
        { status: 401 }
      );
    }

    // Ensure email is verified
    if (payload.email_verified !== "true") {
      return NextResponse.json(
        { error: "Google email is not verified. Please use a verified Google account." },
        { status: 400 }
      );
    }

    const email = payload.email.trim().toLowerCase();
    const name = payload.name || payload.given_name || email.split("@")[0];

    // Create or update user in the database
    const dbUser = await upsertUser(email, name);

    console.log(`[GOOGLE AUTH] Authenticated: ${email} (${name})`);

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        name,
        email,
        avatarInitial: name.charAt(0).toUpperCase() || "U",
        loginTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[GOOGLE AUTH ERROR]", error);
    return NextResponse.json(
      { error: "Google sign-in failed. Please try again." },
      { status: 500 }
    );
  }
}
