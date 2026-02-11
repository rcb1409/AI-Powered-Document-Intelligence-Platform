"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  Plus,
  Files,
  ChevronLeft,
  PanelLeftClose,
  PanelLeft,
  Loader2,
  Send,
  User,
  Bot,
  Info,
} from "lucide-react";
import DocumentCard from "@/components/DocumentCard";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

type DocumentItem = {
  id: number;
  filename: string;
  file_url: string;
  uploaded_at: string;
};

type ChatEntry = {
  id: number;
  question: string;
  answer: string;
  created_at: string;
};

interface WorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const router = useRouter();
  const { id } = use(params);
  const workspaceId = Number(id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [workspaceName, setWorkspaceName] = useState<string>("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [question, setQuestion] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    if (!workspaceId || Number.isNaN(workspaceId)) {
      setError("Invalid workspace ID");
      return;
    }
    loadWorkspaceInfo();
    loadDocuments();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, sending]);

  async function loadWorkspaceInfo() {
    try {
      const data = await apiFetch("/api/workspaces");
      const workspace = data.workspaces?.find((w: { id: number }) => w.id === workspaceId);
      if (workspace) setWorkspaceName(workspace.name);
    } catch (err) {
      console.error("Failed to load workspace info:", err);
    }
  }

  async function loadDocuments() {
    setLoadingDocuments(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/documents/workspace/${workspaceId}`);
      setDocuments(data.documents || []);
    } catch (err: any) {
      setError(err.message || "Failed to load documents");
    } finally {
      setLoadingDocuments(false);
    }
  }

  async function loadHistory() {
    setLoadingHistory(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/chat/workspace/${workspaceId}`);
      setHistory(data.history || []);
    } catch (err: any) {
      setError(err.message || "Failed to load chat history");
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `${API_BASE_URL}/api/documents/workspace/${workspaceId}/upload`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData }
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Upload failed");
      await loadDocuments();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(documentId: number) {
    setError(null);
    try {
      await apiFetch(`/api/documents/workspace/${workspaceId}/${documentId}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch (err: any) {
      setError(err.message || "Delete failed");
    }
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    setError(null);
    setSending(true);
    try {
      const data = await apiFetch("/api/chat/workspace/ask", {
        method: "POST",
        body: JSON.stringify({ workspaceId, question: trimmed }),
      });
      if (!data.success) throw new Error(data.error || "Failed to get answer");
      await loadHistory();
      setQuestion("");
    } catch (err: any) {
      setError(err.message || "Failed to get answer");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
      {/* Sidebar - Documents */}
      <aside
        className={`${
          sidebarOpen ? "w-80" : "w-0"
        } flex flex-col bg-white border-r border-slate-200 transition-all duration-300 overflow-hidden shrink-0`}
      >
        <div className="p-5 flex items-center justify-between border-b shrink-0">
          <div className="flex items-center gap-2">
            <Files size={18} className="text-slate-400" />
            <span className="font-semibold text-slate-700">Documents</span>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {documents.length}
            </span>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors disabled:opacity-50"
            disabled={uploading}
            title="Upload PDF"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            accept="application/pdf"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <p className="text-sm text-red-600 mb-2">{error}</p>
          )}
          {loadingDocuments ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : documents.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Plus size={20} className="text-slate-300" />
              </div>
              <p className="text-sm text-slate-500">No documents yet. Click + to upload PDFs.</p>
            </div>
          ) : (
            documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDelete={() => handleDelete(doc.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* Main area */}
      <section className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
            </button>
            <button
              onClick={() => router.push("/workspaces")}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
            >
              <ChevronLeft size={18} />
              <span className="text-sm font-medium">Workspaces</span>
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <h1 className="font-semibold text-slate-800 truncate max-w-[200px]">
              {workspaceName || `Workspace #${workspaceId}`}
            </h1>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8">
            {loadingHistory ? (
              <p className="text-sm text-slate-500">Loading chat...</p>
            ) : history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center space-y-6">
                <div className="bg-indigo-600/10 p-6 rounded-3xl">
                  <Bot size={48} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Document Q&A</h3>
                  <p className="text-slate-500 leading-relaxed">
                    Ask questions about your uploaded documents. Answers use content from all files in this workspace.
                  </p>
                </div>
                {documents.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-left max-w-md">
                    <Info className="text-amber-500 shrink-0" size={20} />
                    <p className="text-sm text-amber-800">
                      <span className="font-bold">Tip:</span> Upload PDFs in the sidebar first so I can answer from them.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-3xl mx-auto w-full space-y-6">
                {history.map((entry) => (
                  <>
                    <div key={`q-${entry.id}`} className="flex gap-4 justify-end">
                      <div className="flex gap-4 max-w-[85%] flex-row-reverse">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center">
                          <User size={16} />
                        </div>
                        <div className="rounded-2xl px-5 py-3.5 shadow-sm text-sm bg-indigo-600 text-white">
                          {entry.question}
                        </div>
                      </div>
                    </div>
                    <div key={`a-${entry.id}`} className="flex gap-4 justify-start">
                      <div className="flex gap-4 max-w-[85%]">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Bot size={16} />
                        </div>
                        <div className="rounded-2xl px-5 py-3.5 shadow-sm text-sm bg-white border border-slate-100 text-slate-800 whitespace-pre-wrap">
                          {entry.answer}
                        </div>
                      </div>
                    </div>
                  </>
                ))}
                {sending && (
                  <div className="flex gap-4 justify-start">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Bot size={16} />
                    </div>
                    <div className="rounded-2xl px-5 py-3 shadow-sm flex items-center gap-2 bg-white border border-slate-100">
                      <Loader2 size={16} className="animate-spin text-indigo-600" />
                      <span className="text-sm text-slate-500">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-6 bg-white border-t border-slate-200">
            <form onSubmit={handleAsk} className="max-w-3xl mx-auto relative">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  documents.length > 0
                    ? "Ask about your documents..."
                    : "Upload documents to get started..."
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-6 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!question.trim() || sending}
                className={`absolute right-2 top-2 bottom-2 px-4 rounded-xl flex items-center justify-center ${
                  question.trim() && !sending
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-slate-100 text-slate-300"
                }`}
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}