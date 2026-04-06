import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import toast from "react-hot-toast";

const PROVIDER_OPTIONS = [
  { value: "gmail", label: "Gmail (App Password)" },
  { value: "smtp", label: "Custom SMTP" },
  { value: "sendgrid", label: "SendGrid" },
  { value: "resend", label: "Resend" },
  { value: "brevo", label: "Brevo (Sendinblue)" },
];

// Secret keys are never fetched — only existence is checked
const SECRET_KEYS = ["smtp_pass", "sendgrid_api_key", "resend_api_key", "brevo_api_key"];

const ALL_SETTING_KEYS = [
  "daily_email_limit",
  "delay_min_minutes",
  "delay_max_minutes",
  "send_hour",
  "cc_self",
  "followup_enabled",
  "followup_after_days",
  "followup_template",
  "from_name",
  "from_email",
  "email_provider",
  "render_url",
  "smtp_host",
  "smtp_port",
  "smtp_secure",
  "smtp_user",
  "last_synced_at",
  "sheets_enabled",
  "email_template",
];

const DEFAULT_EMAIL_TEMPLATE = `Dear Hiring Team,

I came across the {role} opening at {company} and would like to express my strong interest in this position.

I am a full-stack developer with hands-on experience in {skills}. Over the past {exp}, I have built and maintained scalable web applications — from designing RESTful APIs and database schemas on the backend to crafting responsive, user-friendly interfaces on the frontend.

My core stack includes MongoDB, Express.js, React, and Node.js (MERN), and I am comfortable working across the full development lifecycle — requirements, architecture, implementation, testing, and deployment.

I am confident my background aligns well with what {company} is looking for, and I am excited about the opportunity to contribute to your team.

Please find my resume attached. I would love to connect and discuss further.

Thank you for your time and consideration.

Best regards,
{name}`;

