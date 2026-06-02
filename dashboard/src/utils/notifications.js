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

    const notification = new Notification(title, {
      body,
      icon: "/favicon.ico", // Ensure this exists or use a generic icon
      ...options
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};
