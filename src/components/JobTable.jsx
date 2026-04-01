import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import toast from "react-hot-toast";

const statusBadge = {
  Pending:   "bg-yellow-100 text-yellow-700 border border-yellow-200",
  Queued:    "bg-blue-100 text-blue-700 border border-blue-200",
  Sent:      "bg-green-100 text-green-700 border border-green-200",
  Failed:    "bg-red-100 text-red-700 border border-red-200",
  Skip:      "bg-gray-100 text-gray-500 border border-gray-200",
  Replied:   "bg-purple-100 text-purple-700 border border-purple-200",
  Interview: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  Offer:     "bg-emerald-100 text-emerald-700 border border-emerald-200",
  Rejected:  "bg-rose-100 text-rose-700 border border-rose-200",
};

const statuses = ["All", "Pending", "Queued", "Sent", "Failed", "Skip", "Replied", "Interview", "Offer", "Rejected"];

export default function JobTable({ refreshKey, onEdit, onRefresh }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .order("id", { ascending: true });
      if (error) toast.error("Failed to load jobs");
      setJobs(data ?? []);
      setLoading(false);
    }
    load();
  }, [refreshKey]);

  async function deleteJob(id) {
    if (!confirm("Delete this application?")) return;
    const { error } = await supabase.from("job_applications").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Deleted"); onRefresh(); }
  }

  const filtered = jobs.filter((j) => {
    const matchStatus = filterStatus === "All" || j.send_status === filterStatus;
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      j.company_name?.toLowerCase().includes(term) ||
      j.role?.toLowerCase().includes(term) ||
      j.apply_email?.toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-gray-100 space-y-2">
        <input
          type="text"
          placeholder="Search company, role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex-shrink-0 text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                filterStatus === s
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: card list */}
      <div className="sm:hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No jobs found.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filtered.map((job) => (
              <li key={job.id} className="px-4 py-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{job.company_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{job.role}</p>
                  </div>
                  <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[job.send_status] ?? "bg-gray-100 text-gray-500"}`}>
                    {job.send_status || "—"}
                  </span>
                </div>
                {job.apply_email && (
                  <p className="text-xs text-gray-400 truncate">{job.apply_email}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{job.date_applied || "Not sent yet"}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(job)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteJob(job.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 text-red-500 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Company</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Apply Email</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Date Applied</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No jobs found.</td></tr>
            ) : (
              filtered.map((job, i) => (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{job.company_name}</td>
                  <td className="px-4 py-3 text-gray-600">{job.role}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{job.apply_email || <span className="italic">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[job.send_status] ?? "bg-gray-100 text-gray-500"}`}>
                      {job.send_status || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{job.date_applied || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => onEdit(job)} className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-600">Edit</button>
                      <button onClick={() => deleteJob(job.id)} className="text-xs px-2 py-1 rounded border border-red-100 hover:bg-red-50 text-red-500">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && (
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
          Showing {filtered.length} of {jobs.length} applications
        </div>
      )}
    </div>
  );
}