export default function SettingsPanel() {
  const [settings, setSettings] = useState({});
  // tracks which secret keys are already saved in DB (never holds the actual value)
  const [savedSecrets, setSavedSecrets] = useState({});
  // holds new values the user is currently typing for secret fields
  const [pendingSecrets, setPendingSecrets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("provider");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: settingsData }, { data: secretsData }] = await Promise.all([
      supabase.from("app_settings").select("key, value").in("key", ALL_SETTING_KEYS),
      supabase.from("app_settings").select("key, value").in("key", SECRET_KEYS),
    ]);

    const map = {};
    for (const row of settingsData ?? []) map[row.key] = row.value;
    setSettings(map);

    const saved = {};
    for (const row of secretsData ?? []) saved[row.key] = !!row.value;
    setSavedSecrets(saved);

    setLoading(false);
  }

  function set(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function setSecret(key, value) {
    setPendingSecrets((s) => ({ ...s, [key]: value }));
  }

  async function save(keys) {
    setSaving(true);
    const regularKeys = keys.filter((k) => !SECRET_KEYS.includes(k));
    const secretKeys = keys.filter((k) => SECRET_KEYS.includes(k));

    const upserts = regularKeys.map((k) => ({ key: k, value: settings[k] ?? "" }));

    // Only save a secret if the user actually typed a new value
    for (const k of secretKeys) {
      if (pendingSecrets[k]) {
        upserts.push({ key: k, value: pendingSecrets[k] });
      }
    }

    const { error } = await supabase.from("app_settings").upsert(upserts);
    setSaving(false);
    if (error) {
      toast.error("Save failed: " + error.message);
    } else {
      toast.success("Settings saved!");
      // Mark saved secrets as saved and clear pending
      const newSaved = { ...savedSecrets };
      for (const k of secretKeys) {
        if (pendingSecrets[k]) newSaved[k] = true;
      }
      setSavedSecrets(newSaved);
      setPendingSecrets((p) => {
        const next = { ...p };
        for (const k of secretKeys) delete next[k];
        return next;
      });
    }
  }

  async function testConnection() {
    setTesting(true);
    try {
      await save(providerKeys(settings["email_provider"]));
      const provider = settings["email_provider"] || "gmail";
      const missing = [];
      if (provider === "gmail" || provider === "smtp") {
        if (!settings["smtp_user"]) missing.push("SMTP User");
        if (!savedSecrets["smtp_pass"] && !pendingSecrets["smtp_pass"]) missing.push("SMTP Password");
      } else if (provider === "sendgrid") {
        if (!savedSecrets["sendgrid_api_key"] && !pendingSecrets["sendgrid_api_key"]) missing.push("SendGrid API Key");
      } else if (provider === "resend") {
        if (!savedSecrets["resend_api_key"] && !pendingSecrets["resend_api_key"]) missing.push("Resend API Key");
      } else if (provider === "brevo") {
        if (!savedSecrets["brevo_api_key"] && !pendingSecrets["brevo_api_key"]) missing.push("Brevo API Key");
      }

      if (missing.length > 0) {
        toast.error(`Missing: ${missing.join(", ")}`);
      } else {
        toast.success(`${provider} settings look complete. They'll be validated on first send.`);
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setTesting(false);
    }
  }

  function providerKeys(provider) {
    const base = ["from_name", "from_email", "email_provider"];
    if (provider === "gmail" || provider === "smtp") {
      return [...base, "smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_pass"];
    } else if (provider === "sendgrid") {
      return [...base, "sendgrid_api_key"];
    } else if (provider === "resend") {
      return [...base, "resend_api_key"];
    } else if (provider === "brevo") {
      return [...base, "brevo_api_key"];
    }
    return base;
  }

  if (loading) {
    return <div className="p-4 text-sm text-gray-400">Loading settings…</div>;
  }

  const provider = settings["email_provider"] || "gmail";
  const tabs = [
    { key: "provider", label: "Email Provider" },
    { key: "rules", label: "Sending Rules" },
    { key: "template", label: "Email Template" },
    { key: "sync", label: "Sheets Sync" },
    { key: "server", label: "Server" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Tabs — scrollable on mobile */}
      <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {/* Email Provider Tab */}
        {activeTab === "provider" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Sfield
                label="From Name"
                value={settings["from_name"] ?? ""}
                onChange={(v) => set("from_name", v)}
              />
              <Sfield
                label="From Email"
                value={settings["from_email"] ?? ""}
                onChange={(v) => set("from_email", v)}
                type="email"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Email Provider
              </label>
              <select
                value={provider}
                onChange={(e) => set("email_provider", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PROVIDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {(provider === "gmail" || provider === "smtp") && (
              <>
                {provider === "smtp" && (
                  <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Sfield
                        label="SMTP Host"
                        value={settings["smtp_host"] ?? "smtp.gmail.com"}
                        onChange={(v) => set("smtp_host", v)}
                      />
                    </div>
                    <Sfield
                      label="SMTP Port"
                      value={settings["smtp_port"] ?? "587"}
                      onChange={(v) => set("smtp_port", v)}
                      type="number"
                    />
                  </div>
                )}
                {provider === "smtp" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="smtp_secure"
                      checked={settings["smtp_secure"] === "true"}
                      onChange={(e) =>
                        set("smtp_secure", e.target.checked ? "true" : "false")
                      }
                      className="rounded"
                    />
                    <label htmlFor="smtp_secure" className="text-sm text-gray-600">
                      Use TLS (secure port 465)
                    </label>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Sfield
                    label={provider === "gmail" ? "Gmail Address" : "SMTP Username"}
                    value={settings["smtp_user"] ?? ""}
                    onChange={(v) => set("smtp_user", v)}
                    type="email"
                  />
                  <SecretField
                    label={provider === "gmail" ? "App Password" : "SMTP Password"}
                    isSaved={savedSecrets["smtp_pass"]}
                    value={pendingSecrets["smtp_pass"] ?? ""}
                    onChange={(v) => setSecret("smtp_pass", v)}
                    hint={provider === "gmail" ? "16-char app password from Google Account → Security" : ""}
                  />
                </div>
              </>
            )}

            {provider === "sendgrid" && (
              <SecretField
                label="SendGrid API Key"
                isSaved={savedSecrets["sendgrid_api_key"]}
                value={pendingSecrets["sendgrid_api_key"] ?? ""}
                onChange={(v) => setSecret("sendgrid_api_key", v)}
                hint="Free tier: 100 emails/day"
              />
            )}

            {provider === "resend" && (
              <SecretField
                label="Resend API Key"
                isSaved={savedSecrets["resend_api_key"]}
                value={pendingSecrets["resend_api_key"] ?? ""}
                onChange={(v) => setSecret("resend_api_key", v)}
                hint="Free tier: 100 emails/day, 3000/month"
              />
            )}

            {provider === "brevo" && (
              <SecretField
                label="Brevo API Key"
                isSaved={savedSecrets["brevo_api_key"]}
                value={pendingSecrets["brevo_api_key"] ?? ""}
                onChange={(v) => setSecret("brevo_api_key", v)}
                hint="Free tier: 300 emails/day"
              />
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => save(providerKeys(provider))}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Provider Settings"}
              </button>
              <button
                onClick={testConnection}
                disabled={testing || saving}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-50"
              >
                {testing ? "Checking…" : "Test Connection"}
              </button>
            </div>
          </>
        )}

        {/* Sending Rules Tab */}
        {activeTab === "rules" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Sfield
                label="Send Hour (IST, 24h)"
                value={settings["send_hour"] ?? "10"}
                onChange={(v) => set("send_hour", v)}
                type="number"
                hint="Hour to send emails (0–23). Default: 10 = 10 AM"
              />
              <Sfield
                label="Daily Email Limit"
                value={settings["daily_email_limit"] ?? "5"}
                onChange={(v) => set("daily_email_limit", v)}
                type="number"
                hint="Max emails per day (1–20)"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Sfield
                label="Min Delay (minutes)"
                value={settings["delay_min_minutes"] ?? "7"}
                onChange={(v) => set("delay_min_minutes", v)}
                type="number"
                hint="Minimum gap between sends"
              />
              <Sfield
                label="Max Delay (minutes)"
                value={settings["delay_max_minutes"] ?? "12"}
                onChange={(v) => set("delay_max_minutes", v)}
                type="number"
                hint="Maximum gap between sends"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cc_self"
                checked={settings["cc_self"] !== "false"}
                onChange={(e) => set("cc_self", e.target.checked ? "true" : "false")}
                className="rounded"
              />
              <label htmlFor="cc_self" className="text-sm text-gray-600">
                CC myself on every sent email
              </label>
            </div>
            <button
              onClick={() => save(["daily_email_limit", "delay_min_minutes", "delay_max_minutes", "send_hour", "cc_self"])}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Rules"}
            </button>

            {/* Follow-up settings */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs font-semibold text-gray-700">Follow-up Emails</p>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="followup_enabled"
                  checked={settings["followup_enabled"] === "true"}
                  onChange={(e) => set("followup_enabled", e.target.checked ? "true" : "false")}
                  className="rounded"
                />
                <label htmlFor="followup_enabled" className="text-sm text-gray-600">
                  Enable automatic follow-up emails
                </label>
              </div>
              <Sfield
                label="Follow up after (days)"
                value={settings["followup_after_days"] ?? "5"}
                onChange={(v) => set("followup_after_days", v)}
                type="number"
                hint="Send follow-up X days after initial application (if no reply)"
              />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Follow-up email template
                </label>
                <textarea
                  value={settings["followup_template"] ?? ""}
                  onChange={(e) => set("followup_template", e.target.value)}
                  rows={5}
                  placeholder="Leave blank to use default template. Use {role}, {company}, {name} as placeholders."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">Placeholders: {"{role}"}, {"{company}"}, {"{name}"}</p>
              </div>
              <button
                onClick={() => save(["followup_enabled", "followup_after_days", "followup_template"])}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Follow-up Settings"}
              </button>
            </div>
          </>
        )}

        {/* Email Template Tab */}
        {activeTab === "template" && (
          <>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                This template is used when you click <strong>"Generate from Template"</strong> in the Add/Edit job modal.
                Placeholders are replaced with the job's actual values.
              </p>
              <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
                <p className="font-semibold text-gray-700 mb-1">Available placeholders:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  <span><code className="bg-white px-1 rounded border">{"{company}"}</code> — Company name</span>
                  <span><code className="bg-white px-1 rounded border">{"{role}"}</code> — Job title</span>
                  <span><code className="bg-white px-1 rounded border">{"{skills}"}</code> — Key skills</span>
                  <span><code className="bg-white px-1 rounded border">{"{exp}"}</code> — Experience required</span>
                  <span><code className="bg-white px-1 rounded border">{"{name}"}</code> — Your name (from_name)</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Template</label>
                <textarea
                  value={settings["email_template"] ?? DEFAULT_EMAIL_TEMPLATE}
                  onChange={(e) => set("email_template", e.target.value)}
                  rows={16}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => save(["email_template"])}
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Template"}
                </button>
                <button
                  onClick={() => set("email_template", DEFAULT_EMAIL_TEMPLATE)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                >
                  Reset to Default
                </button>
              </div>
            </div>
          </>
        )}

        {/* Sheets Sync Tab */}
        {activeTab === "sync" && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">Enable Sheets Sync</p>
                  <p className="text-xs text-gray-500 mt-0.5">Auto-sync every 30 min + manual Sync button</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings["sheets_enabled"] !== "false"}
                    onChange={(e) => set("sheets_enabled", e.target.checked ? "true" : "false")}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
                </label>
              </div>
              <button
                onClick={() => save(["sheets_enabled"])}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
            <div className="text-sm text-gray-600 space-y-2 mt-2">
              <p>
                <strong>Note:</strong> To fully disable the backend cron, also set{" "}
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">DISABLE_SHEETS_SYNC=true</code>{" "}
                in your Render environment variables.
              </p>
              <p>
                <strong>Spreadsheet ID:</strong>{" "}
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                  1hNZOukUEQnUw81Vqx0S3PyhkaLhuHO1bgnws3AqWR1k
                </code>
              </p>
              {settings["last_synced_at"] && (
                <p className="text-xs text-gray-400">
                  Last synced:{" "}
                  {new Date(settings["last_synced_at"]).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  IST
                </p>
              )}
            </div>
            <div className="mt-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 space-y-1">
              <p className="font-medium">Backend setup checklist:</p>
              <p>✓ Create Google Cloud project + enable Sheets API</p>
              <p>✓ Create Service Account → download JSON key</p>
              <p>✓ Share your Google Sheet with the service account email (Viewer)</p>
              <p>✓ Set GOOGLE_SERVICE_ACCOUNT_JSON + SPREADSHEET_ID in Render environment vars</p>
            </div>
          </>
        )}

        {/* Server Tab */}
        {activeTab === "server" && (
          <>
            <div className="space-y-4">
              <Sfield
                label="Render Backend URL"
                value={settings["render_url"] ?? ""}
                onChange={(v) => set("render_url", v)}
                hint="e.g. https://job-mailer.onrender.com — used by Supabase pg_cron to keep the app alive 8 AM–8 PM IST"
              />
              <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-700 space-y-1">
                <p className="font-medium">Keep-alive schedule (Supabase pg_cron)</p>
                <p>Pings <code className="bg-amber-100 px-1 rounded">{"{render_url}"}/health</code> every 5 min</p>
                <p>Active: Mon–Fri, 08:30 AM – 08:25 PM IST (03:00–14:55 UTC)</p>
                <p>Outside window: Render sleeps to save free-tier hours</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 space-y-1">
                <p className="font-medium">After setting the URL:</p>
                <p>1. Click Save below</p>
                <p>2. Run <code className="bg-blue-100 px-1 rounded">002_pg_cron_keepalive.sql</code> in Supabase SQL Editor (once)</p>
                <p>3. The pg_cron job will start pinging automatically</p>
              </div>
              <button
                onClick={() => save(["render_url"])}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Render URL"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Sfield({ label, value, onChange, type = "text", hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function SecretField({ label, isSaved, value, onChange, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isSaved ? "Saved — enter new value to change" : ""}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {isSaved && !value && (
        <p className="text-xs text-green-600 mt-1">Saved securely. Not shown for security.</p>
      )}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
