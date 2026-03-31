import { useState } from "react";
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

const TABS = ["Dashboard", "Settings"];

export default function App() {
  const [tab, setTab] = useState("Dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [showTestEmail, setShowTestEmail] = useState(false);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-base font-bold text-gray-900">✉️ Job Mailer</h1>
            <nav className="flex gap-1">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    tab === t
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {t}
                </button>
              ))}
            </nav>
          </div>

          {tab === "Dashboard" && (
            <div className="flex items-center gap-2">
              <SyncNowButton onRefresh={refresh} />
              <RunNowButton onRefresh={refresh} />
              <button
                onClick={() => setShowTestEmail(true)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
              >
                Test Email
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                + Add Job
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === "Dashboard" && (
          <>
            <StatsBar refreshKey={refreshKey} />
            <QueuePanel refreshKey={refreshKey} onRefresh={refresh} />
            <JobTable
              refreshKey={refreshKey}
              onEdit={(job) => setEditJob(job)}
              onRefresh={refresh}
            />
          </>
        )}

        {tab === "Settings" && (
          <div className="space-y-4 max-w-2xl">
            <ResumeUpload />
            <SettingsPanel />
          </div>
        )}
      </main>

      {/* Modals */}
      {showAdd && (
        <AddJobModal
          onClose={() => setShowAdd(false)}
          onSaved={refresh}
        />
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
