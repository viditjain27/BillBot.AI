"use client";

import React, { useRef } from "react";

interface UploadButtonProps {
  onFileSelect: (file: File) => void;
}

export default function UploadButton({ onFileSelect }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      e.target.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleChange}
        id="bill-upload-input"
      />
      <button
        id="upload-bill-button"
        onClick={handleClick}
        className="p-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 
                   transition-all duration-200 cursor-pointer group"
        title="Upload bill or EOB"
      >
        <svg
          className="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
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
    </>
  );
}
