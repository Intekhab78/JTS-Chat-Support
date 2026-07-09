/**
 * Instagram Direct Messaging Provider Adapter
 */
export class InstagramProviderManager {
  static getProvider(provider = "meta") {
    return {
      sendMessage: async ({ to, message, mediaUrl }) => {
        console.log(`[Instagram Provider - ${provider}] Sending DM to ${to}: ${message}`);
        return {
          success: true,
          messageId: `ig_msg_${Date.now()}`,
          status: "sent"
        };
      }
    };
  }
}
