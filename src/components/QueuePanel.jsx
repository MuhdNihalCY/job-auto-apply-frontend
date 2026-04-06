import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import toast from "react-hot-toast";
import Tooltip from "./Tooltip.jsx";

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function toLocalTimeValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function Section({ title, count, actions, children, emptyText }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {title} {count > 0 && <span className="font-bold text-gray-700">{count}</span>}
        </span>
        {actions && <div className="flex gap-1">{actions}</div>}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {count === 0 ? (
          <p className="px-3 py-2.5 text-xs text-gray-400 italic">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-gray-50">{children}</ul>
        )}
      </div>
    </div>
  );
}

export default function QueuePanel({ refreshKey, onRefresh }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // item id being acted on
  const [editingTime, setEditingTime] = useState(null); // item id in time-edit mode
  const [editTimeVal, setEditTimeVal] = useState("");

  async function load() {
    setLoading(true);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [{ data: active }, { data: sent }] = await Promise.all([
      supabase
        .from("send_queue")
        .select("id, scheduled_at, sent_at, status, error_message, job_applications(id, company_name, role, apply_email)")
        .in("status", ["queued", "failed"])
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("send_queue")
        .select("id, scheduled_at, sent_at, status, error_message, job_applications(id, company_name, role, apply_email)")
        .eq("status", "sent")
        .gte("scheduled_at", todayStart.toISOString())
        .order("sent_at", { ascending: false }),
    ]);

    setItems([...(active ?? []), ...(sent ?? [])]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [refreshKey]);

  const failed = items.filter((i) => i.status === "failed");
  const queued = items.filter((i) => i.status === "queued");
  const sent   = items.filter((i) => i.status === "sent");

  // ── Actions ──────────────────────────────────────────────────────────────

  async function retryNow(item) {
    const jobId = item.job_applications?.id;
    if (!jobId) return;
    setBusy(item.id);
    try {
      const nowPlus2 = new Date(Date.now() + 2 * 60 * 1000).toISOString();
      await supabase.from("send_queue").delete().eq("id", item.id);
      const { data: newRow } = await supabase
        .from("send_queue")
        .insert({ job_id: jobId, scheduled_at: nowPlus2, status: "queued" })
        .select("id, scheduled_at, sent_at, status, error_message, job_applications(id, company_name, role, apply_email)")
        .single();
      await supabase.from("job_applications").update({ send_status: "Queued" }).eq("id", jobId);
      setItems((prev) => prev.filter((i) => i.id !== item.id).concat(newRow ? [newRow] : []));
      toast.success("Rescheduled — sends in ~2 min");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function forceSend(item) {
    setBusy(item.id);
    try {
      const now = new Date().toISOString();
      await supabase.from("send_queue").update({ scheduled_at: now }).eq("id", item.id);
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, scheduled_at: now } : i));
      toast.success("Moved to now — sends within 5 min");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function revert(item) {
    const jobId = item.job_applications?.id;
    if (!jobId) return;
    setBusy(item.id);
    try {
      await supabase.from("send_queue").delete().eq("id", item.id);
      await supabase.from("job_applications").update({ send_status: "Pending" }).eq("id", jobId);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success("Reverted to Pending");
      onRefresh?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function saveEditTime(item) {
    if (!editTimeVal) return;
    const base = new Date(item.scheduled_at);
    const [h, m] = editTimeVal.split(":").map(Number);
    base.setHours(h, m, 0, 0);
    const newISO = base.toISOString();
    setBusy(item.id);
    try {
      await supabase.from("send_queue").update({ scheduled_at: newISO }).eq("id", item.id);
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, scheduled_at: newISO } : i));
      toast.success("Schedule updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
      setEditingTime(null);
    }
  }

  // ── Bulk Actions ─────────────────────────────────────────────────────────

  async function revertAll(group) {
    const ids = group.map((i) => i.id);
    const jobIds = group.map((i) => i.job_applications?.id).filter(Boolean);
    if (!ids.length) return;
    if (!confirm(`Revert ${ids.length} item(s) to Pending?`)) return;
    try {
      await supabase.from("send_queue").delete().in("id", ids);
      await supabase.from("job_applications").update({ send_status: "Pending" }).in("id", jobIds);
      setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
      toast.success(`${ids.length} item(s) reverted to Pending`);
      onRefresh?.();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function forceAll(group) {
    const ids = group.map((i) => i.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    try {
      await supabase.from("send_queue").update({ scheduled_at: now }).in("id", ids);
      setItems((prev) => prev.map((i) => ids.includes(i.id) ? { ...i, scheduled_at: now } : i));
      toast.success(`${ids.length} email(s) moved to now`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="text-xs text-gray-400 text-center py-4">Loading queue…</div>;
  }

  const isBusy = (id) => busy === id;

  return (
    <div>
      {/* FAILED */}
      <Section
        title="Failed"
        count={failed.length}
        emptyText="No failures"
        actions={
          failed.length > 0 && (
            <Tooltip text="Remove all failed items from queue and reset them to Pending">
              <button
                onClick={() => revertAll(failed)}
                className="text-[11px] px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-500"
              >
                ↩ Revert All
              </button>
            </Tooltip>
          )
        }
      >
        {failed.map((item) => {
          const job = item.job_applications;
          return (
            <li key={item.id} className="px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate leading-tight">
                    {job?.company_name} — {job?.role}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{job?.apply_email}</p>
                  {item.error_message && (
                    <p className="text-xs text-red-500 mt-0.5 leading-snug line-clamp-2" title={item.error_message}>
                      {item.error_message}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0 mt-0.5">
                  <Tooltip text="Reschedule and retry — sends in ~2 minutes">
                    <button
                      onClick={() => retryNow(item)}
                      disabled={isBusy(item.id)}
                      className="text-xs px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50 whitespace-nowrap"
                    >
                      {isBusy(item.id) ? "…" : "⚡ Retry"}
                    </button>
                  </Tooltip>
                  <Tooltip text="Remove from queue and reset job to Pending">
                    <button
                      onClick={() => revert(item)}
                      disabled={isBusy(item.id)}
                      className="text-xs px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-500 disabled:opacity-50"
                    >
                      ↩
                    </button>
                  </Tooltip>
                </div>
              </div>
            </li>
          );
        })}
      </Section>

      {/* QUEUED */}
      <Section
        title="Queued"
        count={queued.length}
        emptyText="No queued emails"
        actions={
          queued.length > 0 && (
            <>
              <Tooltip text="Move all queued emails to send immediately (within 5 min)">
                <button
                  onClick={() => forceAll(queued)}
                  className="text-[11px] px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-50 text-blue-600"
                >
                  ⚡ All
                </button>
              </Tooltip>
              <Tooltip text="Remove all queued emails and reset jobs to Pending">
                <button
                  onClick={() => revertAll(queued)}
                  className="text-[11px] px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-500"
                >
                  ↩ All
                </button>
              </Tooltip>
            </>
          )
        }
      >
        {queued.map((item) => {
          const job = item.job_applications;
          const isEditing = editingTime === item.id;
          return (
            <li key={item.id} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate leading-tight">
                    {job?.company_name} — {job?.role}
                  </p>
                  {isEditing ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="time"
                        value={editTimeVal}
                        onChange={(e) => setEditTimeVal(e.target.value)}
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <Tooltip text="Confirm new send time">
                        <button
                          onClick={() => saveEditTime(item)}
                          disabled={isBusy(item.id)}
                          className="text-xs px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isBusy(item.id) ? "…" : "Save"}
                        </button>
                      </Tooltip>
                      <Tooltip text="Cancel editing">
                        <button
                          onClick={() => setEditingTime(null)}
                          className="text-xs px-1.5 py-0.5 rounded border border-gray-200 text-gray-400 hover:bg-gray-50"
                        >
                          ✕
                        </button>
                      </Tooltip>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">@ {formatTime(item.scheduled_at)} IST</p>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Tooltip text="Move to now — sends within 5 minutes">
                      <button
                        onClick={() => forceSend(item)}
                        disabled={isBusy(item.id)}
                        className="text-xs px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        {isBusy(item.id) ? "…" : "⚡"}
                      </button>
                    </Tooltip>
                    <Tooltip text="Edit the scheduled send time">
                      <button
                        onClick={() => {
                          setEditTimeVal(toLocalTimeValue(item.scheduled_at));
                          setEditingTime(item.id);
                        }}
                        className="text-xs px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-500"
                      >
                        ✎
                      </button>
                    </Tooltip>
                    <Tooltip text="Remove from queue and reset job to Pending">
                      <button
                        onClick={() => revert(item)}
                        disabled={isBusy(item.id)}
                        className="text-xs px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-500 disabled:opacity-50"
                      >
                        ↩
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </Section>

      {/* SENT TODAY */}
      <Section
        title="Sent Today"
        count={sent.length}
        emptyText="No emails sent today"
      >
        {sent.map((item) => {
          const job = item.job_applications;
          return (
            <li key={item.id} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate leading-tight">
                    {job?.company_name} — {job?.role}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{job?.apply_email}</p>
                </div>
                <span className="text-xs text-green-600 flex-shrink-0">
                  ✓ {formatTime(item.sent_at)}
                </span>
              </div>
            </li>
          );
        })}
      </Section>
    </div>
  );
}
