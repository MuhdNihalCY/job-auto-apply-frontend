import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

const STATS = [
  { label: "Total", key: "total", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { label: "Sent", key: "sent", color: "bg-green-50 border-green-200 text-green-700" },
  { label: "Queued / Pending", key: "pending", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  { label: "Failed", key: "failed", color: "bg-red-50 border-red-200 text-red-700" },
];

export default function StatsBar({ refreshKey }) {
  const [counts, setCounts] = useState({ total: 0, sent: 0, pending: 0, failed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      const { data } = await supabase
        .from("job_applications")
        .select("send_status");

      if (data) {
        const total = data.length;
        const sent = data.filter((r) => r.send_status === "Sent").length;
        const pending = data.filter((r) =>
          ["Pending", "Queued"].includes(r.send_status)
        ).length;
        const failed = data.filter((r) => r.send_status === "Failed").length;
        setCounts({ total, sent, pending, failed });
      }
      setLoading(false);
    }
    loadStats();
  }, [refreshKey]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {STATS.map(({ label, key, color }) => (
        <div
          key={key}
          className={`rounded-xl border p-4 flex flex-col items-center justify-center ${color}`}
        >
          <span className="text-3xl font-bold">
            {loading ? "—" : counts[key]}
          </span>
          <span className="text-sm font-medium mt-1">{label}</span>
        </div>
      ))}
    </div>
  );
}
