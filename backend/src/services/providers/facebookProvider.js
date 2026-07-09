/**
 * Facebook Messenger Provider Adapter
 */
export class FacebookProviderManager {
  static getProvider(provider = "meta") {
    return {
      sendMessage: async ({ to, message, mediaUrl }) => {
        console.log(`[Facebook Provider - ${provider}] Sending Messenger message to ${to}: ${message}`);
        return {
          success: true,
          messageId: `fb_msg_${Date.now()}`,
          status: "sent"
        };
      }
    };
  }
}
