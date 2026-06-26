import { Task, TaskSession } from "./types";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

// Predefined Google Calendar color IDs:
// '11' (Red - High Priority)
// '5' (Yellow - Medium Priority)
// '1' (Blue - Low Priority / Personal)
// '8' (Grey - Completed Tasks)
const getColorIdForPriorityAndStatus = (priority: "low" | "medium" | "high", completed: boolean): string => {
  if (completed) return "8"; // Grey
  switch (priority) {
    case "high":
      return "11"; // Bold Red
    case "medium":
      return "5"; // Yellow
    case "low":
    default:
      return "1"; // Blue
  }
};

const getEventBody = (task: Task, isSession = false, session?: TaskSession) => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  
  if (isSession && session) {
    const startHour = 14; // Default starting at 2 PM for recovery sessions
    const endHour = Math.min(23, startHour + Math.ceil(session.durationHours || 1));
    const startISO = `${session.dueDate}T${startHour}:00:00`;
    const endISO = `${session.dueDate}T${endHour}:00:00`;

    const titlePrefix = session.completed ? "[RECOVERY DONE]" : "[RECOVERY SESSION]";
    const summary = `${titlePrefix} ${session.title}`;
    const description = `This is a high-velocity recovery session to mitigate deadline risk for parent task: "${task.title}".\nPlanned Duration: ${session.durationHours} hours.\nStatus: ${session.completed ? "Completed" : "Scheduled"}`;

    return {
      summary,
      description,
      start: { dateTime: startISO, timeZone },
      end: { dateTime: endISO, timeZone },
      colorId: session.completed ? "8" : "9", // Gray for completed, Blueberry for active session
    };
  } else {
    // Parent task deadline
    const startISO = `${task.deadline}T09:00:00`;
    const endISO = `${task.deadline}T10:00:00`;

    const titlePrefix = task.completed ? "[DEADLINE MET]" : "[DEADLINE GUARDIAN]";
    const summary = `${titlePrefix} ${task.title}`;
    const description = `${task.description || "No description provided."}\n\nPriority: ${task.priority.toUpperCase()}\nCategory: ${task.category}\n\nAI Assessment:\n- Risk Score: ${task.riskScore !== undefined ? `${task.riskScore}/100` : "Not assessed"}\n- Risk Level: ${task.riskLevel?.toUpperCase() || "N/A"}\n- Status: ${task.completed ? "Completed" : "Pending"}`;

    return {
      summary,
      description,
      start: { dateTime: startISO, timeZone },
      end: { dateTime: endISO, timeZone },
      colorId: getColorIdForPriorityAndStatus(task.priority, task.completed),
    };
  }
};

/**
 * Creates or updates a Google Calendar event for a Task.
 * Returns the googleEventId of the event (either new or existing).
 */
export const syncTaskToGoogleCalendar = async (
  task: Task,
  accessToken: string
): Promise<string | null> => {
  if (!accessToken) return null;

  const eventData = getEventBody(task, false);

  try {
    if (task.googleEventId) {
      // Try to update existing event
      const url = `${CALENDAR_API_BASE}/${task.googleEventId}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        const data = await response.json();
        return data.id;
      } else if (response.status === 404) {
        // Event was deleted in Calendar directly, so let's recreate it
        console.warn("Calendar event not found, creating a new one instead");
      } else {
        const errText = await response.text();
        console.error("Failed to update Google Calendar event:", errText);
      }
    }

    // Insert new event
    const response = await fetch(CALENDAR_API_BASE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    });

    if (response.ok) {
      const data = await response.json();
      return data.id;
    } else {
      const errText = await response.text();
      console.error("Failed to create Google Calendar event:", errText);
      return null;
    }
  } catch (error) {
    console.error("Error communicating with Google Calendar API:", error);
    return null;
  }
};

/**
 * Syncs an individual recovery plan session to the user's Google Calendar.
 * Returns the updated TaskSession with the googleEventId.
 */
export const syncSessionToGoogleCalendar = async (
  task: Task,
  session: TaskSession,
  accessToken: string
): Promise<string | null> => {
  if (!accessToken) return null;

  const eventData = getEventBody(task, true, session);

  try {
    if (session.googleEventId) {
      // Try to update existing session event
      const url = `${CALENDAR_API_BASE}/${session.googleEventId}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        const data = await response.json();
        return data.id;
      }
    }

    // Insert new session event
    const response = await fetch(CALENDAR_API_BASE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    });

    if (response.ok) {
      const data = await response.json();
      return data.id;
    } else {
      const errText = await response.text();
      console.error("Failed to create recovery session event:", errText);
      return null;
    }
  } catch (error) {
    console.error("Error creating recovery session event:", error);
    return null;
  }
};

/**
 * Removes a task event from Google Calendar if it exists.
 */
export const deleteTaskFromGoogleCalendar = async (
  googleEventId: string,
  accessToken: string
): Promise<boolean> => {
  if (!accessToken || !googleEventId) return false;

  try {
    const url = `${CALENDAR_API_BASE}/${googleEventId}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Error deleting Google Calendar event:", error);
    return false;
  }
};
