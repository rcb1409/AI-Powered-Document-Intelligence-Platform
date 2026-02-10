"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken, clearToken } from "@/lib/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

type DocumentItem = {
  id: number;
  filename: string;
  file_url: string;
  uploaded_at: string;
};

export default function DocumentsPage() {
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // 1) Guard route: must be logged in
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDocuments() {
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch("/api/documents");
      setDocuments(data.documents || []);
    } catch (err: any) {
      setError(err.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // DO NOT set Content-Type manually for FormData
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
      }

      // Refresh list
      setFile(null);
      await loadDocuments();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(documentId: number) {
    setError(null);
    try {
      await apiFetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch (err: any) {
      setError(err.message || "Delete failed");
    }
  }

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <main className="min-h-screen p-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Documents</h1>
        <button
          onClick={handleLogout}
          className="rounded border px-3 py-2 text-sm"
        >
          Logout
        </button>
      </header>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Upload */}
      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-medium">Upload a PDF</h2>
        <form onSubmit={handleUpload} className="flex flex-col gap-3">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            type="submit"
            disabled={uploading}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      </section>

      {/* Documents list */}
      <section className="border rounded-lg p-4">
        <h2 className="font-medium mb-3">Documents</h2>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-gray-500">No documents yet. Upload one above.</p>
        ) : (
          <ul className="space-y-3">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 border rounded p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{doc.filename}</p>
                  <p className="text-xs text-gray-500">
                    ID: {doc.id} • Uploaded: {new Date(doc.uploaded_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    className="rounded border px-3 py-2 text-sm"
                    href={`/documents/${doc.id}`}
                  >
                    Open Q&amp;A
                  </a>
                  <button
                    className="rounded border px-3 py-2 text-sm"
                    onClick={() => handleDelete(doc.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}