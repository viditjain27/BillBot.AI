"use client";

import React, { useState, useEffect } from "react";
import { BillSummaryData } from "./BillSummaryCard";

interface DisputeLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  billData?: BillSummaryData | null;
  userName?: string;
}

export default function DisputeLetterModal({
  isOpen,
  onClose,
  billData,
  userName = "Patient",
}: DisputeLetterModalProps) {
  const [copied, setCopied] = useState(false);

  const curr = billData?.currencySymbol || "$";
  const provider = billData?.provider || "Hospital / Clinic Billing Department";
  const accountNum = billData?.accountNumber || "ACC-109283-X";
  const dateOfService = billData?.dateOfService || "Recent Encounter";
  const totalCharged = billData ? `${curr}${billData.totalCharged.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${curr}0.00`;
  const patientBalance = billData ? `${curr}${billData.patientBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${curr}0.00`;

  // Build itemized breakdown bullets for dispute email
  const flaggedItems = billData?.lineItems.filter((item) => !!item.flag) || [];
  const lineItemsList = (flaggedItems.length > 0 ? flaggedItems : billData?.lineItems || [])
    .slice(0, 4)
    .map(
      (item) =>
        `• ${item.code} (${item.description}) — Billed: ${curr}${item.charged.toFixed(2)}${
          item.flag ? ` [FLAGGED: ${item.flag}]` : ""
        }`
    )
    .join("\n");

  const generateDefaultBody = () => {
    return `Dear Patient Accounts & Billing Department,

I am writing to formally dispute the outstanding balance on my statement for medical services received on ${dateOfService}.

ACCOUNT DETAILS:
• Patient Name: ${userName}
• Account / Invoice Number: ${accountNum}
• Facility / Provider: ${provider}
• Total Billed: ${totalCharged}
• Disputed Patient Balance: ${patientBalance}

DISPUTED CHARGES & CONCERNS:
${lineItemsList || `• Itemized charges under review for coding accuracy and coverage eligibility.`}

MY REQUESTS:
1. Itemized Superbill Audit: Please provide a complete itemized statement listing all CPT/HCPCS codes, revenue codes, and service descriptions.
2. Compliance Review: Please ensure all emergency and ancillary services adhere to consumer protection laws (including the No Surprises Act / standard in-network cost-sharing limits).
3. 30-Day Administrative Billing Hold: Pursuant to patient billing guidelines, please place a 30-day hold on this account to prevent collection actions or late penalties while this review is ongoing.

Please confirm receipt of this dispute in writing within 30 days and provide an updated, audited billing statement.

Thank you for your prompt assistance.

Sincerely,

${userName}
Patient / Account Holder
Contact: On File`;
  };

  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Initialize or reset email draft whenever billData changes
  useEffect(() => {
    const cleanProviderName = provider.toLowerCase().replace(/[^a-z0-9]/g, "");
    setToEmail(`billing@${cleanProviderName || "hospital"}.com`);
    setSubject(`Formal Billing Dispute & Itemized Audit Request - ${userName} (${accountNum})`);
    setEmailBody(generateDefaultBody());
  }, [billData, userName, provider, accountNum, dateOfService, totalCharged, patientBalance, lineItemsList]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const fullEmailText = `To: ${toEmail}\nSubject: ${subject}\n\n${emailBody}`;
    navigator.clipboard.writeText(fullEmailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenEmailClient = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoUrl, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResetDraft = () => {
    setEmailBody(generateDefaultBody());
    setSubject(`Formal Billing Dispute & Itemized Audit Request - ${userName} (${accountNum})`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-3xl bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 md:px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF3FA] text-[#26619C] flex items-center justify-center font-bold text-lg shrink-0">
              ✉️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold text-[#111827]">Dispute Email Composer</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EBF3FA] text-[#26619C] font-bold">
                  Personalized Draft
                </span>
              </div>
              <p className="text-xs text-[#6B7280]">Edit details, copy, or launch directly in your email client</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-xl transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step Indicator Header */}
        <div className="px-5 md:px-6 py-2.5 border-b border-[#E5E7EB] bg-[#F7F9FB] flex items-center gap-2 text-xs">
          <span className="font-bold text-[#26619C]">Step 3 of 3:</span>
          <span className="text-[#6B7280]">Review and send your formal billing dispute</span>
        </div>

        {/* Email Header Inputs (To & Subject) */}
        <div className="px-5 md:px-6 py-3.5 border-b border-[#E5E7EB] bg-white space-y-2.5">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-[#374151] w-16 shrink-0">To:</label>
            <input
              type="text"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="e.g. billing@hospital.com or Patient Accounts Dept"
              className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#26619C] rounded-xl px-3 py-1.5 text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-[#374151] w-16 shrink-0">Subject:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#26619C] rounded-xl px-3 py-1.5 text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none font-medium"
            />
          </div>
        </div>

        {/* Editable Email Body */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-[#FAFAFA] flex flex-col min-h-[260px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1.5">
              <span>✍️</span>
              <span>Editable Email Body (click to modify)</span>
            </span>
            <button
              onClick={handleResetDraft}
              className="text-[11px] text-[#26619C] font-semibold hover:underline cursor-pointer"
            >
              Reset to Original AI Draft
            </button>
          </div>

          <textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            className="flex-1 w-full bg-white border border-[#E5E7EB] focus:border-[#26619C] rounded-xl p-4 text-xs font-mono text-[#111827] leading-relaxed resize-none focus:outline-none min-h-[220px] shadow-2xs"
            placeholder="Type or edit your dispute message here..."
          />
        </div>

        {/* Footer Actions */}
        <div className="px-5 md:px-6 py-4 border-t border-[#E5E7EB] bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-[#6B7280] flex items-center gap-1.5">
            <span>💡</span>
            <span>You can copy this text, launch your mail app, or print a paper copy.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-2 text-xs font-medium text-[#374151] hover:text-[#111827] bg-[#F3F4F6] hover:bg-[#E5E7EB] border border-[#E5E7EB] rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              title="Print letter or save as PDF"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.72 13.829c-.24-1.04-.37-2.12-.37-3.229 0-4.418 3.582-8 8-8s8 3.582 8 8c0 1.109-.13 2.189-.37 3.229M6.72 13.829C3.896 14.887 2 17.65 2 20.8V21h20v-.2c0-3.15-1.896-5.913-4.72-6.971" />
              </svg>
              <span>Print</span>
            </button>

            <button
              onClick={handleOpenEmailClient}
              className="px-3.5 py-2 text-xs font-bold bg-[#EBF3FA] hover:bg-[#DCEBFA] text-[#26619C] border border-[#B9D7F2] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="Open in Gmail / Apple Mail"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              <span>Send via Email App</span>
            </button>

            <button
              onClick={handleCopy}
              className="px-4 py-2 text-xs font-bold bg-[#26619C] hover:bg-[#1C4B79] text-white rounded-xl shadow-md shadow-[#26619C]/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  <span>Copy Full Email</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
