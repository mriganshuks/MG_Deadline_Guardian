import React from "react";
import { Shield, LayoutDashboard, PlusCircle, AlertTriangle, ListChecks, Activity, ArrowLeft, BarChart3 } from "lucide-react";
import { Task } from "../types";
import { User } from "@supabase/supabase-js";

interface HeaderProps {
  currentTab: string;
  setTab: (tab: string) => void;
  tasks: Task[];
  onExit: () => void;
  user: User | null;
  accessToken: string | null;
  isSyncingCalendar: boolean;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onTriggerCalendarSync: () => Promise<void>;
  isDemoMode?: boolean;
  onExitDemo?: () => void;
  onSyncCalendarPress: () => void;
}

export default function Header({ 
  currentTab, 
  setTab, 
  tasks, 
  onExit,
  user,
  accessToken,
  isSyncingCalendar,
  onSignIn,
  onSignOut,
  onTriggerCalendarSync,
  isDemoMode = false,
  onExitDemo,
  onSyncCalendarPress
}: HeaderProps) {
  // Calculate average risk score
  const activeTasks = tasks.filter(t => !t.completed);
  const tasksWithRisk = activeTasks.filter(t => typeof t.riskScore === "number");
  const avgRisk = tasksWithRisk.length > 0
    ? Math.round(tasksWithRisk.reduce((acc, t) => acc + (t.riskScore || 0), 0) / tasksWithRisk.length)
    : 0;

  // Compute overall status threat level
  let statusText = "STEADY PROGRESS";
  let statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  let dotColor = "bg-emerald-400";

  if (avgRisk > 75) {
    statusText = "BEHIND SCHEDULE";
    statusColor = "text-red-400 bg-red-500/10 border-red-500/20";
    dotColor = "bg-red-500 animate-pulse";
  } else if (avgRisk > 45) {
    statusText = "GETTING TIGHT";
    statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
    dotColor = "bg-amber-400";
  }

  const navItems = [
    { id: "dashboard", label: "Temporal Outcome Center", icon: Activity },
    { id: "analytics", label: "AI Analytics & Insights", icon: BarChart3 },
    { id: "insights", label: "Risk & Recovery Planner", icon: LayoutDashboard },
    { id: "add-task", label: "Track New Deadline", icon: PlusCircle },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#111111]/80 backdrop-blur-md border-b border-white/5 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row items-center justify-between gap-4">
        {/* Left Hand: App Brand & Reset */}
        <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-start">
          <div className="flex items-center gap-4">
            <button
              onClick={onExit}
              className="p-2 border border-white/10 rounded-xl bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
              title="Return to Landing Page"
            >
              <ArrowLeft size={16} />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Shield className="text-white w-5 h-5" />
              </div>
              <div>
                <span className="font-display font-semibold text-sm tracking-wider uppercase text-white block leading-none">
                  Guardian<span className="text-emerald-400">AI</span>
                </span>
                <span className="text-[10px] text-white/40 font-semibold uppercase tracking-widest block mt-1.5">
                  Deadline Companion
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Navigation Options */}
        <nav className="flex items-center bg-[#161616] p-1.5 rounded-full border border-white/5 overflow-x-auto w-full xl:w-auto max-w-full no-scrollbar shadow-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/40 hover:text-white/80 border border-transparent"
                }`}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Hand: Live Risk Statistics Monitoring & Authentication */}
        <div className="flex flex-wrap items-center justify-between xl:justify-end gap-6 w-full xl:w-auto">
          {/* Average Risk Panel */}
          <div className="flex flex-col items-start xl:items-end">
            <span className="text-[10px] text-white/40 font-semibold uppercase tracking-widest block">Schedule Pressure</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-base font-display font-semibold text-white leading-none">
                {avgRisk}%
              </span>
              <div className={`px-2.5 py-0.5 border text-[10px] font-semibold rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 ${statusColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                {statusText}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start xl:items-end">
            <span className="text-[10px] text-white/40 font-semibold uppercase tracking-widest block">Connection status</span>
            <div className="flex items-center gap-2 mt-1.5">
              {isDemoMode ? (
                <div className="px-2.5 py-0.5 border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-semibold rounded-full uppercase tracking-widest text-emerald-400 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  DEMO ACTIVE
                </div>
              ) : user ? (
                <div className="px-2.5 py-0.5 border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-semibold rounded-full uppercase tracking-widest text-emerald-400 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  GOOGLE CONNECTED
                </div>
              ) : (
                <div className="px-2.5 py-0.5 border border-white/10 bg-white/5 text-[10px] font-semibold rounded-full uppercase tracking-widest text-white/40 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  GUEST MODE
                </div>
              )}
            </div>
          </div>

          <div className="hidden xl:block h-8 w-px bg-white/5" />

          {/* Sign In & Sync Controls */}
          <div className="flex items-center gap-3">
            {isDemoMode ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 text-emerald-400 text-[10px] uppercase font-semibold tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  🌟 DEMO ACTIVE
                </div>
                <button
                  onClick={onExitDemo}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs uppercase font-semibold tracking-widest transition-colors cursor-pointer"
                >
                  Exit Demo
                </button>
              </div>
            ) : !user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={onSyncCalendarPress}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs uppercase font-semibold tracking-widest transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  Sync Cal
                </button>
                <button
                  onClick={onSignIn}
                  className="flex items-center gap-2 px-4 py-2 border border-white/10 hover:border-white/20 rounded-xl bg-white/5 hover:bg-white/10 text-xs uppercase font-semibold tracking-widest text-white transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h4.02c2.35-2.16 3.7-5.35 3.7-9.14z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-4.02-3.12c-1.12.75-2.55 1.19-4.02 1.19-3.09 0-5.71-2.09-6.64-4.89H1.14v3.22C3.12 21.39 7.3 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.36 14.28a7.22 7.22 0 0 1 0-4.56V6.5H1.14a11.98 11.98 0 0 0 0 11l4.22-3.22z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.3 0 3.12 2.61 1.14 6.5l4.22 3.22c.93-2.8 3.55-4.89 6.64-4.89z"/>
                  </svg>
                  Sign In
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Calendar Sync Button */}
                {accessToken ? (
                  <button
                    onClick={onTriggerCalendarSync}
                    disabled={isSyncingCalendar}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs uppercase font-semibold tracking-widest transition-colors cursor-pointer ${
                      isSyncingCalendar
                        ? "bg-white/5 border-white/5 text-white/20 cursor-not-allowed"
                        : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400"
                    }`}
                    title="Force sync active tasks with Google Calendar"
                  >
                    <svg className={`w-4 h-4 ${isSyncingCalendar ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      {isSyncingCalendar ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      )}
                    </svg>
                    {isSyncingCalendar ? "Syncing..." : "Sync Cal"}
                  </button>
                ) : (
                  <button
                    onClick={onSignIn}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-xl text-xs uppercase font-semibold tracking-widest transition-colors cursor-pointer"
                    title="Google Calendar is disconnected. Click to re-authorize Sync scopes."
                  >
                    Connect Cal
                  </button>
                )}

                {/* Profile Identity Details */}
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl pl-3 pr-2 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-white max-w-[80px] truncate hidden sm:inline">
                    {(user.user_metadata?.full_name || user.email?.split("@")[0] || "User").split(" ")[0]}
                  </span>
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={user.user_metadata?.full_name || "User Avatar"}
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 rounded-full object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                      <span className="text-[10px] font-semibold text-white/40">?</span>
                    </div>
                  )}
                  <button
                    onClick={onSignOut}
                    className="ml-2 px-2 py-1 border border-transparent hover:border-red-500/20 hover:bg-red-500/10 rounded-md text-[9px] uppercase tracking-widest font-semibold text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                    title="Exit account"
                  >
                    Exit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

