// src/admin/pages/Sessions/SessionsPage.jsx
// Main admin sessions management page.
// Shows all SessionType cards with their packages.
// Admin can create/edit/delete session types and packages from here.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient.js";
import SessionCard from "../../components/SessionCard/SessionCard";
import { Plus } from "lucide-react";

import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";

export default function SessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Load all sessions + their packages ───────────────────────────────────
  async function loadSessions() {
    setLoading(true);
    setError("");
    try {
      // Load session types
      const { data: sessionTypes, error: stErr } = await supabase
        .from("SessionType")
        .select("*")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (stErr) throw stErr;

      // Load all packages in one query
      const { data: allPackages, error: pkgErr } = await supabase
        .from("Package")
        .select("*")
        .order("display_order", { ascending: true });

      if (pkgErr) throw pkgErr;

      // Group packages by session_type_id
      const pkgMap = {};
      (allPackages ?? []).forEach((pkg) => {
        if (!pkgMap[pkg.session_type_id]) pkgMap[pkg.session_type_id] = [];
        pkgMap[pkg.session_type_id].push(pkg);
      });

      // Attach packages to their session + inject edit/delete callbacks
      const enriched = (sessionTypes ?? []).map((st) => ({
        ...st,
        packages: (pkgMap[st.id] ?? []).map((pkg) => ({
          ...pkg,
          onEdit: () => navigate(`/admin/sessions/${st.id}/packages/${pkg.id}/edit`),
          onDelete: () => handleDeletePackage(pkg.id, st.id),
        })),
      }));

      setSessions(enriched);
    } catch (e) {
      setError(e.message || "Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  // ── Delete session type ───────────────────────────────────────────────────
  async function handleDeleteSession(sessionId) {
    if (!window.confirm(
      "Delete this session type? All packages linked to it will also be deleted."
    )) return;

    try {
      // Packages are deleted via ON DELETE CASCADE on Package.session_type_id
      const { error: delErr } = await supabase
        .from("SessionType")
        .delete()
        .eq("id", sessionId);
      if (delErr) throw delErr;
      loadSessions();
    } catch (e) {
      alert(`Failed to delete: ${e.message}`);
    }
  }

  // ── Delete package ────────────────────────────────────────────────────────
  async function handleDeletePackage(pkgId) {
    if (!window.confirm("Delete this package?")) return;
    try {
      const { error: delErr } = await supabase
        .from("Package")
        .delete()
        .eq("id", pkgId);
      if (delErr) throw delErr;
      loadSessions();
    } catch (e) {
      alert(`Failed to delete package: ${e.message}`);
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex min-w-50 overflow-y-auto">
        <Sidebar />
      </div>

      <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>
          <div className="max-w-full m-10 border-red-500">
            {/* Page header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-2xl font-semibold">Sessions & Packages</h1>
                <p className="mt-1 text-sm text-neutral-500">
                  Manage session types and the packages offered within each. Active sessions are shown to clients.
                </p>
              </div>
              <button
                onClick={() => navigate("/admin/offerings/new")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800 cursor-pointer"
              >
                <Plus size={15} />
                New Session Type
              </button>
            </div>

            {loading && <p className="text-sm text-neutral-500">Loading...</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            {!loading && !error && sessions.length === 0 && (
              <div className="text-center py-16 text-neutral-400">
                <p className="text-lg font-serif">No session types yet.</p>
                <p className="text-sm mt-2">Create your first session type to get started.</p>
              </div>
            )}

            {/* Session cards grid */}
            {!loading && sessions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {sessions.map((session) => (
                  <div key={session.id} className="flex flex-col gap-2">
                    <SessionCard
                      session={session}
                      adminMode={true}
                      onEdit={() => navigate(`/admin/offerings/${session.id}/edit`)}
                      onDelete={() => handleDeleteSession(session.id)}
                    />

                    {/* Add package button beneath the card */}
                    <button
                      onClick={() => navigate(`/admin/offerings/${session.id}/packages/new`)}
                      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-dashed border-neutral-300 text-xs text-neutral-400 hover:border-[#AB8C4B]/50 hover:text-[#AB8C4B] transition"
                    >
                      <Plus size={12} />
                      Add package to  {session.name}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Frame>
      </div>
    </div>
  );
}
