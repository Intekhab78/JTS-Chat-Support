/**
 * Google Calendar Integration Provider Interface (Architecture Only)
 */
export class GoogleCalendarProvider {
  constructor(authConfig = {}) {
    this.authConfig = authConfig;
  }

  /**
   * Sync calendar events for a specific user
   */
  async syncMeetings(userId) {
    console.log(`[Google Calendar] Syncing events for user: ${userId}`);
    return { success: true, syncedEventsCount: 0 };
  }

  /**
   * Create an event in Google Calendar
   */
  async createEvent(userId, eventData) {
    console.log(`[Google Calendar] Creating event for user ${userId}: ${eventData.title}`);
    return {
      success: true,
      providerEventId: `g_cal_evt_${Date.now()}`,
      htmlLink: "https://calendar.google.com/mock"
    };
  }

  /**
   * Update an existing event in Google Calendar
   */
  async updateEvent(userId, providerEventId, eventData) {
    console.log(`[Google Calendar] Updating event ${providerEventId} for user ${userId}`);
    return { success: true };
  }

  /**
   * Delete an event in Google Calendar
   */
  async deleteEvent(userId, providerEventId) {
    console.log(`[Google Calendar] Deleting event ${providerEventId} for user ${userId}`);
    return { success: true };
  }
}
