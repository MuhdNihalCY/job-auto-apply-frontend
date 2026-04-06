import { useState, useEffect } from "react";
import StatsBar from "./components/StatsBar.jsx";
import QueuePanel from "./components/QueuePanel.jsx";
import JobTable from "./components/JobTable.jsx";
import AddJobModal from "./components/AddJobModal.jsx";
import EditJobModal from "./components/EditJobModal.jsx";
import RunNowButton from "./components/RunNowButton.jsx";
import SyncNowButton from "./components/SyncNowButton.jsx";
import TestEmailModal from "./components/TestEmailModal.jsx";
import ResumeUpload from "./components/ResumeUpload.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import LoginPage from "./components/LoginPage.jsx";
import Tooltip from "./components/Tooltip.jsx";
import { supabase } from "./lib/supabase.js";

const NAV = [
  { id: "queue",    label: "Queue",    icon: "📬" },
  { id: "jobs",     label: "Jobs",     icon: "💼" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

export default function App() {
  const [session, setSession]           = useState(undefined);
  const [mobileTab, setMobileTab]       = useState("queue");
  const [desktopPanel, setDesktopPanel] = useState("jobs"); // "jobs" | "settings"
  const [refreshKey, setRefreshKey]     = useState(0);
  const [showAdd, setShowAdd]           = useState(false);
  const [editJob, setEditJob]           = useState(null);
  const [showTestEmail, setShowTestEmail] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (session === null) return <LoginPage />;

  function refresh() { setRefreshKey((k) => k + 1); }

  return (
    <div className="h-dvh flex flex-col bg-gray-50 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 z-20">
        <div className="flex items-center justify-between px-3 h-12">

          {/* Logo */}
          <span className="text-sm font-bold text-gray-900 whitespace-nowrap">✉️ Job Mailer</span>

          {/* Desktop: action buttons */}
          <div className="hidden lg:flex items-center gap-2">
            {desktopPanel === "jobs" && (
              <>
                <SyncNowButton onRefresh={refresh} compact />
                <RunNowButton  onRefresh={refresh} compact />
                <Tooltip text="Send a test email to verify your setup" position="bottom">
                  <button
                    onClick={() => setShowTestEmail(true)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                  >
                    Test Email
                  </button>
                </Tooltip>
                <Tooltip text="Add a new job application manually" position="bottom">
                  <button
                    onClick={() => setShowAdd(true)}
                    className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    + Add Job
                  </button>
                </Tooltip>
              </>
            )}
            <Tooltip text={desktopPanel === "settings" ? "Back to job list" : "Configure email provider, templates & sync"} position="bottom">
              <button
                onClick={() => setDesktopPanel((p) => p === "settings" ? "jobs" : "settings")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  desktopPanel === "settings"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-200 hover:bg-gray-50 text-gray-600"
                }`}
              >
                ⚙️ Settings
              </button>
            </Tooltip>
            <Tooltip text="Sign out of your account" position="bottom">
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
              >
                Logout
              </button>
            </Tooltip>
          </div>

          {/* Mobile: icon action buttons */}
          <div className="flex lg:hidden items-center gap-1">
            <SyncNowButton onRefresh={refresh} compact />
            <RunNowButton  onRefresh={refresh} compact />
            <Tooltip text="Add a new job application" position="bottom">
              <button
                onClick={() => setShowAdd(true)}
                className="px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg"
              >
                +
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Desktop: Left panel (queue) ─────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-[340px] flex-shrink-0 border-r border-gray-200 overflow-y-auto p-3">
          <StatsBar refreshKey={refreshKey} />
          <QueuePanel refreshKey={refreshKey} onRefresh={refresh} />
        </aside>

        {/* ── Desktop: Right panel (jobs or settings) ─────────────────── */}
        <main className="hidden lg:flex flex-col flex-1 overflow-hidden">
          {desktopPanel === "jobs" && (
            <div className="flex flex-col flex-1 overflow-hidden p-3">
              <JobTable
                refreshKey={refreshKey}
                onEdit={(job) => setEditJob(job)}
                onRefresh={refresh}
              />
            </div>
          )}
          {desktopPanel === "settings" && (
            <div className="overflow-y-auto flex-1 p-4 max-w-2xl space-y-4">
              <ResumeUpload />
              <SettingsPanel />
            </div>
          )}
        </main>

        {/* ── Mobile: tab content ─────────────────────────────────────── */}
        <div className="flex lg:hidden flex-col flex-1 overflow-y-auto pb-14">
          {mobileTab === "queue" && (
            <div className="p-3">
              <StatsBar refreshKey={refreshKey} />
              <QueuePanel refreshKey={refreshKey} onRefresh={refresh} />
            </div>
          )}

          {mobileTab === "jobs" && (
            <div className="p-3 flex flex-col flex-1">
              <JobTable
                refreshKey={refreshKey}
                onEdit={(job) => setEditJob(job)}
                onRefresh={refresh}
              />
            </div>
          )}

          {mobileTab === "settings" && (
            <div className="p-3 space-y-4">
              <ResumeUpload />
              <SettingsPanel />
              <button
                onClick={() => supabase.auth.signOut()}
                className="w-full py-2.5 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ── Mobile: Bottom nav ─────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-14 bg-white border-t border-gray-200 flex z-20">
        {NAV.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setMobileTab(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              mobileTab === id ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <span className="text-base leading-none">{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {showAdd && (
        <AddJobModal onClose={() => setShowAdd(false)} onSaved={refresh} />
      )}
      {editJob && (
        <EditJobModal
          job={editJob}
          onClose={() => setEditJob(null)}
          onSaved={refresh}
        />
      )}
      {showTestEmail && (
        <TestEmailModal onClose={() => setShowTestEmail(false)} />
      )}
    </div>
  );
}
