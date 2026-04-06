import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import toast from "react-hot-toast";
import { Modal, Field } from "./AddJobModal.jsx";

const DEFAULT_TEMPLATE = `Dear Hiring Team,

I came across the {role} opening at {company} and would like to express my strong interest in this position.

I am a full-stack developer with hands-on experience in {skills}. Over the past {exp}, I have built and maintained scalable web applications — from designing RESTful APIs and database schemas on the backend to crafting responsive, user-friendly interfaces on the frontend.

My core stack includes MongoDB, Express.js, React, and Node.js (MERN), and I am comfortable working across the full development lifecycle — requirements, architecture, implementation, testing, and deployment.

I am confident my background aligns well with what {company} is looking for, and I am excited about the opportunity to contribute to your team.

Please find my resume attached. I would love to connect and discuss further.

Thank you for your time and consideration.

Best regards,
{name}`;

export default function EditJobModal({ job, onClose, onSaved }) {
  const [form, setForm] = useState({
    company_name: job.company_name ?? "",
    role: job.role ?? "",
    apply_email: job.apply_email ?? "",
    career_url: job.career_url ?? "",
    job_description: job.job_description ?? "",
    key_skills: job.key_skills ?? "",
    exp_required: job.exp_required ?? "",
    custom_subject: job.custom_subject ?? "",
    personalized_email: job.personalized_email ?? "",
    send_status: job.send_status ?? "Pending",
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function generateEmail() {
    setGenerating(true);
    try {
      const [{ data: tplRow }, { data: nameRow }] = await Promise.all([
        supabase.from("app_settings").select("value").eq("key", "email_template").single(),
        supabase.from("app_settings").select("value").eq("key", "from_name").single(),
      ]);

      const template = tplRow?.value || DEFAULT_TEMPLATE;
      const name = nameRow?.value || "Nihal";

      const body = template
        .replace(/\{company\}/g, form.company_name || "{company}")
        .replace(/\{role\}/g, form.role || "{role}")
        .replace(/\{skills\}/g, form.key_skills || "{skills}")
        .replace(/\{exp\}/g, form.exp_required || "my experience")
        .replace(/\{name\}/g, name);

      set("personalized_email", body);
      toast.success("Email body generated from template");
    } catch (err) {
      toast.error("Failed to load template: " + err.message);
    } finally {
      setGenerating(false);
    }
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
        custom_subject: form.custom_subject.trim() || null,
        personalized_email: form.personalized_email.trim() || null,
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
      <div className="space-y-5">
        {/* Section 1: Job Details */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Job Details</p>
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
              <Field label="Key Skills" value={form.key_skills} onChange={(v) => set("key_skills", v)} hint="e.g. React, Node.js, MongoDB" />
              <Field label="Experience Required" value={form.exp_required} onChange={(v) => set("exp_required", v)} hint="e.g. 1-3 years" />
            </div>
            <Field
              label="Job Description / Notes"
              value={form.job_description}
              onChange={(v) => set("job_description", v)}
              multiline
              rows={2}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Custom Subject (optional)"
                value={form.custom_subject}
                onChange={(v) => set("custom_subject", v)}
                hint="Leave blank for auto-generated subject"
              />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Send Status</label>
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
            </div>
          </div>
        </section>

        {/* Section 2: Email Body */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Email Body</p>
            <button
              type="button"
              onClick={generateEmail}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {generating ? "Generating…" : "✦ Generate from Template"}
            </button>
          </div>
          <textarea
            value={form.personalized_email}
            onChange={(e) => set("personalized_email", e.target.value)}
            rows={10}
            placeholder="Click 'Generate from Template' to auto-fill, or write your email body here…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">Leave blank and set status to Skip if not ready to send.</p>
        </section>
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
          className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </Modal>
  );
}
