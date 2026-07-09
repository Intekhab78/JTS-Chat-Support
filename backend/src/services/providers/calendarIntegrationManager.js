import { GoogleCalendarProvider } from "./googleCalendarProvider.js";
import { OutlookCalendarProvider } from "./outlookCalendarProvider.js";

/**
 * Calendar Integration Manager Factory Pattern
 */
export class CalendarIntegrationManager {
  static getProvider(providerName, authConfig = {}) {
    switch (providerName.toLowerCase()) {
      case "google":
        return new GoogleCalendarProvider(authConfig);
      case "outlook":
        return new OutlookCalendarProvider(authConfig);
      default:
        throw new Error(`Unsupported calendar provider: ${providerName}`);
    }
  }
}
