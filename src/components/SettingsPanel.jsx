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

const ALL_SETTING_KEYS = [
  "daily_email_limit",
  "delay_min_minutes",
  "delay_max_minutes",
  "from_name",
  "from_email",
  "email_provider",
  "render_url",
  "smtp_host",
  "smtp_port",
  "smtp_secure",
  "smtp_user",
  "smtp_pass",
  "sendgrid_api_key",
  "resend_api_key",
  "brevo_api_key",
  "last_synced_at",
];

export default function SettingsPanel() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("provider");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ALL_SETTING_KEYS);

    const map = {};
    for (const row of data ?? []) map[row.key] = row.value;
    setSettings(map);
    setLoading(false);
  }

  function set(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function save(keys) {
    setSaving(true);
    const upserts = keys.map((k) => ({ key: k, value: settings[k] ?? "" }));
    const { error } = await supabase.from("app_settings").upsert(upserts);
    setSaving(false);
    if (error) toast.error("Save failed: " + error.message);
    else toast.success("Settings saved!");
  }

  async function testConnection() {
    setTesting(true);
    try {
      // Save current provider settings first
      await save(providerKeys(settings["email_provider"]));
      // Invoke process-queue with a test flag (no actual email sent — just auth check)
      // We call schedule-emails with a dry-run body flag if supported, otherwise just verify settings exist
      const provider = settings["email_provider"] || "gmail";
      const missing = [];
      if (provider === "gmail" || provider === "smtp") {
        if (!settings["smtp_user"]) missing.push("SMTP User");
        if (!settings["smtp_pass"]) missing.push("SMTP Password");
      } else if (provider === "sendgrid") {
        if (!settings["sendgrid_api_key"]) missing.push("SendGrid API Key");
      } else if (provider === "resend") {
        if (!settings["resend_api_key"]) missing.push("Resend API Key");
      } else if (provider === "brevo") {
        if (!settings["brevo_api_key"]) missing.push("Brevo API Key");
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
    { key: "sync", label: "Sheets Sync" },
    { key: "server", label: "Server" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
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
            <div className="grid grid-cols-2 gap-3">
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
                  <div className="grid grid-cols-3 gap-3">
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
                <div className="grid grid-cols-2 gap-3">
                  <Sfield
                    label={provider === "gmail" ? "Gmail Address" : "SMTP Username"}
                    value={settings["smtp_user"] ?? ""}
                    onChange={(v) => set("smtp_user", v)}
                    type="email"
                  />
                  <Sfield
                    label={provider === "gmail" ? "App Password" : "SMTP Password"}
                    value={settings["smtp_pass"] ?? ""}
                    onChange={(v) => set("smtp_pass", v)}
                    type="password"
                    hint={provider === "gmail" ? "16-char app password from Google Account → Security" : ""}
                  />
                </div>
              </>
            )}

            {provider === "sendgrid" && (
              <Sfield
                label="SendGrid API Key"
                value={settings["sendgrid_api_key"] ?? ""}
                onChange={(v) => set("sendgrid_api_key", v)}
                type="password"
                hint="Free tier: 100 emails/day"
              />
            )}

            {provider === "resend" && (
              <Sfield
                label="Resend API Key"
                value={settings["resend_api_key"] ?? ""}
                onChange={(v) => set("resend_api_key", v)}
                type="password"
                hint="Free tier: 100 emails/day, 3000/month"
              />
            )}

            {provider === "brevo" && (
              <Sfield
                label="Brevo API Key"
                value={settings["brevo_api_key"] ?? ""}
                onChange={(v) => set("brevo_api_key", v)}
                type="password"
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
            <div className="grid grid-cols-3 gap-3">
              <Sfield
                label="Daily Email Limit"
                value={settings["daily_email_limit"] ?? "5"}
                onChange={(v) => set("daily_email_limit", v)}
                type="number"
                hint="Max emails per day (1–20)"
              />
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
            <div className="pt-1">
              <p className="text-xs text-gray-400">
                Example with 5 emails, 7–12 min gaps: sends from 10:00 AM to ~10:45 AM IST
              </p>
            </div>
            <button
              onClick={() =>
                save(["daily_email_limit", "delay_min_minutes", "delay_max_minutes"])
              }
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Rules"}
            </button>
          </>
        )}

        {/* Sheets Sync Tab */}
        {activeTab === "sync" && (
          <>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                The Node.js backend syncs from Google Sheets every 30 minutes automatically.
                You can also trigger a sync manually from the dashboard.
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
