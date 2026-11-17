/**
 * Facebook Messenger Provider Adapter
 * Sends live messages via Meta Graph API when FB_PAGE_ACCESS_TOKEN is configured.
 */
export class FacebookProviderManager {
  static getProvider(provider = "meta") {
    const pageToken = process.env.FB_PAGE_ACCESS_TOKEN || "";
    const pageId = process.env.FB_PAGE_ID || "me";
    const isConfigured = Boolean(pageToken);

    return {
      isConfigured: () => isConfigured,

      sendMessage: async ({ to, message, mediaUrl }) => {
        const recipientId = String(to || "").trim();
        if (isConfigured && recipientId) {
          const endpoint = `https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}/messages?access_token=${encodeURIComponent(pageToken)}`;
          const payload = {
            recipient: { id: recipientId },
            messaging_type: "RESPONSE",
            message: mediaUrl
              ? {
                  attachment: {
                    type: "file",
                    payload: { url: mediaUrl, is_reusable: true }
                  }
                }
              : { text: String(message || "") }
          };

          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data?.error?.message || `Facebook Graph API error (${response.status})`);
          }

          return {
            success: true,
            mode: "live",
            messageId: data.message_id || `fb_msg_${Date.now()}`,
            recipientId: data.recipient_id || recipientId,
            status: "sent"
          };
        }

        console.log(`[Facebook Provider - ${provider} SIMULATED] To ${recipientId}: ${message}`);
        return {
          success: true,
          mode: "simulated",
          messageId: `fb_msg_${Date.now()}`,
          status: "sent"
        };
      }
    };
  }
}
