import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import toast from "react-hot-toast";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function TestEmailModal({ onClose }) {
  const [jobs, setJobs] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Load jobs that have a personalized email body
    supabase
      .from("job_applications")
      .select("id, company_name, role, personalized_email")
      .not("personalized_email", "is", null)
      .neq("personalized_email", "")
      .order("id", { ascending: false })
      .then(({ data }) => {
        setJobs(data ?? []);
        if (data?.length) setSelectedId(String(data[0].id));
      });

    // Pre-fill test email from settings
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "from_email")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setTestEmail(data.value);
      });
  }, []);

  const selected = jobs.find((j) => String(j.id) === selectedId);

  async function send() {
    if (!selectedId || !testEmail.trim()) {
      toast.error("Select a job and enter a test email address");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: Number(selectedId), test_email: testEmail.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Send failed");
      toast.success(`Test email sent to ${testEmail}`);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full sm:max-w-lg sm:mx-4 sm:rounded-xl rounded-t-2xl shadow-xl max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Send Test Email</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Job selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Pick a job (use its email body)
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.company_name} — {j.role}
                </option>
              ))}
            </select>
          </div>

          {/* Preview */}
          {selected && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-gray-500">Subject</p>
              <p className="text-sm text-gray-800">
                [TEST] Application for {selected.role} at {selected.company_name}
              </p>
              <p className="text-xs font-medium text-gray-500 mt-2">Body preview</p>
              <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-sans line-clamp-6">
                {selected.personalized_email?.slice(0, 400)}
                {selected.personalized_email?.length > 400 ? "…" : ""}
              </pre>
            </div>
          )}

          {/* Test email input */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Send to (your test email)
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@gmail.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={send}
            disabled={sending || !selectedId || !testEmail.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send Test Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
