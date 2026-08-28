"use client";

import React, { useRef, useState, useEffect } from "react";

interface UploadButtonProps {
  onFileSelect: (file: File) => void;
}

export default function UploadButton({ onFileSelect }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        "ontouchstart" in window ||
        window.matchMedia("(max-width: 768px)").matches
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
    };
    if (showMobileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMobileMenu]);

  const handleClick = () => {
    if (isMobile) {
      setShowMobileMenu((prev) => !prev);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      e.target.value = "";
    }
    setShowMobileMenu(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleChange}
        id="bill-upload-input"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
        id="bill-camera-input"
      />

      {/* Upload trigger button */}
      <button
        id="upload-bill-button"
        onClick={handleClick}
        className="p-2.5 rounded-xl text-[#6B7280] hover:text-[#26619C] hover:bg-[#EBF3FA] 
                   transition-all duration-200 cursor-pointer group flex items-center justify-center"
        title="Upload medical bill or EOB"
      >
        <svg
          className="w-5 h-5 transition-transform duration-200 group-hover:scale-105"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
          />
        </svg>
      </button>

      {/* Mobile camera/document picker sheet */}
      {showMobileMenu && isMobile && (
        <div className="absolute bottom-full left-0 mb-2 w-60 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl overflow-hidden animate-fade-in-up z-50 p-1.5 space-y-1">
          <button
            onClick={() => {
              cameraInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-[#1F2937] hover:bg-[#EBF3FA] hover:text-[#26619C] rounded-xl transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-[#EBF3FA] text-[#26619C] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-xs text-[#111827]">Open Camera</div>
              <div className="text-[10px] text-[#6B7280]">Snap a photo of your bill</div>
            </div>
          </button>

          <button
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-[#1F2937] hover:bg-[#EBF3FA] hover:text-[#26619C] rounded-xl transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-100 text-[#374151] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-xs text-[#111827]">From Documents</div>
              <div className="text-[10px] text-[#6B7280]">Browse PDFs and image files</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
