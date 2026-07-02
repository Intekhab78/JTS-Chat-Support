/**
 * SMS Provider Abstraction Adapter
 * Standardizes SMS messaging (Twilio, BulkSMS, etc.)
 */
export class SMSProviderManager {
  static getProvider(provider = "twilio") {
    return {
      sendSMS: async ({ to, body, type = "transactional" }) => {
        console.log(`[SMS Provider - ${provider}] Sending ${type} SMS to ${to}: ${body}`);
        return {
          success: true,
          messageId: `sms_msg_${Date.now()}`,
          status: "delivered"
        };
      }
    };
  }
}
