import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import toast from "react-hot-toast";

const EMPTY = {
  company_name: "",
  role: "",
  apply_email: "",
  career_url: "",
  job_description: "",
  key_skills: "",
  exp_required: "",
  personalized_email: "",
  send_status: "Pending",
};

export default function AddJobModal({ onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
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
    const { error } = await supabase.from("job_applications").insert({
      company_name: form.company_name.trim(),
      role: form.role.trim(),
      apply_email: form.apply_email.trim() || null,
      career_url: form.career_url.trim() || null,
      job_description: form.job_description.trim() || null,
      key_skills: form.key_skills.trim() || null,
      exp_required: form.exp_required.trim() || null,
      personalized_email: form.personalized_email.trim() || null,
      send_status: form.send_status,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Job added!");
      onSaved();
      onClose();
    }
  }

  return (
    <Modal title="Add Job Application" onClose={onClose}>
      <JobForm form={form} set={set} />
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
          {saving ? "Saving…" : "Add Job"}
        </button>
      </div>
    </Modal>
  );
}

export function JobForm({ form, set }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Company Name *" value={form.company_name} onChange={(v) => set("company_name", v)} />
        <Field label="Role / Job Title *" value={form.role} onChange={(v) => set("role", v)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Apply Email" value={form.apply_email} onChange={(v) => set("apply_email", v)} type="email" />
        <Field label="Career Page / Job URL" value={form.career_url} onChange={(v) => set("career_url", v)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Key Skills" value={form.key_skills} onChange={(v) => set("key_skills", v)} />
        <Field label="Exp Required" value={form.exp_required} onChange={(v) => set("exp_required", v)} />
      </div>
      <Field
        label="Job Description Summary"
        value={form.job_description}
        onChange={(v) => set("job_description", v)}
        multiline
        rows={2}
      />
      <Field
        label="Personalized Email Body"
        value={form.personalized_email}
        onChange={(v) => set("personalized_email", v)}
        multiline
        rows={5}
        hint="This is the email body that will be sent. Leave blank if not ready — set status to Skip."
      />
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Send Status</label>
        <select
          value={form.send_status}
          onChange={(e) => set("send_status", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Pending">Pending</option>
          <option value="Skip">Skip</option>
        </select>
      </div>
    </div>
  );
}

export function Field({ label, value, onChange, type = "text", multiline = false, rows = 3, hint }) {
  const base =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className={base}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      )}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-2xl sm:mx-4 rounded-t-2xl shadow-2xl max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-light leading-none p-1"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
