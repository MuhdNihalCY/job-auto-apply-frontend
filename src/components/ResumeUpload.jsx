import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import toast from "react-hot-toast";

export default function ResumeUpload() {
  const [url, setUrl] = useState("");
  const [filename, setFilename] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["resume_url", "resume_filename"])
      .then(({ data }) => {
        for (const row of data ?? []) {
          if (row.key === "resume_url") setUrl(row.value ?? "");
          if (row.key === "resume_filename") setFilename(row.value ?? "");
        }
      });
  }, []);

  // Strip any extension the user may have typed — format is locked on the backend
  function sanitizeFilename(raw) {
    return raw.replace(/\.[^.]+$/, "").replace(/[/\\:*?"<>|]/g, "");
  }

  async function save() {
    setSaving(true);
    const upserts = [{ key: "resume_url", value: url.trim() }];
    const cleanName = sanitizeFilename(filename);
    upserts.push({ key: "resume_filename", value: cleanName });

    const { error } = await supabase.from("app_settings").upsert(upserts);
    setSaving(false);
    if (error) toast.error("Save failed: " + error.message);
    else {
      setFilename(cleanName);
      toast.success("Resume settings saved!");
    }
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

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Attachment filename <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="e.g. Nihal_Sharma_Resume"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-400 whitespace-nowrap">.pdf</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Name shown to the recruiter. Extension is locked to the original file format. Leave blank to use the file's original name.
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
        {saving ? "Saving…" : "Save Resume Settings"}
      </button>
    </div>
  );
}
