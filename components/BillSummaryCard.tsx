"use client";

import React from "react";

export interface BillLineItem {
  code: string;
  description: string;
  charged: number;
  insurancePaid?: number;
  youOwe: number;
  flag?: string;
}

export interface BillSummaryData {
  provider: string;
  dateOfService: string;
  currencySymbol?: string;
  totalCharged: number;
  insuranceCovered: number;
  patientBalance: number;
  lineItems: BillLineItem[];
  notes?: string[];
  accountNumber?: string;
}

interface BillSummaryCardProps {
  data: BillSummaryData;
  onDraftDisputeLetter?: (data: BillSummaryData) => void;
  onAskQuestion?: (question: string) => void;
}

export default function BillSummaryCard({
  data,
  onAskQuestion,
}: BillSummaryCardProps) {
  const curr = data.currencySymbol || "$";
  const insurancePercent =
    data.totalCharged > 0
      ? Math.min(100, Math.max(0, Math.round((data.insuranceCovered / data.totalCharged) * 100)))
      : 0;

  const hasFlags = data.lineItems.some((item) => !!item.flag);
  const flaggedCount = data.lineItems.filter((item) => !!item.flag).length;

  return (
    <div className="bg-white rounded-2xl overflow-hidden animate-fade-in max-w-2xl w-full border border-[#E5E7EB] shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EBF3FA] text-[#26619C] flex items-center justify-center font-bold text-lg shrink-0">
            📄
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#111827]">
                {data.provider}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EBF3FA] text-[#26619C] font-semibold">
                Analyzed
              </span>
            </div>
            <p className="text-xs text-[#6B7280]">
              Date of Service: {data.dateOfService}
            </p>
          </div>
        </div>

        {hasFlags && (
          <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {flaggedCount} {flaggedCount === 1 ? "Item" : "Items"} to Review
          </span>
        )}
      </div>

      {/* Financial Summary Metric Cards */}
      <div className="p-4 md:p-5 bg-white border-b border-[#E5E7EB] space-y-3.5">
        <div className="grid grid-cols-3 gap-2.5 md:gap-3 text-left">
          {/* Total Billed */}
          <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
            <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
              Total Billed
            </div>
            <div className="text-base md:text-lg font-bold text-[#111827] mt-1 font-mono">
              {curr}{data.totalCharged.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Insurance Paid */}
          <div className="p-3 rounded-xl bg-[#EBF3FA] border border-[#B9D7F2]">
            <div className="text-[11px] font-semibold text-[#26619C] uppercase tracking-wider">
              Insurance Paid
            </div>
            <div className="text-base md:text-lg font-bold text-[#26619C] mt-1 font-mono">
              -{curr}{data.insuranceCovered.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* You Owe */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
            <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
              You Owe
            </div>
            <div className="text-base md:text-lg font-bold text-amber-900 mt-1 font-mono">
              {curr}{data.patientBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="pt-1">
          <div className="h-2 rounded-full bg-[#F3F4F6] overflow-hidden flex">
            <div
              className="h-full bg-[#26619C] transition-all duration-700 rounded-l-full"
              style={{ width: `${insurancePercent}%` }}
              title={`Insurance covered ${insurancePercent}%`}
            />
            <div
              className="h-full bg-amber-400 transition-all duration-700 rounded-r-full"
              style={{ width: `${100 - insurancePercent}%` }}
              title={`Patient responsibility ${100 - insurancePercent}%`}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-[#6B7280] mt-1.5 font-medium">
            <span className="text-[#26619C] flex items-center gap-1 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#26619C] inline-block" />
              Insurance paid {insurancePercent}%
            </span>
            <span className="text-amber-700 flex items-center gap-1 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Your balance {100 - insurancePercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Itemized Services Breakdown */}
      <div className="px-4 md:px-5 py-3 space-y-2 max-h-64 overflow-y-auto">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-2 flex items-center justify-between">
          <span>Itemized Charges & Services</span>
          <span className="text-[10px] font-normal text-[#9CA3AF]">
            {data.lineItems.length} {data.lineItems.length === 1 ? "service" : "services"} listed
          </span>
        </div>

        {data.lineItems.map((item, i) => (
          <div
            key={i}
            className={`rounded-xl p-3 border transition-all ${
              item.flag
                ? "bg-amber-50/50 border-amber-200"
                : "bg-[#FAFAFA] border-[#E5E7EB] hover:border-[#D1D5DB]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-[#E5E7EB] text-[#374151] font-semibold">
                    Code: {item.code}
                  </span>
                  {item.flag && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold flex items-center gap-1">
                      ⚠️ Potential Issue
                    </span>
                  )}
                </div>
                <p className="text-xs md:text-sm text-[#111827] font-semibold leading-relaxed">
                  {item.description}
                </p>
                {item.flag && (
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed bg-white p-2 rounded-lg border border-amber-200">
                    {item.flag}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-[#111827] font-mono">
                  {curr}{item.youOwe.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-[#6B7280] font-mono">
                  billed {curr}{item.charged.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Key Recommendations */}
      {data.notes && data.notes.length > 0 && (
        <div className="px-4 md:px-5 py-3 border-t border-[#E5E7EB] bg-[#EBF3FA]/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#26619C] mb-1.5 flex items-center gap-1.5">
            <span>💡</span>
            <span>Key Recommendations</span>
          </p>
          <ul className="space-y-1">
            {data.notes.map((note, i) => (
              <li key={i} className="text-xs text-[#1F2937] flex items-start gap-2 leading-relaxed">
                <span className="text-[#26619C] font-bold shrink-0 mt-0.5">✓</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Footer Buttons */}
      <div className="p-3 border-t border-[#E5E7EB] bg-[#F9FAFB] flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() =>
            onAskQuestion?.(
              `Why is the charge for ${data.lineItems[0]?.description || "this bill"} so high and how can I reduce it?`
            )
          }
          className="text-xs font-semibold text-[#26619C] hover:bg-[#EBF3FA] transition-colors cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#26619C]/20"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          <span>Ask AI to explain charges</span>
        </button>

        <button
          onClick={() =>
            onAskQuestion?.("I have a dispute with this bill and want to send an email to the billing team. What details do you need from me?")
          }
          className="text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>I have a dispute with this bill</span>
        </button>
      </div>
    </div>
  );
}
