// In-memory ephemeral OTP store.
// Strict Privacy: Emails and OTPs are stored temporarily in-memory with TTL and NEVER written to the database.

interface OtpEntry {
  otp: string;
  expiresAt: number;
  attempts: number;
}

const otpMap = new Map<string, OtpEntry>();

// Clean up expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of otpMap.entries()) {
    if (entry.expiresAt < now) {
      otpMap.delete(email);
    }
  }
}, 60 * 1000);

export function generateAndSaveOtp(email: string): { otp: string; expiresAt: number } {
  const normalizedEmail = email.trim().toLowerCase();
  
  // Generate secure 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes TTL

  otpMap.set(normalizedEmail, {
    otp,
    expiresAt,
    attempts: 0,
  });

  return { otp, expiresAt };
}

export function verifyOtp(
  email: string,
  providedOtp: string
): { success: boolean; message: string; defaultName: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const entry = otpMap.get(normalizedEmail);

  // Extract a clean default name from email (e.g. "alex.miller@gmail.com" -> "Alex Miller")
  const usernamePart = normalizedEmail.split("@")[0] || "User";
  const defaultName = usernamePart
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

  if (!entry) {
    return {
      success: false,
      message: "No active verification code found for this email. Please request a new code.",
      defaultName,
    };
  }

  if (Date.now() > entry.expiresAt) {
    otpMap.delete(normalizedEmail);
    return {
      success: false,
      message: "Verification code has expired. Please request a new code.",
      defaultName,
    };
  }

  if (entry.attempts >= 5) {
    otpMap.delete(normalizedEmail);
    return {
      success: false,
      message: "Too many failed attempts. Please request a new code.",
      defaultName,
    };
  }

  if (entry.otp !== providedOtp.trim()) {
    entry.attempts += 1;
    return {
      success: false,
      message: "Invalid verification code. Please check and try again.",
      defaultName,
    };
  }

  // Verification succeeded - clear OTP from memory
  otpMap.delete(normalizedEmail);

  return {
    success: true,
    message: "Verified successfully",
    defaultName,
  };
}
