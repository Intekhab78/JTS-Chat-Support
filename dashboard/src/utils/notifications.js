export const NotificationService = {
  async requestPermission() {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  },

  async notify(title, body, options = {}) {
    if (Notification.permission !== "granted") return;
    
    // Don't notify if tab is focused (optional, but professional)
    if (document.visibilityState === "visible" && !options.force) return;

    const notification = new Notification("JTS Chat Dashboard", {
      body: `${title}\n${body}`,
      icon: "/favicon.ico",
      tag: options.tag || "jts-chat-notification",
      ...options
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};
