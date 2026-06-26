import { supabase } from "./lib/supabase";
import { Task } from "./types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  table: string;
  userId: string | null;
}

const handleSupabaseError = (error: any, operationType: OperationType, table: string, userId: string | null) => {
  const errInfo: SupabaseErrorInfo = {
    error: error?.message || String(error),
    operationType,
    table,
    userId
  };
  console.error('[Supabase Error]: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

// --- Tasks Mapping ---
const mapTaskToDb = (task: Task, userId: string) => ({
  id: task.id,
  user_id: userId,
  title: task.title,
  description: task.description || "",
  deadline: task.deadline,
  estimated_hours: task.estimatedHours,
  category: task.category,
  priority: task.priority,
  completed: task.completed,
  risk_score: task.riskScore ?? null,
  risk_level: task.riskLevel ?? null,
  risk_explanation: task.riskExplanation ?? null,
  failure_probability: task.failureProbability ?? null,
  recommended_intervention: task.recommendedIntervention ?? null,
  main_risk_factors: task.mainRiskFactors || null,
  risk_factors: task.riskFactors || null,
  recovery_plan: task.recoveryPlan || null,
  missed_milestones_count: task.missedMilestonesCount ?? 0,
  last_recalculated_at: task.lastRecalculatedAt ?? null,
  google_event_id: task.googleEventId ?? null,
});

const mapDbToTask = (row: any): Task => ({
  id: row.id,
  title: row.title,
  description: row.description || "",
  deadline: row.deadline,
  estimatedHours: row.estimated_hours,
  category: row.category,
  priority: row.priority,
  completed: row.completed,
  riskScore: row.risk_score ?? undefined,
  riskLevel: row.risk_level ?? undefined,
  riskExplanation: row.risk_explanation ?? undefined,
  failureProbability: row.failure_probability ?? undefined,
  recommendedIntervention: row.recommended_intervention ?? undefined,
  mainRiskFactors: row.main_risk_factors ?? undefined,
  riskFactors: row.risk_factors ?? undefined,
  recoveryPlan: row.recovery_plan ?? undefined,
  missedMilestonesCount: row.missed_milestones_count ?? 0,
  lastRecalculatedAt: row.last_recalculated_at ?? undefined,
  googleEventId: row.google_event_id ?? undefined,
});

// --- User Profile ---
export const ensureUserProfile = async (user: any): Promise<void> => {
  if (!user) return;
  const nowISO = new Date().toISOString();
  try {
    const { data: profile, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!profile) {
      const { error: insertError } = await supabase
        .from("users")
        .insert({
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          email: user.email || "",
          photo_url: user.user_metadata?.avatar_url || "",
          created_at: nowISO,
          last_login: nowISO,
          preferences: {}
        });
      if (insertError) throw insertError;
    } else {
      const { error: updateError } = await supabase
        .from("users")
        .update({ last_login: nowISO })
        .eq("id", user.id);
      if (updateError) throw updateError;
    }
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, "users", user.id);
  }
};

// --- Tasks Core ---
export const fetchUserTasks = async (userId: string): Promise<Task[]> => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map(mapDbToTask);
  } catch (err) {
    handleSupabaseError(err, OperationType.LIST, "tasks", userId);
    return [];
  }
};

export const saveUserTask = async (userId: string, task: Task): Promise<void> => {
  try {
    const dbTask = mapTaskToDb(task, userId);
    const { error } = await supabase
      .from("tasks")
      .upsert(dbTask);

    if (error) throw error;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, "tasks", userId);
  }
};

export const deleteUserTask = async (userId: string, taskId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", userId);

    if (error) throw error;
  } catch (err) {
    handleSupabaseError(err, OperationType.DELETE, "tasks", userId);
  }
};

// --- Extra tables (Habits, Goals, AI Reports, Preferences, Recovery Plans) ---
export const fetchUserHabits = async (userId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return data || [];
  } catch (err) {
    handleSupabaseError(err, OperationType.LIST, "habits", userId);
    return [];
  }
};

export const saveUserHabit = async (userId: string, habit: any): Promise<void> => {
  try {
    const { error } = await supabase
      .from("habits")
      .upsert({ ...habit, user_id: userId });
    if (error) throw error;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, "habits", userId);
  }
};

export const deleteUserHabit = async (userId: string, habitId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("habits")
      .delete()
      .eq("id", habitId)
      .eq("user_id", userId);
    if (error) throw error;
  } catch (err) {
    handleSupabaseError(err, OperationType.DELETE, "habits", userId);
  }
};

export const fetchUserGoals = async (userId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return data || [];
  } catch (err) {
    handleSupabaseError(err, OperationType.LIST, "goals", userId);
    return [];
  }
};

export const saveUserGoal = async (userId: string, goal: any): Promise<void> => {
  try {
    const { error } = await supabase
      .from("goals")
      .upsert({ ...goal, user_id: userId });
    if (error) throw error;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, "goals", userId);
  }
};

export const deleteUserGoal = async (userId: string, goalId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", goalId)
      .eq("user_id", userId);
    if (error) throw error;
  } catch (err) {
    handleSupabaseError(err, OperationType.DELETE, "goals", userId);
  }
};

export const fetchUserPreferences = async (userId: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from("preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    handleSupabaseError(err, OperationType.GET, "preferences", userId);
    return null;
  }
};

export const saveUserPreferences = async (userId: string, preferences: any): Promise<void> => {
  try {
    const { error } = await supabase
      .from("preferences")
      .upsert({ ...preferences, user_id: userId });
    if (error) throw error;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, "preferences", userId);
  }
};

export const fetchUserAiReports = async (userId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("ai_reports")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return data || [];
  } catch (err) {
    handleSupabaseError(err, OperationType.LIST, "ai_reports", userId);
    return [];
  }
};

export const saveUserAiReport = async (userId: string, report: any): Promise<void> => {
  try {
    const { error } = await supabase
      .from("ai_reports")
      .upsert({ ...report, user_id: userId });
    if (error) throw error;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, "ai_reports", userId);
  }
};

export const fetchUserRecoveryPlans = async (userId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("recovery_plans")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return data || [];
  } catch (err) {
    handleSupabaseError(err, OperationType.LIST, "recovery_plans", userId);
    return [];
  }
};

export const saveUserRecoveryPlan = async (userId: string, plan: any): Promise<void> => {
  try {
    const { error } = await supabase
      .from("recovery_plans")
      .upsert({ ...plan, user_id: userId });
    if (error) throw error;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, "recovery_plans", userId);
  }
};
