"use client";

import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function LoadingSpinner({ 
  message = "Loading...", 
  size = "md",
  className = "" 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  return (
    <div className={`flex items-center gap-2 text-slate-500 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin`} />
      <span className="text-sm">{message}</span>
    </div>
  );
}