"use client";

import { FileText, Trash2 } from "lucide-react";

type DocumentItem = {
  id: number;
  filename: string;
  file_url: string;
  uploaded_at: string;
};

interface DocumentCardProps {
  document: DocumentItem;
  onDelete: () => void;
}

export default function DocumentCard({ document, onDelete }: DocumentCardProps) {
  return (
    <div className="border border-slate-100 bg-slate-50/50 rounded-xl overflow-hidden hover:border-indigo-100 transition-colors">
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
            <FileText size={16} className="text-indigo-500" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-slate-700 truncate">{document.filename}</h4>
            <span className="text-[10px] text-slate-400">
              {new Date(document.uploaded_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded text-slate-300 transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}