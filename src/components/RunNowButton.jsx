import { useState } from "react";
import toast from "react-hot-toast";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function RunNowButton({ onRefresh }) {
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!BACKEND_URL) {
      toast.error("VITE_BACKEND_URL is not set in .env");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/run-now`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Request failed");

      if (data.scheduled === 0) {
        toast("No pending jobs to schedule. Add jobs with an email and personalized body.", {
          icon: "ℹ️",
        });
      } else if (data.alreadyScheduled) {
        toast(`Queue already set for today (${data.count} emails pending).`, { icon: "ℹ️" });
      } else {
        toast.success(`Scheduled ${data.scheduled} email(s)! First send in ≤5 min.`);
      }
      onRefresh();
    } catch (err) {
      toast.error("Error: " + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={run}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Scheduling…
        </>
      ) : (
        <>
          <span>⚡</span>
          Schedule &amp; Send Now
        </>
      )}
    </button>
  );
}
