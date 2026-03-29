import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import toast from "react-hot-toast";

export default function ResumeUpload() {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "resume_url")
      .single()
      .then(({ data }) => {
        if (data?.value) setUrl(data.value);
      });
  }, []);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "resume_url", value: url.trim() });
    setSaving(false);
    if (error) toast.error("Save failed: " + error.message);
    else toast.success("Resume URL saved!");
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-800">Resume PDF</h3>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Public resume URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yoursite.com/resume.pdf"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          The backend fetches this URL fresh on every email send — update your site and it's automatically picked up.
        </p>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-blue-600 hover:underline"
        >
          Preview PDF ↗
        </a>
      )}
      <button
        onClick={save}
        disabled={saving || !url.trim()}
        className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Resume URL"}
      </button>
    </div>
  );
}
