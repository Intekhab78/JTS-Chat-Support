/**
 * Microsoft Outlook Calendar Integration Provider Interface
 * Supports real Outlook direct event links and Microsoft Graph REST API.
 */
export class OutlookCalendarProvider {
  constructor(authConfig = {}) {
    this.authConfig = authConfig;
  }

  /**
   * Sync calendar events for a specific user
   */
  async syncMeetings(userId) {
    if (this.authConfig?.accessToken) {
      try {
        const res = await fetch("https://graph.microsoft.com/v1.0/me/events?$select=subject,bodyPreview,start,end,location&$top=50", {
          headers: { "Authorization": `Bearer ${this.authConfig.accessToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          return { success: true, syncedEventsCount: data.value?.length || 0, items: data.value || [] };
        }
      } catch (err) {
        console.error("[Outlook Calendar] Sync error:", err.message);
      }
    }
    console.log(`[Outlook Calendar] Syncing events for user: ${userId}`);
    return { success: true, syncedEventsCount: 0 };
  }

  /**
   * Create an event in Outlook Calendar (or generate a real direct calendar deep link)
   */
  async createEvent(userId, eventData) {
    const title = eventData.title || "JTS Meeting";
    const desc = eventData.description || "";
    const loc = eventData.location || "";
    const startDate = eventData.startTime ? new Date(eventData.startTime) : new Date();
    const endDate = eventData.endTime ? new Date(eventData.endTime) : new Date(startDate.getTime() + 3600000);

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // Direct Outlook Web Calendar Deep Link
    const directAddUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${startIso}&enddt=${endIso}&body=${encodeURIComponent(desc)}&location=${encodeURIComponent(loc)}`;

    if (this.authConfig?.accessToken) {
      try {
        const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.authConfig.accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            subject: title,
            body: { contentType: "text", content: desc },
            start: { dateTime: startIso, timeZone: "UTC" },
            end: { dateTime: endIso, timeZone: "UTC" },
            location: { displayName: loc }
          })
        });

        if (res.ok) {
          const data = await res.json();
          return {
            success: true,
            providerEventId: data.id,
            htmlLink: data.webLink || directAddUrl,
            directAddUrl,
            mode: "live"
          };
        }
      } catch (err) {
        console.error("[Outlook Calendar] Creation error:", err.message);
      }
    }

    return {
      success: true,
      providerEventId: `o_cal_${Date.now()}`,
      htmlLink: directAddUrl,
      directAddUrl,
      mode: "direct_link"
    };
  }

  /**
   * Update an existing event in Outlook Calendar
   */
  async updateEvent(userId, providerEventId, eventData) {
    if (this.authConfig?.accessToken && providerEventId && !providerEventId.startsWith("o_cal_")) {
      try {
        await fetch(`https://graph.microsoft.com/v1.0/me/events/${providerEventId}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${this.authConfig.accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            subject: eventData.title,
            body: { contentType: "text", content: eventData.description || "" }
          })
        });
      } catch (err) {
        console.error("[Outlook Calendar] Update error:", err.message);
      }
    }
    return { success: true };
  }

  /**
   * Delete an event in Outlook Calendar
   */
  async deleteEvent(userId, providerEventId) {
    if (this.authConfig?.accessToken && providerEventId && !providerEventId.startsWith("o_cal_")) {
      try {
        await fetch(`https://graph.microsoft.com/v1.0/me/events/${providerEventId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${this.authConfig.accessToken}` }
        });
      } catch (err) {
        console.error("[Outlook Calendar] Delete error:", err.message);
      }
    }
    return { success: true };
  }
}

