"use client";

interface ErrorBannerProps {
    message: string;
    className?: string;
}

export default function ErrorBanner({ message, className = "" }: ErrorBannerProps) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm ${className}`}>
        {message}
      </div>
    );
  }