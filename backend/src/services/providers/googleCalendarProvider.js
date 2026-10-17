/**
 * Google Calendar Integration Provider Interface
 * Supports real Google Calendar direct event URLs and Google Calendar v3 REST API.
 */
export class GoogleCalendarProvider {
  constructor(authConfig = {}) {
    this.authConfig = authConfig;
  }

  /**
   * Sync calendar events for a specific user
   */
  async syncMeetings(userId) {
    if (this.authConfig?.accessToken) {
      try {
        const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=50&orderBy=startTime&singleEvents=true", {
          headers: { "Authorization": `Bearer ${this.authConfig.accessToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          return { success: true, syncedEventsCount: data.items?.length || 0, items: data.items || [] };
        }
      } catch (err) {
        console.error("[Google Calendar] Sync error:", err.message);
      }
    }
    console.log(`[Google Calendar] Syncing events for user: ${userId}`);
    return { success: true, syncedEventsCount: 0 };
  }

  /**
   * Create an event in Google Calendar (or generate a real direct calendar deep link)
   */
  async createEvent(userId, eventData) {
    const title = eventData.title || "JTS Meeting";
    const desc = eventData.description || "";
    const loc = eventData.location || "";
    const startDate = eventData.startTime ? new Date(eventData.startTime) : new Date();
    const endDate = eventData.endTime ? new Date(eventData.endTime) : new Date(startDate.getTime() + 3600000);

    const formatGDate = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const dateRange = `${formatGDate(startDate)}/${formatGDate(endDate)}`;

    // Real, instantly clickable Google Calendar Web Link
    const directAddUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dateRange}&details=${encodeURIComponent(desc)}&location=${encodeURIComponent(loc)}`;

    if (this.authConfig?.accessToken) {
      try {
        const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.authConfig.accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            summary: title,
            description: desc,
            location: loc,
            start: { dateTime: startDate.toISOString() },
            end: { dateTime: endDate.toISOString() }
          })
        });

        if (res.ok) {
          const data = await res.json();
          return {
            success: true,
            providerEventId: data.id,
            htmlLink: data.htmlLink || directAddUrl,
            directAddUrl,
            mode: "live"
          };
        }
      } catch (err) {
        console.error("[Google Calendar] Event creation error:", err.message);
      }
    }

    return {
      success: true,
      providerEventId: `g_cal_${Date.now()}`,
      htmlLink: directAddUrl,
      directAddUrl,
      mode: "direct_link"
    };
  }

  /**
   * Update an existing event in Google Calendar
   */
  async updateEvent(userId, providerEventId, eventData) {
    if (this.authConfig?.accessToken && providerEventId && !providerEventId.startsWith("g_cal_")) {
      try {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${providerEventId}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${this.authConfig.accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            summary: eventData.title,
            description: eventData.description
          })
        });
      } catch (err) {
        console.error("[Google Calendar] Update error:", err.message);
      }
    }
    return { success: true };
  }

  /**
   * Delete an event in Google Calendar
   */
  async deleteEvent(userId, providerEventId) {
    if (this.authConfig?.accessToken && providerEventId && !providerEventId.startsWith("g_cal_")) {
      try {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${providerEventId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${this.authConfig.accessToken}` }
        });
      } catch (err) {
        console.error("[Google Calendar] Delete error:", err.message);
      }
    }
    return { success: true };
  }
}

