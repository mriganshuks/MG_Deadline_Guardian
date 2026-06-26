import React from "react";
import { Shield, LayoutDashboard, PlusCircle, AlertTriangle, ListChecks, Activity, ArrowLeft } from "lucide-react";
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
  let statusColor = "text-emerald-400 bg-emerald-950/20 border-emerald-900/20";
  let dotColor = "bg-emerald-400";

  if (avgRisk > 75) {
    statusText = "BEHIND SCHEDULE";
    statusColor = "text-red-400 bg-red-950/20 border-red-900/20";
    dotColor = "bg-red-500 animate-pulse";
  } else if (avgRisk > 45) {
    statusText = "GETTING TIGHT";
    statusColor = "text-amber-400 bg-amber-950/20 border-amber-900/20";
    dotColor = "bg-amber-400";
  }

  const navItems = [
    { id: "dashboard", label: "Temporal Outcome Center", icon: Activity },
    { id: "insights", label: "AI Insights & Habits", icon: LayoutDashboard },
    { id: "add-task", label: "Track New Deadline", icon: PlusCircle },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#050816]/80 backdrop-blur-md border-b border-white/8 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row items-center justify-between gap-4">
        {/* Left Hand: App Brand & Reset */}
        <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-start">
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="p-1.5 border border-white/8 rounded-xl bg-[#0b1220]/40 text-slate-400 hover:text-white transition cursor-pointer"
              title="Return to Landing Page"
            >
              <ArrowLeft size={14} />
            </button>
            
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/8 flex items-center justify-center">
                <Shield className="text-emerald-400 w-4.5 h-4.5" />
              </div>
              <div>
                <span className="font-sans font-semibold text-sm tracking-wider uppercase text-white block leading-none">
                  Guardian<span className="text-emerald-400">AI</span>
                </span>
                <span className="text-[9px] text-slate-500 font-mono block tracking-wider mt-1">
                  AI Deadline Companion
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Navigation Options */}
        <nav className="flex items-center bg-white/[0.02] p-1.5 rounded-xl border border-white/8 overflow-x-auto w-full xl:w-auto max-w-full no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                    : "text-slate-400 hover:text-white border border-transparent"
                }`}
              >
                <Icon size={12} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Hand: Live Risk Statistics Monitoring & Authentication */}
        <div className="flex flex-wrap items-center justify-between xl:justify-end gap-5 w-full xl:w-auto">
          {/* Average Risk Panel */}
          <div className="flex flex-col items-start xl:items-end">
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Schedule Pressure</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-base font-mono font-bold text-white leading-none">
                {avgRisk}%
              </span>
              <div className={`px-2 py-0.5 border text-[9px] font-mono rounded-full inline-flex items-center gap-1.5 ${statusColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                {statusText}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start xl:items-end">
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Connection status</span>
            <div className="flex items-center gap-2 mt-0.5">
              {isDemoMode ? (
                <div className="px-2 py-0.5 border border-emerald-500/25 bg-emerald-500/10 text-[9px] font-mono rounded-full text-emerald-400 inline-flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  DEMO ACTIVE
                </div>
              ) : user ? (
                <div className="px-2 py-0.5 border border-emerald-500/30 bg-emerald-500/10 text-[9px] font-mono rounded-full text-emerald-400 inline-flex items-center gap-1.5 font-bold shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  GOOGLE CONNECTED
                </div>
              ) : (
                <div className="px-2 py-0.5 border border-slate-700 bg-slate-800/45 text-[9px] font-mono rounded-full text-slate-400 inline-flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  GUEST MODE
                </div>
              )}
            </div>
          </div>

          <div className="hidden xl:block h-8 w-px bg-white/8" />

          {/* Sign In & Sync Controls */}
          <div className="flex items-center gap-2.5">
            {isDemoMode ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-1.5 text-emerald-400 font-mono text-[10px] uppercase font-bold tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  🌟 DEMO ACTIVE
                </div>
                <button
                  onClick={onExitDemo}
                  className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded-xl text-xs font-mono transition cursor-pointer shadow-lg font-semibold"
                >
                  Exit Demo
                </button>
              </div>
            ) : !user ? (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={onSyncCalendarPress}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:shadow-emerald-500/5 rounded-xl text-xs font-mono transition cursor-pointer shadow-lg font-medium"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  Sync Cal
                </button>
                <button
                  onClick={onSignIn}
                  className="flex items-center gap-2 px-3.5 py-1.5 border border-white/8 hover:border-emerald-500/30 rounded-xl bg-slate-900/60 hover:bg-slate-900/95 text-xs font-mono text-slate-300 hover:text-white transition cursor-pointer shadow-lg"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h4.02c2.35-2.16 3.7-5.35 3.7-9.14z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-4.02-3.12c-1.12.75-2.55 1.19-4.02 1.19-3.09 0-5.71-2.09-6.64-4.89H1.14v3.22C3.12 21.39 7.3 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.36 14.28a7.22 7.22 0 0 1 0-4.56V6.5H1.14a11.98 11.98 0 0 0 0 11l4.22-3.22z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.3 0 3.12 2.61 1.14 6.5l4.22 3.22c.93-2.8 3.55-4.89 6.64-4.89z"/>
                  </svg>
                  Sign In
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                {/* Calendar Sync Button */}
                {accessToken ? (
                  <button
                    onClick={onTriggerCalendarSync}
                    disabled={isSyncingCalendar}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer shadow-lg ${
                      isSyncingCalendar
                        ? "bg-slate-900/40 border-white/[0.04] text-slate-500 cursor-not-allowed"
                        : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:shadow-emerald-500/5"
                    }`}
                    title="Force sync active tasks with Google Calendar"
                  >
                    <svg className={`w-3.5 h-3.5 ${isSyncingCalendar ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-mono transition cursor-pointer shadow-lg"
                    title="Google Calendar is disconnected. Click to re-authorize Sync scopes."
                  >
                    Connect Cal
                  </button>
                )}

                {/* Profile Identity Details */}
                <div className="flex items-center gap-2 bg-white/[0.02] border border-white/8 rounded-xl pl-2 pr-1.5 py-1">
                  <span className="text-[10px] font-mono text-slate-300 max-w-[80px] truncate hidden sm:inline">
                    {(user.user_metadata?.full_name || user.email?.split("@")[0] || "User").split(" ")[0]}
                  </span>
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={user.user_metadata?.full_name || "User Avatar"}
                      referrerPolicy="no-referrer"
                      className="w-[18px] h-[18px] rounded-full object-cover border border-white/8"
                    />
                  ) : (
                    <div className="w-[18px] h-[18px] rounded-full bg-slate-800 flex items-center justify-center border border-white/8">
                      <span className="text-[8px] font-mono text-slate-400">?</span>
                    </div>
                  )}
                  <button
                    onClick={onSignOut}
                    className="ml-1.5 px-1.5 py-0.5 border border-white/8 hover:border-red-500/20 hover:bg-red-500/10 rounded-md text-[9px] font-mono text-slate-500 hover:text-red-400 transition cursor-pointer"
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

