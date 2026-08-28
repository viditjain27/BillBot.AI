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
  onDraftDisputeLetter,
  onAskQuestion,
}: BillSummaryCardProps) {
  const insurancePercent =
    data.totalCharged > 0
      ? Math.min(100, Math.max(0, Math.round((data.insuranceCovered / data.totalCharged) * 100)))
      : 0;

  const hasFlags = data.lineItems.some((item) => !!item.flag);

  return (
    <div className="bg-[#131924] rounded-3xl overflow-hidden animate-fade-in max-w-xl w-full border border-white/10 shadow-2xl shadow-black/80">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1a73e8] via-[#9b72cb] to-[#d96570] flex items-center justify-center p-0.5 shadow-md shadow-[#9b72cb]/20">
            <div className="w-full h-full bg-[#131924] rounded-[10px] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#4285F4]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
              </svg>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Medical Bill Breakdown
            </h3>
            <p className="text-xs text-muted-foreground">
              {data.provider} • {data.dateOfService}
            </p>
          </div>
        </div>

        {hasFlags && (
          <span className="px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Review Issues
          </span>
        )}
      </div>

      {/* Financial Summary Meter */}
      <div className="p-5 bg-background/60 border-b border-border/60 space-y-3">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2.5 rounded-xl bg-surface-elevated/70 border border-border/50">
            <div className="text-[10px] text-muted-foreground uppercase font-medium">Billed</div>
            <div className="text-sm font-bold text-foreground mt-0.5">${data.totalCharged.toFixed(2)}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <div className="text-[10px] text-primary uppercase font-medium">Insurance Paid</div>
            <div className="text-sm font-bold text-primary mt-0.5">-${data.insuranceCovered.toFixed(2)}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <div className="text-[10px] text-rose-400 uppercase font-medium">You Owe</div>
            <div className="text-sm font-bold text-rose-400 mt-0.5">${data.patientBalance.toFixed(2)}</div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div>
          <div className="h-2 rounded-full bg-surface-elevated overflow-hidden flex">
            <div
              className="h-full bg-primary transition-all duration-700"
              style={{ width: `${insurancePercent}%` }}
              title={`Insurance paid ${insurancePercent}%`}
            />
            <div
              className="h-full bg-rose-500 transition-all duration-700"
              style={{ width: `${100 - insurancePercent}%` }}
              title={`Patient responsibility ${100 - insurancePercent}%`}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1.5 font-medium">
            <span className="text-primary">● Insurance covered {insurancePercent}%</span>
            <span className="text-rose-400">● Your share {100 - insurancePercent}%</span>
          </div>
        </div>
      </div>

      {/* Itemized Line Items */}
      <div className="px-5 py-3 space-y-2 max-h-60 overflow-y-auto">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Itemized Services & Billing Codes
        </div>
        {data.lineItems.map((item, i) => (
          <div
            key={i}
            className={`rounded-xl p-3 border transition-all ${
              item.flag
                ? "bg-amber-500/10 border-amber-500/30 shadow-sm"
                : "bg-surface-elevated/40 border-border/50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary-light font-bold">
                    {item.code}
                  </span>
                  {item.flag && (
                    <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                      ⚠️ Potential Error / Dispute
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground/90 font-medium leading-relaxed">
                  {item.description}
                </p>
                {item.flag && (
                  <p className="text-[11px] text-amber-300 mt-1 leading-relaxed bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    {item.flag}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-foreground font-mono">
                  ${item.youOwe.toFixed(2)}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  billed ${item.charged.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Notes / Action Items */}
      {data.notes && data.notes.length > 0 && (
        <div className="px-5 py-3 border-t border-border bg-surface-elevated/20">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Key Recommendations
          </p>
          <ul className="space-y-1">
            {data.notes.map((note, i) => (
              <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                <span className="text-primary shrink-0 mt-0.5">✓</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Card Action Buttons */}
      <div className="p-3 border-t border-border bg-surface-elevated/60 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() =>
            onAskQuestion?.(
              `Why is the charge for ${data.lineItems[0]?.description || "this bill"} so high and how can I reduce it?`
            )
          }
          className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span>Ask AI to explain charges</span>
        </button>

        {onDraftDisputeLetter && (
          <button
            onClick={() => onDraftDisputeLetter(data)}
            className="px-3.5 py-1.5 bg-accent hover:bg-accent/90 text-background text-xs font-semibold rounded-xl shadow-md shadow-accent/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span>Draft Dispute Letter</span>
          </button>
        )}
      </div>
    </div>
  );
}
