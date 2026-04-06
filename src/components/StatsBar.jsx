import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import Tooltip from "./Tooltip.jsx";

export default function StatsBar({ refreshKey }) {
  const [counts, setCounts] = useState({ total: 0, sent: 0, pending: 0, failed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      const { data } = await supabase.from("job_applications").select("send_status");
      if (data) {
        setCounts({
          total:   data.length,
          sent:    data.filter((r) => r.send_status === "Sent").length,
          pending: data.filter((r) => ["Pending", "Queued"].includes(r.send_status)).length,
          failed:  data.filter((r) => r.send_status === "Failed").length,
        });
      }
      setLoading(false);
    }
    loadStats();
  }, [refreshKey]);

  const stats = [
    { label: "Total",   key: "total",   num: "text-gray-700",   tip: "All job applications in the database" },
    { label: "Sent",    key: "sent",    num: "text-green-600",  tip: "Emails successfully delivered" },
    { label: "Pending", key: "pending", num: "text-yellow-600", tip: "Jobs waiting to be scheduled or queued" },
    { label: "Failed",  key: "failed",  num: "text-red-500",    tip: "Emails that failed to send — check the queue for details" },
  ];

  return (
    <div className="flex items-center gap-0 bg-white border border-gray-200 rounded-xl mb-3 divide-x divide-gray-100 overflow-hidden">
      {stats.map(({ label, key, num, tip }) => (
        <Tooltip key={key} text={tip} position="bottom">
          <div className="flex-1 flex flex-col items-center py-2.5 px-1 cursor-default">
            <span className={`text-lg font-bold leading-none ${num}`}>
              {loading ? "—" : counts[key]}
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide font-medium">{label}</span>
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
