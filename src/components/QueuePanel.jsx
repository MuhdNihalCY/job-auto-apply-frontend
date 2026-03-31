import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import toast from "react-hot-toast";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const statusStyle = {
  queued: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export default function QueuePanel({ refreshKey, onRefresh }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(null);

  async function retry(jobId) {
    setRetrying(jobId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/retry/${jobId}`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast.success("Job reset to Pending — will be scheduled on next Run Now");
      onRefresh?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRetrying(null);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("send_queue")
        .select(`
          id, scheduled_at, sent_at, status, error_message,
          job_applications ( company_name, role, apply_email )
        `)
        .gte("scheduled_at", today.toISOString())
        .order("scheduled_at", { ascending: true });

      setItems(data ?? []);
      setLoading(false);
    }
    load();
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 text-sm text-gray-500">
        Loading today's queue…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 text-sm text-gray-500">
        No emails scheduled for today. Click <strong>Schedule & Send Now</strong> to queue emails.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-6">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800 text-sm">Today's Send Queue</h2>
      </div>
      <ul className="divide-y divide-gray-50">
        {items.map((item) => {
          const job = item.job_applications;
          return (
            <li key={item.id} className="px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {job?.company_name} — {job?.role}
                </p>
                <p className="text-xs text-gray-500 truncate">{job?.apply_email}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-gray-500">
                  {item.status === "sent"
                    ? `Sent at ${formatTime(item.sent_at)}`
                    : `Scheduled ${formatTime(item.scheduled_at)} IST`}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    statusStyle[item.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {item.status}
                </span>
                {item.status === "failed" && (
                  <button
                    onClick={() => retry(item.job_applications?.id)}
                    disabled={retrying === item.job_applications?.id}
                    className="text-xs px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-500 disabled:opacity-50"
                  >
                    {retrying === item.job_applications?.id ? "…" : "Retry"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
