import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase.js";
import toast from "react-hot-toast";
import Tooltip from "./Tooltip.jsx";

const statusBadge = {
  Pending:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  Queued:    "bg-blue-100 text-blue-700 border-blue-200",
  Sent:      "bg-green-100 text-green-700 border-green-200",
  Failed:    "bg-red-100 text-red-700 border-red-200",
  Skip:      "bg-gray-100 text-gray-400 border-gray-200",
  Replied:   "bg-purple-100 text-purple-700 border-purple-200",
  Interview: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Offer:     "bg-emerald-100 text-emerald-700 border-emerald-200",
  Rejected:  "bg-rose-100 text-rose-700 border-rose-200",
};

const STATUS_LIST = ["All", "Pending", "Queued", "Sent", "Failed", "Skip", "Replied", "Interview", "Offer", "Rejected"];

function highlight(text, term) {
  if (!term || !text) return text || "—";
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded-sm px-0">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  );
}

export default function JobTable({ refreshKey, onEdit, onRefresh }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showDupes, setShowDupes] = useState(false);
  const [skipping, setSkipping] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("job_applications")
        .select("id,company_name,role,apply_email,send_status,date_applied,key_skills,personalized_email")
        .order("id", { ascending: true });
      if (error) toast.error("Failed to load jobs");
      setJobs(data ?? []);
      setLoading(false);
    }
    load();
  }, [refreshKey]);

  // Detect duplicates by apply_email (same email on 2+ rows)
  const dupeEmails = useMemo(() => {
    const counts = {};
    for (const j of jobs) {
      if (j.apply_email) counts[j.apply_email] = (counts[j.apply_email] || 0) + 1;
    }
    return new Set(Object.keys(counts).filter((e) => counts[e] > 1));
  }, [jobs]);

  const dupeCount = useMemo(
    () => jobs.filter((j) => dupeEmails.has(j.apply_email)).length,
    [jobs, dupeEmails]
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return jobs.filter((j) => {
      if (showDupes && !dupeEmails.has(j.apply_email)) return false;
      if (filterStatus !== "All" && j.send_status !== filterStatus) return false;
      if (!term) return true;
      return (
        j.company_name?.toLowerCase().includes(term) ||
        j.role?.toLowerCase().includes(term) ||
        j.apply_email?.toLowerCase().includes(term) ||
        j.key_skills?.toLowerCase().includes(term)
      );
    });
  }, [jobs, search, filterStatus, showDupes, dupeEmails]);

  async function quickSkip(job) {
    const newStatus = job.send_status === "Skip" ? "Pending" : "Skip";
    setSkipping(job.id);
    const { error } = await supabase
      .from("job_applications")
      .update({ send_status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", job.id);
    setSkipping(null);
    if (error) {
      toast.error("Failed to update status");
    } else {
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, send_status: newStatus } : j));
    }
  }

  async function deleteJob(id) {
    if (!confirm("Delete this application?")) return;
    const { error } = await supabase.from("job_applications").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Deleted"); onRefresh(); }
  }

  const term = search.trim();

  return (
    <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex-shrink-0 px-3 py-2.5 border-b border-gray-100 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search company, role, email, skills…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <Tooltip text="Clear search">
              <button
                onClick={() => setSearch("")}
                className="px-2 text-gray-400 hover:text-gray-600 text-sm"
              >✕</button>
            </Tooltip>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {STATUS_LIST.map((s) => {
            const count = s === "All" ? jobs.length : jobs.filter((j) => j.send_status === s).length;
            return (
              <button
                key={s}
                onClick={() => { setFilterStatus(s); setShowDupes(false); }}
                className={`flex-shrink-0 text-xs px-2.5 py-0.5 rounded-full border font-medium transition-colors ${
                  filterStatus === s && !showDupes
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {s} {count > 0 && <span className="opacity-60">{count}</span>}
              </button>
            );
          })}
          {dupeCount > 0 && (
            <Tooltip text={`${dupeCount} jobs share the same email address — click to filter and review`}>
              <button
                onClick={() => { setShowDupes((v) => !v); setFilterStatus("All"); }}
                className={`flex-shrink-0 text-xs px-2.5 py-0.5 rounded-full border font-medium transition-colors ${
                  showDupes
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
                }`}
              >
                ⚠ Dupes {dupeCount}
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Table — desktop */}
      <div className="hidden sm:flex flex-col flex-1 overflow-auto min-h-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide sticky top-0 bg-white z-10">
              <th className="px-3 py-2 text-left w-8">#</th>
              <th className="px-3 py-2 text-left">Company / Role</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left w-20">Status</th>
              <th className="px-3 py-2 text-left w-24">Date</th>
              <th className="px-3 py-2 text-left w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-400">No jobs found.</td></tr>
            ) : (
              filtered.map((job, i) => {
                const isDupe = dupeEmails.has(job.apply_email);
                const isSkipped = job.send_status === "Skip";
                return (
                  <tr
                    key={job.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isSkipped ? "opacity-50" : ""} ${isDupe ? "bg-orange-50/40" : ""}`}
                  >
                    <td className="px-3 py-1.5 text-xs text-gray-300 tabular-nums">{i + 1}</td>
                    <td className="px-3 py-1.5 max-w-[220px]">
                      <div className="flex items-center gap-1.5">
                        {isDupe && <span title="Duplicate email" className="text-orange-400 text-xs">⚠</span>}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate leading-tight">
                            {highlight(job.company_name, term)}
                          </p>
                          <p className="text-xs text-gray-400 truncate leading-tight">
                            {highlight(job.role, term)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 max-w-[200px]">
                      <span className="text-xs text-gray-500 truncate block">
                        {highlight(job.apply_email, term) || <span className="italic text-gray-300">—</span>}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${statusBadge[job.send_status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                        {job.send_status || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-xs text-gray-400 tabular-nums">
                      {job.date_applied || "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1">
                        <Tooltip text="Edit job details, email body, and status">
                          <button
                            onClick={() => onEdit(job)}
                            className="text-xs px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-100 text-gray-600"
                          >
                            Edit
                          </button>
                        </Tooltip>
                        <Tooltip text={isSkipped ? "Restore to Pending — include in next schedule" : "Temporarily skip — won't be scheduled"}>
                          <button
                            onClick={() => quickSkip(job)}
                            disabled={skipping === job.id}
                            className={`text-xs px-2 py-0.5 rounded border font-medium transition-colors ${
                              isSkipped
                                ? "border-yellow-200 text-yellow-600 hover:bg-yellow-50"
                                : "border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-orange-500 hover:border-orange-200"
                            }`}
                          >
                            {skipping === job.id ? "…" : isSkipped ? "↩" : "Skip"}
                          </button>
                        </Tooltip>
                        <Tooltip text="Permanently delete this job application">
                          <button
                            onClick={() => deleteJob(job.id)}
                            className="text-xs px-2 py-0.5 rounded border border-transparent hover:border-red-100 hover:bg-red-50 text-gray-300 hover:text-red-400"
                          >
                            ✕
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: compact cards */}
      <div className="sm:hidden flex-1 overflow-y-auto divide-y divide-gray-50">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No jobs found.</div>
        ) : (
          filtered.map((job) => {
            const isDupe = dupeEmails.has(job.apply_email);
            const isSkipped = job.send_status === "Skip";
            return (
              <div
                key={job.id}
                className={`px-3 py-2 ${isSkipped ? "opacity-50" : ""} ${isDupe ? "bg-orange-50/50" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      {isDupe && <span className="text-orange-400 text-xs">⚠</span>}
                      <p className="text-sm font-medium text-gray-800 truncate">{highlight(job.company_name, term)}</p>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{highlight(job.role, term)}</p>
                    {job.apply_email && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{highlight(job.apply_email, term)}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${statusBadge[job.send_status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                      {job.send_status || "—"}
                    </span>
                    <div className="flex gap-1">
                      <Tooltip text="Edit job details and email body" position="bottom">
                        <button onClick={() => onEdit(job)} className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-600">Edit</button>
                      </Tooltip>
                      <Tooltip text={isSkipped ? "Restore to Pending" : "Skip — won't be scheduled"} position="bottom">
                        <button
                          onClick={() => quickSkip(job)}
                          disabled={skipping === job.id}
                          className={`text-xs px-2 py-0.5 rounded border ${isSkipped ? "border-yellow-200 text-yellow-600" : "border-gray-200 text-gray-400"}`}
                        >
                          {skipping === job.id ? "…" : isSkipped ? "↩" : "Skip"}
                        </button>
                      </Tooltip>
                      <Tooltip text="Delete this job application" position="bottom">
                        <button onClick={() => deleteJob(job.id)} className="text-xs px-2 py-0.5 rounded border border-transparent text-gray-300 hover:text-red-400">✕</button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {!loading && (
        <div className="flex-shrink-0 px-3 py-1.5 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {filtered.length} of {jobs.length} jobs
            {showDupes && <span className="text-orange-500 ml-1">· duplicates only</span>}
          </p>
          {showDupes && (
            <Tooltip text="Set all duplicate-email jobs to Skip so they won't be scheduled">
            <button
              onClick={async () => {
                const dupesToSkip = filtered.filter(
                  (j) => j.send_status !== "Skip" && j.send_status !== "Sent"
                );
                if (!dupesToSkip.length) { toast("All dupes already skipped"); return; }
                if (!confirm(`Skip all ${dupesToSkip.length} duplicate entries?`)) return;
                const ids = dupesToSkip.map((j) => j.id);
                const { error } = await supabase
                  .from("job_applications")
                  .update({ send_status: "Skip", updated_at: new Date().toISOString() })
                  .in("id", ids);
                if (error) toast.error("Failed");
                else {
                  toast.success(`Skipped ${ids.length} duplicates`);
                  setJobs((prev) => prev.map((j) => ids.includes(j.id) ? { ...j, send_status: "Skip" } : j));
                }
              }}
              className="text-xs px-2.5 py-1 rounded bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 font-medium"
            >
              Skip All Dupes
            </button>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}
