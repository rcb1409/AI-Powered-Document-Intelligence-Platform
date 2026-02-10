"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type ChatEntry = {
  id: number;
  question: string;
  answer: string;
  created_at: string;
};

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

export default function DocumentChatPage({ params }: DocumentPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const documentId = Number(id);

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
    if (!documentId || Number.isNaN(documentId)) {
      setError("Invalid document ID");
      return;
    }
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  async function loadHistory() {
    setLoadingHistory(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/chat/${documentId}`);
      setHistory(data.history || []);
    } catch (err: any) {
      setError(err.message || "Failed to load chat history");
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = question.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      const data = await apiFetch("/api/chat/ask", {
        method: "POST",
        body: JSON.stringify({ documentId, question: trimmed }),
      });

      if (!data.success) {
        throw new Error(data.error || "Failed to get answer");
      }

      await loadHistory();
      setQuestion("");
    } catch (err: any) {
      setError(err.message || "Failed to get answer");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Document #{documentId} – Q&amp;A
          </h1>
          <p className="text-sm text-gray-500">
            Ask questions based on this document&apos;s content.
          </p>
        </div>
        <button
          onClick={() => router.push("/documents")}
          className="rounded border px-3 py-2 text-sm"
        >
          Back to documents
        </button>
      </header>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-medium">Ask a question</h2>
        <form onSubmit={handleAsk} className="space-y-3">
          <textarea
            className="w-full rounded border px-3 py-2 text-sm min-h-[80px]"
            placeholder="What is this document about?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            type="submit"
            disabled={sending || !question.trim()}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {sending ? "Thinking..." : "Ask"}
          </button>
        </form>
      </section>

      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-medium">Conversation history</h2>

        {loadingHistory ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500">
            No questions yet. Ask something above.
          </p>
        ) : (
          <ul className="space-y-4">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="space-y-2 border-b pb-3 last:border-b-0"
              >
                <p className="text-sm font-medium">Q: {entry.question}</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  A: {entry.answer}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(entry.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}