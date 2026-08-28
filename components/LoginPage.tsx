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
    const otpStr = otp.join("");
    if (otpStr.length < 6) {
      setErrorMessage("Please enter all 6 digits.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otpStr }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      const sessionUser: UserSession = {
        id: `session-${Date.now()}`,
        email: data.email || email,
        name: data.name || email.split("@")[0],
        avatarInitial: (data.name || email)[0].toUpperCase(),
        loginTime: new Date().toISOString(),
      };

      setVerifiedUser(sessionUser);
      setCustomName(sessionUser.name);
      setStep("name");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Verification error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalConfirmName = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = customName.trim() || "Patient";
    const finalUser: UserSession = {
      ...(verifiedUser || {
        id: `session-${Date.now()}`,
        email,
        loginTime: new Date().toISOString(),
      }),
      name: finalName,
      avatarInitial: finalName[0].toUpperCase(),
    };
    onLoginSuccess(finalUser);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#F7F9FB] text-[#111827] p-4 select-none">
      {/* Soft Decorative Ambient Background */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#EBF3FA] rounded-full blur-3xl pointer-events-none opacity-70" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-50 rounded-full blur-3xl pointer-events-none opacity-70" />

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-6 md:p-8 shadow-lg flex flex-col items-center text-center">
        {/* Brand Logo */}
        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md mb-3 border border-[#E5E7EB] bg-white flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="BillBot AI Logo"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-extrabold tracking-tight text-[#111827]">
          BillBot AI
        </h1>
        <p className="text-xs text-[#6B7280] mt-1 mb-6">
          Your personal medical billing advocate & explainer
        </p>

        {/* Step Indicators */}
        <div className="flex items-center gap-1.5 mb-6">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === "email" ? "w-8 bg-[#26619C]" : "w-2 bg-gray-200"
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === "otp" ? "w-8 bg-[#26619C]" : "w-2 bg-gray-200"
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === "name" ? "w-8 bg-[#26619C]" : "w-2 bg-gray-200"
            }`}
          />
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 text-left animate-fade-in">
            <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success / OTP Auto-fill Notice */}
        {successMessage && step === "otp" && (
          <div className="w-full mb-4 p-3 bg-[#EBF3FA] border border-[#B9D7F2] rounded-xl text-xs text-[#26619C] flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2 text-left">
              <svg className="w-4 h-4 shrink-0 text-[#26619C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMessage}</span>
            </div>
            {demoOtp && (
              <button
                type="button"
                onClick={handleAutoFillDemo}
                className="px-2.5 py-1 bg-[#26619C] text-white text-[11px] font-bold rounded-lg hover:bg-[#1C4B79] transition-opacity cursor-pointer shrink-0 shadow-2xs"
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
              <label className="block text-xs font-bold text-[#374151] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#26619C] focus:ring-2 focus:ring-[#26619C]/20 transition-all"
                />
                <svg
                  className="w-5 h-5 absolute right-3.5 top-3.5 text-[#9CA3AF] pointer-events-none"
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
              className="w-full py-3 px-4 bg-[#26619C] hover:bg-[#1C4B79] text-white font-bold rounded-xl shadow-md shadow-[#26619C]/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
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
                <label className="text-xs font-bold text-[#374151]">
                  Enter 6-Digit Code
                </label>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="text-xs text-[#26619C] font-semibold hover:underline cursor-pointer"
                >
                  Change email
                </button>
              </div>

              <div className="flex justify-between gap-1.5 sm:gap-2">
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
                    className="w-11 sm:w-12 h-13 text-center text-xl font-bold bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:border-[#26619C] focus:ring-2 focus:ring-[#26619C]/20 transition-all"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.join("").length < 6}
              className="w-full py-3 px-4 bg-[#26619C] hover:bg-[#1C4B79] text-white font-bold rounded-xl shadow-md shadow-[#26619C]/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
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
              <label className="block text-xs font-bold text-[#374151] mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Your Name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm text-[#111827] focus:outline-none focus:border-[#26619C] focus:ring-2 focus:ring-[#26619C]/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !customName.trim()}
              className="w-full py-3 px-4 bg-[#26619C] hover:bg-[#1C4B79] text-white font-bold rounded-xl shadow-md shadow-[#26619C]/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
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
