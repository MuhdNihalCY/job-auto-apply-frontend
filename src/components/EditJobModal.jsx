import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import toast from "react-hot-toast";
import { Modal, JobForm } from "./AddJobModal.jsx";

export default function EditJobModal({ job, onClose, onSaved }) {
  const [form, setForm] = useState({
    company_name: job.company_name ?? "",
    role: job.role ?? "",
    apply_email: job.apply_email ?? "",
    career_url: job.career_url ?? "",
    job_description: job.job_description ?? "",
    key_skills: job.key_skills ?? "",
    exp_required: job.exp_required ?? "",
    personalized_email: job.personalized_email ?? "",
    custom_subject: job.custom_subject ?? "",
    send_status: job.send_status ?? "Pending",
  });
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.company_name.trim() || !form.role.trim()) {
      toast.error("Company Name and Role are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("job_applications")
      .update({
        company_name: form.company_name.trim(),
        role: form.role.trim(),
        apply_email: form.apply_email.trim() || null,
        career_url: form.career_url.trim() || null,
        job_description: form.job_description.trim() || null,
        key_skills: form.key_skills.trim() || null,
        exp_required: form.exp_required.trim() || null,
        personalized_email: form.personalized_email.trim() || null,
        custom_subject: form.custom_subject.trim() || null,
        send_status: form.send_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Saved!");
      onSaved();
      onClose();
    }
  }

  return (
    <Modal title={`Edit — ${job.company_name}`} onClose={onClose}>
      <JobForm form={form} set={set} editMode />
      {/* Status dropdown extended for edit mode */}
      <div className="mt-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">Custom Subject (optional)</label>
        <input
          type="text"
          value={form.custom_subject}
          onChange={(e) => set("custom_subject", e.target.value)}
          placeholder="Leave blank to use auto-generated subject"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mt-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">Send Status (override)</label>
        <select
          value={form.send_status}
          onChange={(e) => set("send_status", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {["Pending", "Queued", "Sent", "Failed", "Skip", "Replied", "Interview", "Offer", "Rejected"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </Modal>
  );
}
