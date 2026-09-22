import React from "react";
import {
  X,
  Sparkles,
  CheckSquare,
  Play,
  ArrowRight,
  ShieldAlert,
  Compass,
  Search,
  BarChart3,
  Award,
  Radio,
  FileCheck
} from "lucide-react";

export default function DemoScriptModal({
  isOpen,
  onClose,
  onNavigateTab,
  onTriggerScenario,
  onSearchPlate
}) {
  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      title: "Step 1: Operations Overview & City Map",
      spec: "Section 9.1",
      icon: Compass,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      description: "Show live city map with 8 camera nodes, health indicators (green=online, amber=delayed, red=offline), live volume KPIs, and real-time masked ANPR reads.",
      actionLabel: "Go to Live Overview",
      action: () => {
        onNavigateTab("overview");
        onClose();
      }
    },
    {
      num: 2,
      title: "Step 2: Camera Feed & Edge Telemetry",
      spec: "Section 9.2",
      icon: Play,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      description: "Click a camera node on the map to show CCTV live stream frame, FPS (25 FPS), latency (38ms), monitored lanes, and adjacent node distances.",
      actionLabel: "Inspect Cameras",
      action: () => {
        onNavigateTab("cameras");
        onClose();
      }
    },
    {
      num: 3,
      title: "Step 3: Vehicle Trajectory Reconstruction",
      spec: "Section 9.3 & 9.4",
      icon: Search,
      color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
      description: "Search seeded test plate GJ06AB1234. Reconstructs ordered waypoints across 4 Vadodara cameras (Kala Ghoda -> Railway Station -> Akota Bridge -> Manjalpur), calculates travel times, speeds, and displays honest route gaps.",
      actionLabel: "Search GJ06AB1234",
      action: () => {
        onNavigateTab("search");
        onSearchPlate("GJ06AB1234");
        onClose();
      }
    },
    {
      num: 4,
      title: "Step 4: Macro Traffic Flow & OD Matrix",
      spec: "Section 9.5",
      icon: BarChart3,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      description: "Show spatial concentration heatmap, vehicle modal mix (cars/bikes/trucks), Origin-Destination (OD) matrix, and 24-hour peak-hour volume curves.",
      actionLabel: "Open Traffic Analytics",
      action: () => {
        onNavigateTab("analytics");
        onClose();
      }
    },
    {
      num: 5,
      title: "Step 5: Live Watchlist Match Alert",
      spec: "Section 9.6",
      icon: ShieldAlert,
      color: "text-red-400 bg-red-500/10 border-red-500/20",
      description: "Injects stolen vehicle GJ06CC9901 (Vadodara Police FIR #2026/894). Demonstrates instant critical alert, evidence snapshot review, acknowledgement, and audit record.",
      actionLabel: "Trigger Watchlist Match",
      action: async () => {
        await onTriggerScenario("blacklist_match");
        onNavigateTab("alerts");
        onClose();
      }
    },
    {
      num: 6,
      title: "Step 6: Impossible Travel / Cloned Plate",
      spec: "Section 4.4.1",
      icon: Play,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      description: "Detects same plate MH02EE7722 at 2 geographically distant cameras within 20s (>900 km/h implied speed) -> flags duplicate/cloned plate.",
      actionLabel: "Trigger Impossible Travel",
      action: async () => {
        await onTriggerScenario("impossible_travel");
        onNavigateTab("alerts");
        onClose();
      }
    },
    {
      num: 7,
      title: "Step 7: Empirical Model Quality Benchmarks",
      spec: "Section 9.7 & Section 6",
      icon: Award,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      description: "Presents empirical evaluation report: 93.8% end-to-end accuracy on 1,500 held-out frames, precision/recall, 40ms latency waterfall, and rain/glare stress tests.",
      actionLabel: "View Quality Benchmarks",
      action: () => {
        onNavigateTab("quality");
        onClose();
      }
    },
    {
      num: 8,
      title: "Step 8: External Ingestion & Live Integration",
      spec: "User Role Requirement",
      icon: Radio,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      description: "Demonstrate how teammate pipelines (Person 1 & 2) stream live frames and detections into the dashboard via REST and WebSockets in real time.",
      actionLabel: "Open External Workbench",
      action: () => {
        onNavigateTab("integration");
        onClose();
      }
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base font-mono">
                SIH PRESENTATION DEMO SCRIPT (SECTION 9)
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Role 6: Dashboard, UI &amp; Demo // Official Hackathon Presentation Flow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Script Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="p-3.5 rounded-lg bg-blue-950/30 border border-blue-900/50 text-xs text-blue-300 font-mono leading-relaxed">
            <strong>Presenter Tip:</strong> Walk the judges through these 8 sequential steps.
            Click <strong>&quot;Jump to Step&quot;</strong> to instantly configure the dashboard for each demonstration narrative.
          </div>

          <div className="space-y-3">
            {steps.map((s) => {
              const IconComp = s.icon;
              return (
                <div
                  key={s.num}
                  className="bg-slate-950 p-4 rounded-xl border border-slate-800/90 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg border shrink-0 ${s.color}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-100 text-sm">{s.title}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {s.spec}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={s.action}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-200 font-bold transition flex items-center justify-center space-x-1 shrink-0"
                  >
                    <span>{s.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
