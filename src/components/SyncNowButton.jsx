import { useState } from "react";
import toast from "react-hot-toast";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function SyncNowButton({ onRefresh }) {
  const [loading, setLoading] = useState(false);

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

  return (
    <button
      onClick={sync}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Syncing…
        </>
      ) : (
        <>
          <span>🔄</span>
          Sync from Sheets
        </>
      )}
    </button>
  );
}
