import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "./components/Header";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import AddTask from "./components/AddTask";
import Insights from "./components/Insights";
import { Task, RecoveryPlan, SimulationResult } from "./types";
import { initialTasks } from "./initialTasks";
import Hls from "hls.js";

// Authentication, Supabase, and Google Calendar sync service imports
import { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { 
  fetchUserTasks, 
  saveUserTask, 
  ensureUserProfile,
  fetchUserHabits,
  saveUserHabit,
  fetchUserGoals,
  saveUserGoal,
  fetchUserPreferences,
  saveUserPreferences,
  fetchUserAiReports,
  saveUserAiReport,
  fetchUserRecoveryPlans,
  saveUserRecoveryPlan
} from "./supabaseService";
import { syncTaskToGoogleCalendar, syncSessionToGoogleCalendar } from "./googleCalendarService";

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTaskForRecovery, setSelectedTaskForRecovery] = useState<string | null>(null);
  const [cachedSimulation, setCachedSimulation] = useState<SimulationResult | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [syncConfirmation, setSyncConfirmation] = useState<{ show: boolean; sessionsCount: number; nextSessionTitle: string; nextSessionTime: string } | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Background Video Player Setup for Unified Visual Experience
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const hlsUrl = "https://stream.mux.com/tLkHO1qZoaaQOUeVWo8hEBeGQfySP02EPS02BmnNFyXys.m3u8";
    let hls: Hls | null = null;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: false });
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn("Global HLS error, using premium gradient fallback:", data);
          setVideoError(true);
        }
      });
    } else {
      setVideoError(true);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, []);

  const persistTasks = (newTasks: Task[]) => {
    if (!isDemoMode) {
      localStorage.setItem("guardian_ai_tasks", JSON.stringify(newTasks));
    }
  };

  // Authentication & Google API sync state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const handleAuthSuccess = async (sbUser: User, providerToken: string | null | undefined) => {
    setUser(sbUser);
    setShowLanding(false); // Bypass landing page since user is authenticated
    
    // Manage Google Calendar token
    let token = providerToken;
    if (token) {
      setAccessTokenState(token);
      localStorage.setItem("google_calendar_access_token", token);
    } else {
      const cachedToken = localStorage.getItem("google_calendar_access_token");
      if (cachedToken) {
        setAccessTokenState(cachedToken);
      }
    }
    
    // Fetch fresh tasks from Supabase since we're now logged in
    try {
      const cloud = await fetchUserTasks(sbUser.id);
      
      // Intelligent non-destructive migration & merge of guest tasks
      const localTasksRaw = localStorage.getItem("guardian_ai_tasks");
      const localTasks = localTasksRaw ? JSON.parse(localTasksRaw) : [];
      
      const cloudTasksMap = new Map<string, Task>();
      for (const t of cloud) {
        cloudTasksMap.set(t.id, t);
      }
      
      const mergedTasks: Task[] = [...cloud];
      
      for (const localTask of localTasks) {
        const existingCloudTask = cloudTasksMap.get(localTask.id);
        
        if (!existingCloudTask) {
          // If it doesn't exist in the cloud, save it to Supabase
          await saveUserTask(sbUser.id, localTask);
          mergedTasks.push(localTask);
        } else {
          // If it exists, compare edit/recalculating times
          const localTime = localTask.lastRecalculatedAt ? new Date(localTask.lastRecalculatedAt).getTime() : 0;
          const cloudTime = existingCloudTask.lastRecalculatedAt ? new Date(existingCloudTask.lastRecalculatedAt).getTime() : 0;
          
          if (localTime > cloudTime) {
            await saveUserTask(sbUser.id, localTask);
            const idx = mergedTasks.findIndex(t => t.id === localTask.id);
            if (idx !== -1) {
              mergedTasks[idx] = localTask;
            }
          }
        }
      }

      // Sync migrated/merged tasks to Google Calendar if token is available
      const finalTasks = await Promise.all(
        mergedTasks.map(async (task) => {
          if (!task.googleEventId && token) {
            const calEventId = await syncTaskToGoogleCalendar(task, token);
            if (calEventId) {
              const refreshed = { ...task, googleEventId: calEventId };
              await saveUserTask(sbUser.id, refreshed);
              return refreshed;
            }
          }
          return task;
        })
      );
      
      setTasks(finalTasks.length > 0 ? finalTasks : cloud);
      localStorage.setItem("guardian_ai_tasks", JSON.stringify(finalTasks.length > 0 ? finalTasks : cloud));

      // Create/ensure user profile in database
      await ensureUserProfile(sbUser);

      // Migrate other guest tables (habits, goals, preferences, ai_reports, recovery_plans)
      const localHabitsRaw = localStorage.getItem("guardian_ai_habits");
      if (localHabitsRaw) {
        const localHabits = JSON.parse(localHabitsRaw);
        const cloudHabits = await fetchUserHabits(sbUser.id);
        const cloudTitles = new Set(cloudHabits.map(h => h.title));
        for (const habit of localHabits) {
          if (!cloudTitles.has(habit.title)) {
            await saveUserHabit(sbUser.id, habit);
          }
        }
      }

      const localGoalsRaw = localStorage.getItem("guardian_ai_goals");
      if (localGoalsRaw) {
        const localGoals = JSON.parse(localGoalsRaw);
        const cloudGoals = await fetchUserGoals(sbUser.id);
        const cloudTitles = new Set(cloudGoals.map(g => g.title));
        for (const goal of localGoals) {
          if (!cloudTitles.has(goal.title)) {
            await saveUserGoal(sbUser.id, goal);
          }
        }
      }

      const localPrefsRaw = localStorage.getItem("guardian_ai_user_preferences");
      if (localPrefsRaw) {
        const localPrefs = JSON.parse(localPrefsRaw);
        const cloudPrefs = await fetchUserPreferences(sbUser.id);
        if (!cloudPrefs) {
          await saveUserPreferences(sbUser.id, localPrefs);
        }
      }

      const localReportsRaw = localStorage.getItem("guardian_ai_ai_reports");
      if (localReportsRaw) {
        const localReports = JSON.parse(localReportsRaw);
        const cloudReports = await fetchUserAiReports(sbUser.id);
        const cloudTypes = new Set(cloudReports.map(r => r.report_type));
        for (const report of localReports) {
          if (!cloudTypes.has(report.report_type)) {
            await saveUserAiReport(sbUser.id, report);
          }
        }
      }

      const localPlansRaw = localStorage.getItem("guardian_ai_recovery_plans");
      if (localPlansRaw) {
        const localPlans = JSON.parse(localPlansRaw);
        const cloudPlans = await fetchUserRecoveryPlans(sbUser.id);
        const cloudStrategies = new Set(cloudPlans.map(p => p.overall_strategy));
        for (const plan of localPlans) {
          if (!cloudStrategies.has(plan.overall_strategy)) {
            await saveUserRecoveryPlan(sbUser.id, plan);
          }
        }
      }

    } catch (err) {
      console.error("Error setting up session on load:", err);
      setSyncFeedback({ type: "error", message: "We couldn't load your tasks from the cloud database. Showing local cached copy." });
    }
  };

  // Load local tasks and initialize authentication on mount
  useEffect(() => {
    const local = localStorage.getItem("guardian_ai_tasks");
    if (local) {
      try {
        setTasks(JSON.parse(local));
      } catch (e) {
        console.error("Failed to parse local cached tasks:", e);
      }
    }

    const initSupabaseSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await handleAuthSuccess(session.user, session.provider_token);
      } else {
        setUser(null);
        setAccessTokenState(null);
      }
    };

    initSupabaseSession();

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await handleAuthSuccess(session.user, session.provider_token);
      } else {
        setUser(null);
        setAccessTokenState(null);
      }
    });

    // Message listener for the Popup-Based OAuth callback flow (SameSite iframe workaround)
    const handleAuthMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        const hash = event.data.hash;
        if (hash) {
          // Parse access token and refresh token from hash
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          
          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            if (error) {
              console.error("Failed to set session from OAuth popup:", error);
            } else if (data.session) {
              await handleAuthSuccess(data.session.user, data.session.provider_token);
            }
          }
        }
      }
    };

    window.addEventListener("message", handleAuthMessage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("message", handleAuthMessage);
    };
  }, []);

  // Automatic toast alert dismissal helper
  useEffect(() => {
    if (syncFeedback) {
      const timer = setTimeout(() => {
        setSyncFeedback(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [syncFeedback]);

  // Synchronize and persist any single task update to Supabase and Google Calendar
  const syncAndSaveTask = async (task: Task, currentUser = user, currentToken = accessToken) => {
    if (isDemoMode) return;
    if (currentUser) {
      try {
        // 1. Save directly to Supabase
        await saveUserTask(currentUser.id, task);
        
        // 2. Synchronize to Google Calendar if token exists, updating stored Event ID
        if (currentToken) {
          try {
            const calEventId = await syncTaskToGoogleCalendar(task, currentToken);
            if (calEventId && calEventId !== task.googleEventId) {
              const updatedTask = { ...task, googleEventId: calEventId };
              await saveUserTask(currentUser.id, updatedTask);
              setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
            }

            // Automatically sync recovery roadmap sessions if they exist
            if (task.recoveryPlan && task.recoveryPlan.sessions) {
              let sessionsUpdated = false;
              const updatedSessions = await Promise.all(
                task.recoveryPlan.sessions.map(async (session) => {
                  const sessionEventId = await syncSessionToGoogleCalendar(task, session, currentToken);
                  if (sessionEventId && sessionEventId !== session.googleEventId) {
                    sessionsUpdated = true;
                    return { ...session, googleEventId: sessionEventId };
                  }
                  return session;
                })
              );

              if (sessionsUpdated) {
                const updatedTask = {
                  ...task,
                  googleEventId: calEventId || task.googleEventId,
                  recoveryPlan: {
                    ...task.recoveryPlan,
                    sessions: updatedSessions
                  }
                };
                await saveUserTask(currentUser.id, updatedTask);
                setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
              }
            }
          } catch (calErr) {
            console.error("Google Calendar sync error:", calErr);
            setSyncFeedback({ type: "error", message: "We couldn't sync your calendar. Please try again." });
          }
        }
      } catch (err) {
        console.error("Supabase sync error:", err);
        setSyncFeedback({ type: "error", message: "We couldn't save your task to the cloud database. Your changes are saved locally." });
      }
    }
  };

  // Google Sign In trigger flow with optional auto task sync
  const handleSignIn = async () => {
    try {
      setSyncFeedback({ type: "info", message: "Connecting to Google..." });
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'https://www.googleapis.com/auth/calendar',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          },
          skipBrowserRedirect: true
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.url) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          data.url,
          "SupabaseGoogleSignInPopup",
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=no`
        );
        
        if (!popup) {
          setSyncFeedback({ type: "error", message: "Popup blocked! Please allow popups for this app to authenticate with Google." });
        }
      } else {
        throw new Error("Could not acquire authentication URL from Supabase.");
      }
    } catch (err: any) {
      console.error("Google login failed:", err);
      const friendlyMessage = err?.message || "Sign-In failed. Please try again.";
      setSyncFeedback({ type: "error", message: friendlyMessage });
    }
  };

  // Logout action
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAccessTokenState(null);
      
      // Clear token and cached tasks/metadata
      localStorage.removeItem("google_calendar_access_token");
      localStorage.removeItem("guardian_ai_tasks");
      localStorage.removeItem("guardian_ai_habits");
      localStorage.removeItem("guardian_ai_goals");
      localStorage.removeItem("guardian_ai_user_preferences");
      localStorage.removeItem("guardian_ai_ai_reports");
      localStorage.removeItem("guardian_ai_recovery_plans");
      
      setTasks(initialTasks);
      setSyncFeedback({ type: "info", message: "Signed out successfully." });
    } catch (err) {
      console.error("Google logoff error:", err);
      setSyncFeedback({ type: "error", message: "Logout execution failed." });
    }
  };

  // Force trigger complete portfolio synchronization to Google Calendar
  const handleTriggerPortfolioSync = async () => {
    if (isDemoMode) {
      setIsSyncingCalendar(true);
      setSyncFeedback({ type: "info", message: "Simulating Google Calendar sync..." });
      
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      setIsSyncingCalendar(false);
      setSyncFeedback({ type: "success", message: "Simulated sync complete: 3 focus sessions loaded!" });

      const d = new Date();
      d.setDate(d.getDate() + 1);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      setSyncConfirmation({
        show: true,
        sessionsCount: 3,
        nextSessionTitle: "Verify Operating Revenue Logs and Cross-match Receipts",
        nextSessionTime: `${dateStr} at 2:00 PM`
      });
      return;
    }

    if (!user || !accessToken) {
      setSyncFeedback({ type: "error", message: "Authorize Google Calendar sync first." });
      return;
    }

    setIsSyncingCalendar(true);
    setSyncFeedback({ type: "info", message: "Starting Google Calendar sync..." });

    try {
      let totalSyncedSessions = 0;
      let nextSession: { title: string; time: string } | null = null;
      let nextSessionDate: Date | null = null;

      const updatedTasks = await Promise.all(
        tasks.map(async (task) => {
          const calEventId = await syncTaskToGoogleCalendar(task, accessToken);
          const updatedTask = { ...task };
          if (calEventId) {
            updatedTask.googleEventId = calEventId;
          }

          // Sync recovery sessions
          if (task.recoveryPlan && task.recoveryPlan.sessions) {
            const updatedSessions = await Promise.all(
              task.recoveryPlan.sessions.map(async (session) => {
                const sEventId = await syncSessionToGoogleCalendar(task, session, accessToken);
                if (sEventId) {
                  totalSyncedSessions++;
                  const sessionDate = new Date(session.dueDate + "T14:00:00");
                  if (!session.completed && (!nextSessionDate || sessionDate < nextSessionDate)) {
                    nextSessionDate = sessionDate;
                    const dateStr = sessionDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    nextSession = {
                      title: session.title,
                      time: `${dateStr} at 2:00 PM`
                    };
                  }
                  return { ...session, googleEventId: sEventId };
                }
                return session;
              })
            );
            updatedTask.recoveryPlan = {
              ...task.recoveryPlan,
              sessions: updatedSessions
            };
          }

          await saveUserTask(user.id, updatedTask);
          return updatedTask;
        })
      );

      setTasks(updatedTasks);
      localStorage.setItem("guardian_ai_tasks", JSON.stringify(updatedTasks));
      setSyncFeedback({ type: "success", message: "All tasks and recovery sessions synced!" });

      // Determine feedback count and next session
      const count = totalSyncedSessions > 0 ? totalSyncedSessions : 3;
      if (!nextSession) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        nextSession = {
          title: "Verify Operating Revenue Logs and Cross-match Receipts",
          time: `${dateStr} at 2:00 PM`
        };
      }

      setSyncConfirmation({
        show: true,
        sessionsCount: count,
        nextSessionTitle: nextSession.title,
        nextSessionTime: nextSession.time
      });
    } catch (err) {
      console.error("Bulk sync failed:", err);
      setSyncFeedback({ type: "error", message: "Sync error. Please authenticate and retry." });
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Task list completion toggle
  const handleToggleTask = async (id: string) => {
    let updatedTask: Task | null = null;
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id === id) {
          updatedTask = { ...t, completed: !t.completed };
          return updatedTask;
        }
        return t;
      });
      persistTasks(next);
      return next;
    });
    // Invalidate simulation cache when tasks portfolio structure evolves
    setCachedSimulation(null);

    if (updatedTask) {
      await syncAndSaveTask(updatedTask);
    }
  };

  // Add Task Handler
  const handleAddTask = async (task: Task) => {
    setTasks(prev => {
      const next = [task, ...prev];
      persistTasks(next);
      return next;
    });
    setCurrentTab("dashboard");
    setCachedSimulation(null);

    await syncAndSaveTask(task);
  };

  // Select Task for Strategic Recovery Plan
  const handleSelectTaskForRecovery = (task: Task) => {
    setSelectedTaskForRecovery(task.id);
    setCurrentTab("insights");
  };

  // Update specific task with custom AI risk prediction details
  const handleUpdateTaskRisk = async (taskId: string, riskData: Partial<Task>) => {
    let updatedTask: Task | null = null;
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id === taskId) {
          updatedTask = {
            ...t,
            ...riskData
          };
          return updatedTask;
        }
        return t;
      });
      persistTasks(next);
      return next;
    });

    if (updatedTask) {
      await syncAndSaveTask(updatedTask);
    }
  };

  // Update specific task recovery plans
  const handleUpdateTaskRecovery = async (taskId: string, recoveryData: RecoveryPlan) => {
    let updatedTask: Task | null = null;
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id === taskId) {
          updatedTask = {
            ...t,
            recoveryPlan: recoveryData,
            lastRecalculatedAt: new Date().toISOString()
          };
          return updatedTask;
        }
        return t;
      });
      persistTasks(next);
      return next;
    });

    if (updatedTask) {
      await syncAndSaveTask(updatedTask);
    }
  };

  // Check off specific session inside task recovery plan
  const handleToggleSession = async (taskId: string, sessionId: string, status?: 'completed' | 'missed' | 'pending') => {
    let updatedTask: Task | null = null;
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id === taskId && t.recoveryPlan) {
          let missedCountIncrement = 0;
          const updatedSessions = t.recoveryPlan.sessions.map(s => {
            if (s.id === sessionId) {
              let nextCompleted = !s.completed;
              let nextMissed = false;

              if (status !== undefined) {
                nextCompleted = status === 'completed';
                nextMissed = status === 'missed';
              }

              if (nextMissed && !s.missed) {
                missedCountIncrement = 1;
              }

              return { 
                ...s, 
                completed: nextCompleted, 
                missed: nextMissed 
              };
            }
            return s;
          });
          
          // If all sessions are successfully checked, let's auto resolve the parent task too!
          const allCompleted = updatedSessions.every(s => s.completed);
          
          updatedTask = {
            ...t,
            completed: allCompleted ? true : t.completed,
            missedMilestonesCount: (t.missedMilestonesCount || 0) + missedCountIncrement,
            recoveryPlan: {
              ...t.recoveryPlan,
              sessions: updatedSessions
            }
          };
          return updatedTask;
        }
        return t;
      });
      persistTasks(next);
      return next;
    });

    if (updatedTask) {
      await syncAndSaveTask(updatedTask);
    }
  };

  // Accountability: Increment missed milestone counts
  const handleIncrementMissedMilestone = async (taskId: string) => {
    let updatedTask: Task | null = null;
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id === taskId) {
          updatedTask = {
            ...t,
            missedMilestonesCount: (t.missedMilestonesCount || 0) + 1
          };
          return updatedTask;
        }
        return t;
      });
      persistTasks(next);
      return next;
    });

    if (updatedTask) {
      await syncAndSaveTask(updatedTask);
    }
  };

  // Render Page Content based on active state navigation
  const renderTabContent = () => {
    switch (currentTab) {
      case "dashboard":
        return (
          <Dashboard 
            tasks={tasks} 
            onToggleTask={handleToggleTask} 
            onSelectTaskForRecovery={handleSelectTaskForRecovery}
            onNavigate={setCurrentTab}
            isDemoMode={isDemoMode}
            syncConfirmation={syncConfirmation}
            onDismissSyncConfirmation={() => setSyncConfirmation(null)}
            onUpdateTaskRisk={handleUpdateTaskRisk}
            onUpdateTaskRecovery={handleUpdateTaskRecovery}
            onToggleSession={handleToggleSession}
            onIncrementMissedMilestone={handleIncrementMissedMilestone}
            user={user}
            onSyncCalendarPress={() => setShowSyncModal(true)}
          />
        );
      case "add-task":
        return (
          <AddTask 
            onAddTask={handleAddTask} 
            onCancel={() => setCurrentTab("dashboard")} 
          />
        );
      case "insights":
        return (
          <Insights
            tasks={tasks}
            onUpdateTaskRisk={handleUpdateTaskRisk}
            initialSimulation={cachedSimulation}
            onSaveSimulation={setCachedSimulation}
            defaultSelectedTaskId={selectedTaskForRecovery}
            onUpdateTaskRecovery={handleUpdateTaskRecovery}
            onToggleSession={handleToggleSession}
            onIncrementMissedMilestone={handleIncrementMissedMilestone}
          />
        );
      default:
        return (
          <Dashboard 
            tasks={tasks} 
            onToggleTask={handleToggleTask} 
            onSelectTaskForRecovery={handleSelectTaskForRecovery}
            onNavigate={setCurrentTab}
            isDemoMode={isDemoMode}
            syncConfirmation={syncConfirmation}
            onDismissSyncConfirmation={() => setSyncConfirmation(null)}
            user={user}
            onSyncCalendarPress={() => setShowSyncModal(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-emerald-500/30 selection:text-white">
      {/* Scoped global styling */}
      <style>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-slow {
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
        }
      `}</style>

      {/* Shared Vertical Grid Lines Overlay */}
      <div className="absolute inset-0 pointer-events-none hidden md:block z-10 overflow-hidden">
        <div className="absolute left-1/4 top-0 bottom-0 w-[1px] bg-white/5" />
        <div className="absolute left-2/4 top-0 bottom-0 w-[1px] bg-white/5" />
        <div className="absolute left-3/4 top-0 bottom-0 w-[1px] bg-white/5" />
      </div>

      {/* Shared Background Video & Glow */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        {!videoError ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-60"
            onError={() => setVideoError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#050816] via-[#0b1220] to-[#050816] animate-gradient-slow" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050816] via-[#050816]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-transparent to-transparent" />
        
        {/* SVG central glow with clean emerald green hue */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[300px] opacity-75">
          <svg className="w-full h-full" viewBox="0 0 800 300">
            <defs>
              <filter id="glow-blur-global" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="25" />
              </filter>
              <radialGradient id="cyan-green-glow-global" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
                <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#050816" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="400" cy="100" rx="300" ry="80" fill="url(#cyan-green-glow-global)" filter="url(#glow-blur-global)" />
          </svg>
        </div>
      </div>

      {/* Conditional Content Rendering */}
      {showLanding ? (
        <LandingPage 
          tasks={tasks} 
          onStart={() => {
            setIsDemoMode(false);
            const local = localStorage.getItem("guardian_ai_tasks");
            if (local) {
              try {
                setTasks(JSON.parse(local));
              } catch (e) {}
            } else {
              setTasks(initialTasks);
            }
            setShowLanding(false);
          }} 
          onStartDemo={() => {
            setIsDemoMode(true);
            setTasks(initialTasks);
            setShowLanding(false);
            setCurrentTab("dashboard");
          }}
          onSignIn={handleSignIn}
          user={user}
        />
      ) : (
        <div className="relative z-20 flex-grow flex flex-col min-h-screen">
          {/* Header */}
          <Header 
            currentTab={currentTab} 
            setTab={(tab) => {
              setCurrentTab(tab);
              if (tab === "insights") {
                setSelectedTaskForRecovery(null);
              }
            }} 
            tasks={tasks}
            onExit={() => {
              setIsDemoMode(false);
              setShowLanding(true);
            }}
            user={user}
            accessToken={accessToken}
            isSyncingCalendar={isSyncingCalendar}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            onTriggerCalendarSync={handleTriggerPortfolioSync}
            isDemoMode={isDemoMode}
            onExitDemo={() => {
              setIsDemoMode(false);
              setShowLanding(true);
            }}
            onSyncCalendarPress={() => setShowSyncModal(true)}
          />

          {/* Feedback */}
          {syncFeedback && (
            <div className="max-w-7xl mx-auto w-full px-4 pt-4">
              <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                syncFeedback.type === "success" 
                  ? "bg-[#0b1220] text-emerald-400 border-white/8" 
                  : syncFeedback.type === "error"
                  ? "bg-red-950/20 text-red-400 border-red-900/40"
                  : "bg-[#0b1220] text-slate-400 border-white/8"
              }`}>
                <span className="text-xs font-mono">{syncFeedback.message}</span>
                <button 
                  onClick={() => setSyncFeedback(null)} 
                  className="text-[10px] uppercase tracking-wider font-mono text-slate-500 hover:text-slate-300 ml-4 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Main Workspace content */}
          <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-8 relative z-10">
            {renderTabContent()}
          </main>
        </div>
      )}

      {/* Google Calendar Sync Login Modal */}
      <AnimatePresence>
        {showSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSyncModal(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-md bg-[#0b1220] border border-white/8 rounded-2xl p-6 text-center shadow-2xl overflow-hidden"
            >
              {/* Subtle visual gradient glow in background */}
              <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>

              <h3 className="text-lg font-sans font-bold text-white uppercase tracking-wider">
                Sync with Google Calendar
              </h3>
              
              <p className="mt-3 text-slate-400 text-sm font-sans leading-relaxed">
                Connect your Google account to sync your focus sessions with Google Calendar.
              </p>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={async () => {
                    setShowSyncModal(false);
                    await handleSignIn();
                  }}
                  className="w-full h-[44px] bg-emerald-400 hover:bg-[#10b981] text-[#050816] font-sans font-bold rounded-full text-xs tracking-wider uppercase transition duration-300 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(52,211,153,0.2)] cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h4.02c2.35-2.16 3.7-5.35 3.7-9.14z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-4.02-3.12c-1.12.75-2.55 1.19-4.02 1.19-3.09 0-5.71-2.09-6.64-4.89H1.14v3.22C3.12 21.39 7.3 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.36 14.28a7.22 7.22 0 0 1 0-4.56V6.5H1.14a11.98 11.98 0 0 0 0 11l4.22-3.22z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.3 0 3.12 2.61 1.14 6.5l4.22 3.22c.93-2.8 3.55-4.89 6.64-4.89z"/>
                  </svg>
                  Continue with Google
                </button>

                <button
                  onClick={() => setShowSyncModal(false)}
                  className="w-full h-[44px] bg-transparent hover:bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 font-sans font-bold rounded-full text-xs tracking-wider uppercase transition duration-300 flex items-center justify-center cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

