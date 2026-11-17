/**
 * Instagram Direct Messaging Provider Adapter
 * Sends live DMs via Meta Graph API when IG_ACCESS_TOKEN (or FB_PAGE_ACCESS_TOKEN + IG_ACCOUNT_ID) is configured.
 */
export class InstagramProviderManager {
  static getProvider(provider = "meta") {
    const igToken = process.env.IG_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN || "";
    const igAccountId = process.env.IG_ACCOUNT_ID || "me";
    const isConfigured = Boolean(process.env.IG_ACCESS_TOKEN || (process.env.FB_PAGE_ACCESS_TOKEN && process.env.IG_ACCOUNT_ID));

    return {
      isConfigured: () => isConfigured,

      sendMessage: async ({ to, message, mediaUrl }) => {
        const recipientId = String(to || "").trim();
        if (isConfigured && recipientId) {
          const endpoint = `https://graph.facebook.com/v21.0/${encodeURIComponent(igAccountId)}/messages?access_token=${encodeURIComponent(igToken)}`;
          const payload = {
            recipient: { id: recipientId },
            message: mediaUrl
              ? {
                  attachment: {
                    type: "image",
                    payload: { url: mediaUrl }
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
            throw new Error(data?.error?.message || `Instagram Graph API error (${response.status})`);
          }

          return {
            success: true,
            mode: "live",
            messageId: data.message_id || `ig_msg_${Date.now()}`,
            recipientId: data.recipient_id || recipientId,
            status: "sent"
          };
        }

        console.log(`[Instagram Provider - ${provider} SIMULATED] To ${recipientId}: ${message}`);
        return {
          success: true,
          mode: "simulated",
          messageId: `ig_msg_${Date.now()}`,
          status: "sent"
        };
      }
    };
  }
}
