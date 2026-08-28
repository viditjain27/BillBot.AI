"use client";

import React, { useState } from "react";
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

  if (!isOpen) return null;

  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const provider = billData?.provider || "Hospital / Medical Provider Billing Dept";
  const accountNum = billData?.accountNumber || "ACC-109283-X";
  const dateOfService = billData?.dateOfService || "Recent Encounter";
  const patientBalance = billData ? `$${billData.patientBalance.toFixed(2)}` : "$0.00";

  const letterText = `DATE: ${dateStr}
TO: ${provider}
ATTN: Patient Accounts / Billing Disputes Department
RE: FORMAL BILLING DISPUTE & AUDIT REQUEST
ACCOUNT NUMBER: ${accountNum}
DATE OF SERVICE: ${dateOfService}
DISPUTED BALANCE: ${patientBalance}

To Whom It May Concern,

I am writing to formally dispute the outstanding balance on the account referenced above. Upon careful examination of the itemized statement and my insurance Explanation of Benefits (EOB), I have identified charges that require immediate adjustment or justification:

1. COMPLIANCE WITH THE NO SURPRISES ACT:
Under the Federal No Surprises Act (45 C.F.R. § 149.410), patients receiving emergency or ancillary services are protected against out-of-network balance billing. Any out-of-network professional fees must be reprocessed to reflect strictly in-network cost-sharing limits.

2. REQUEST FOR CODING AND MEDICAL RECORD AUDIT:
I am requesting a comprehensive itemized billing statement (including all HCPCS/CPT codes, revenue codes, and pharmacy units) to confirm that no duplicate services or unbundled codes were billed.

3. NOTICE OF BILLING HOLD:
Pursuant to federal and state consumer protection statutes, please place a 30-day administrative hold on this account to prevent collection actions, credit reporting, or late penalties while this dispute is under review.

Please reply in writing within thirty (30) days with an amended statement or written justification.

Sincerely,

${userName}
Patient / Authorized Representative
Email: On File
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(letterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-elevated/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Medical Bill Dispute Letter</h2>
              <p className="text-xs text-muted-foreground">Ready to copy, send, or submit to billing</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Letter Body Preview */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-foreground/90 bg-background/50 leading-relaxed whitespace-pre-wrap select-all">
          {letterText}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-surface-elevated/50 flex items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground">
            💡 Tip: Send via certified mail or provider patient portal.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-surface hover:bg-surface-elevated border border-border rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.72 13.829c-.24-1.04-.37-2.12-.37-3.229 0-4.418 3.582-8 8-8s8 3.582 8 8c0 1.109-.13 2.189-.37 3.229M6.72 13.829C3.896 14.887 2 17.65 2 20.8V21h20v-.2c0-3.15-1.896-5.913-4.72-6.971" />
              </svg>
              <span>Print</span>
            </button>

            <button
              onClick={handleCopy}
              className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-primary to-primary-light text-background rounded-xl shadow-md shadow-primary/20 hover:opacity-95 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  <span>Copy Letter</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
