import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";
import toast from "react-hot-toast";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function SyncNowButton({ onRefresh, compact = false }) {
  const [loading, setLoading] = useState(false);
  const [sheetsEnabled, setSheetsEnabled] = useState(true);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "sheets_enabled")
      .single()
      .then(({ data }) => {
        if (data) setSheetsEnabled(data.value !== "false");
      });
  }, []);

  async function sync() {
    if (!BACKEND_URL) {
      toast.error("VITE_BACKEND_URL is not set in .env");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/sync-now`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      toast.success(
        `Sync complete — ${data.inserted ?? 0} inserted, ${data.updated ?? 0} updated`
      );
      onRefresh();
    } catch (err) {
      toast.error("Sync failed: " + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  }

  if (!sheetsEnabled) {
    return (
      <button
        disabled
        title="Sheets sync is disabled — enable it in Settings → Sync"
        className={`flex-shrink-0 flex items-center gap-1.5 bg-gray-50 opacity-40 cursor-not-allowed text-gray-400 font-medium rounded-lg border border-gray-200 ${
          compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
        }`}
      >
        <span>🔄</span>
        {compact ? "Sync" : "Sync from Sheets"}
      </button>
    );
  }

  return (
    <button
      onClick={sync}
      disabled={loading}
      className={`flex-shrink-0 flex items-center gap-1.5 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-700 font-medium rounded-lg border border-gray-200 transition-colors ${
        compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
      }`}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Syncing…
        </>
      ) : (
        <>
          <span>🔄</span>
          {compact ? "Sync" : "Sync from Sheets"}
        </>
      )}
    </button>
  );
}
