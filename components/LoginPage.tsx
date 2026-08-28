"use client";

import React, { useState } from "react";
import { UserSession } from "./AuthModal";

interface LoginPageProps {
  onLoginSuccess: (user: UserSession) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [step, setStep] = useState<"email" | "otp" | "name">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [verifiedUser, setVerifiedUser] = useState<UserSession | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      setDemoOtp(data.demoOtp || null);
      setSuccessMessage(`6-digit code sent to ${email}`);
      setStep("otp");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error sending code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`login-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`login-otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleAutoFillDemo = () => {
    if (demoOtp && demoOtp.length === 6) {
      setOtp(demoOtp.split(""));
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the code.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otpCode,
          customName: customName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setVerifiedUser(data.user);
      setCustomName(data.user.name);
      setStep("name");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalConfirmName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedUser) return;

    const finalName = customName.trim() || verifiedUser.name;
    const finalUser: UserSession = {
      ...verifiedUser,
      name: finalName,
      avatarInitial: finalName.charAt(0).toUpperCase() || "U",
    };

    onLoginSuccess(finalUser);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#0b0f17] text-foreground p-4 overflow-hidden select-none">
      {/* Dynamic Gemini Aurora Background Lights */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-br from-[#4285F4]/20 to-[#9b72cb]/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-gradient-to-tl from-[#1a73e8]/20 to-[#2dd4a8]/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-radial from-[#9b72cb]/10 via-transparent to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md bg-[#131924]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/80 flex flex-col items-center text-center">
        {/* Cool BillBot Logo */}
        <div className="relative mb-5 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#4285F4] via-[#9b72cb] to-[#2dd4a8] rounded-3xl blur-md opacity-75 group-hover:opacity-100 transition duration-500" />
          <div className="relative w-16 h-16 rounded-2xl bg-[#0e131d] border border-white/15 flex items-center justify-center shadow-2xl p-2.5">
            <svg
              className="w-full h-full"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bb-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4285F4" />
                  <stop offset="50%" stopColor="#9b72cb" />
                  <stop offset="100%" stopColor="#2dd4a8" />
                </linearGradient>
                <linearGradient id="bb-grad-sparkle" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5eead4" />
                  <stop offset="100%" stopColor="#4285F4" />
                </linearGradient>
              </defs>
              {/* Document / Shield Outline */}
              <rect
                x="8"
                y="6"
                width="32"
                height="36"
                rx="8"
                stroke="url(#bb-grad-primary)"
                strokeWidth="2.5"
                fill="#131924"
              />
              {/* Medical Cross in Center */}
              <rect x="21" y="14" width="6" height="18" rx="2" fill="url(#bb-grad-primary)" />
              <rect x="15" y="20" width="18" height="6" rx="2" fill="url(#bb-grad-primary)" />
              {/* AI Sparkle Stars */}
              <path
                d="M34 10L35.2 13.8L39 15L35.2 16.2L34 20L32.8 16.2L29 15L32.8 13.8L34 10Z"
                fill="url(#bb-grad-sparkle)"
              />
              <circle cx="14" cy="36" r="1.5" fill="#2dd4a8" />
              <circle cx="18" cy="36" r="1.5" fill="#4285F4" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#4285F4] via-[#9b72cb] to-[#2dd4a8] bg-clip-text text-transparent mb-6">
          BillBot AI
        </h1>

        {/* Step Indicators */}
        <div className="flex items-center gap-2 mb-6">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === "email" ? "w-8 bg-[#4285F4]" : "w-2 bg-white/20"
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === "otp" ? "w-8 bg-[#9b72cb]" : "w-2 bg-white/20"
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === "name" ? "w-8 bg-[#2dd4a8]" : "w-2 bg-white/20"
            }`}
          />
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-400 flex items-center gap-2 text-left animate-fade-in">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success / OTP Auto-fill Notice */}
        {successMessage && step === "otp" && (
          <div className="w-full mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2 text-left">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMessage}</span>
            </div>
            {demoOtp && (
              <button
                type="button"
                onClick={handleAutoFillDemo}
                className="px-2.5 py-1 bg-gradient-to-r from-[#4285F4] to-[#9b72cb] text-white text-[11px] font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer shrink-0 shadow-sm"
              >
                Auto-fill Code
              </button>
            )}
          </div>
        )}

        {/* STEP 1: EMAIL INPUT */}
        {step === "email" && (
          <form onSubmit={handleSendOtp} className="w-full space-y-4 text-left">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Sign in with your Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#4285F4] focus:ring-1 focus:ring-[#4285F4] transition-all"
                />
                <svg
                  className="w-5 h-5 absolute right-3.5 top-3.5 text-muted-foreground/60 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#1a73e8] via-[#4285F4] to-[#9b72cb] text-white font-semibold rounded-2xl shadow-lg shadow-[#4285F4]/25 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="w-full space-y-5 text-left">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Enter 6-Digit Code
                </label>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="text-xs text-[#4285F4] hover:underline cursor-pointer"
                >
                  Change email
                </button>
              </div>

              <div className="flex justify-between gap-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`login-otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-12 h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-2xl text-foreground focus:outline-none focus:border-[#9b72cb] focus:ring-1 focus:ring-[#9b72cb] transition-all shadow-inner"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.join("").length < 6}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#4285F4] to-[#9b72cb] text-white font-semibold rounded-2xl shadow-lg shadow-[#9b72cb]/25 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Verify Code</span>
              )}
            </button>
          </form>
        )}

        {/* STEP 3: CONFIRM / EDIT DISPLAY NAME */}
        {step === "name" && (
          <form onSubmit={handleFinalConfirmName} className="w-full space-y-4 text-left">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Display Name (Fetched from email or customize)
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Your Name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-foreground focus:outline-none focus:border-[#2dd4a8] focus:ring-1 focus:ring-[#2dd4a8] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !customName.trim()}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#4285F4] via-[#9b72cb] to-[#2dd4a8] text-white font-semibold rounded-2xl shadow-lg shadow-[#2dd4a8]/20 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Launch Assistant</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
