"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken, clearToken } from "@/lib/auth";
import { FileText, Trash2, MessageSquare, Plus, NotebookPen, LogOut } from "lucide-react";

type Workspace = {
  id: number;
  name: string;
  created_at: string;
  document_count?: number;
  chat_count?: number;
};

export default function WorkspacesPage() {
  const router = useRouter();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    loadWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadWorkspaces() {
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch("/api/workspaces");
      setWorkspaces(data.workspaces || []);
    } catch (err: any) {
      setError(err.message || "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = newWorkspaceName.trim();
    if (!trimmed) {
      setError("Workspace name is required");
      return;
    }

    setCreating(true);
    try {
      const data = await apiFetch("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: trimmed }),
      });

      if (!data.success) {
        throw new Error(data.error || "Failed to create workspace");
      }

      setNewWorkspaceName("");
      setShowCreateForm(false);
      await loadWorkspaces();
    } catch (err: any) {
      setError(err.message || "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(workspaceId: number) {
    if (!confirm("Are you sure you want to delete this workspace? All documents and chat history will be deleted.")) {
      return;
    }

    setError(null);
    try {
      await apiFetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
      });
      setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
    } catch (err: any) {
      setError(err.message || "Delete failed");
    }
  }

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <NotebookPen size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">workspaceAI</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full font-medium transition-all shadow-sm active:scale-95"
            disabled={creating}
          >
            <Plus size={18} />
            <span>New Workspace</span>
          </button>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500">Loading workspaces...</p>
          </div>
        ) : workspaces.length === 0 && !showCreateForm ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
              <FileText size={48} className="text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No workspaces yet</h2>
            <p className="text-slate-500 mb-8 max-w-md">
              Create a workspace to upload documents and start chatting with your personalized AI assistant.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-indigo-200"
            >
              Create your first workspace
            </button>
          </div>
        ) : (
          <div className="p-8 max-w-6xl mx-auto">
            {showCreateForm && (
              <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Create a new workspace</h2>
                <form onSubmit={handleCreate} className="flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Workspace name"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    autoFocus
                  />
                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={creating || !newWorkspaceName.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-all"
                    >
                      {creating ? "Creating..." : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewWorkspaceName("");
                        setError(null);
                      }}
                      className="border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {workspaces.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">Your Workspaces</h2>
                  <span className="text-sm text-slate-400 font-medium">{workspaces.length} total</span>
                </div>

                {error && !showCreateForm && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                  {workspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      onClick={() => router.push(`/workspaces/${workspace.id}`)}
                      className="group relative bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col h-48"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-800 mb-2 truncate group-hover:text-indigo-600 transition-colors">
                          {workspace.name}
                        </h3>
                        <p className="text-xs text-slate-400 mb-4">
                          Created {new Date(workspace.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-50 text-slate-400">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-xs">
                            <FileText size={14} />
                            <span>{workspace.document_count || 0} documents</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <MessageSquare size={14} />
                            <span>{workspace.chat_count || 0} chats</span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(workspace.id);
                          }}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          title="Delete Workspace"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}