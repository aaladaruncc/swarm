"use client";

/**
 * Notification utility for browser notifications
 */

const NOTIFICATION_ENABLED_KEY = "notifications_enabled";
const LAST_CHECKED_TEST_KEY = "last_checked_test_id";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return "denied";
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission;
}

export function isNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(NOTIFICATION_ENABLED_KEY);
  return stored === "true";
}

export function setNotificationsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIFICATION_ENABLED_KEY, enabled ? "true" : "false");
}

export function sendTestNotification(): Notification | null {
  console.log("sendTestNotification called");
  
  if (!isNotificationSupported()) {
    console.error("Notifications not supported in this browser");
    return null;
  }

  const permission = Notification.permission;
  console.log("Current notification permission:", permission);

  if (permission !== "granted") {
    console.error("Notification permission not granted. Current permission:", permission);
    return null;
  }

  try {
    console.log("Creating notification...");
    
    // Use a data URL or remove icon if favicon doesn't exist
    const iconUrl = typeof window !== "undefined" && window.location.origin 
      ? `${window.location.origin}/favicon.ico`
      : undefined;

    const notificationOptions: NotificationOptions = {
      body: "This is a test notification! Your notifications are working correctly.",
      tag: "test-notification",
      requireInteraction: false,
      silent: false,
    };

    // Only add icon if we have a URL (browser will handle missing icon gracefully)
    if (iconUrl) {
      notificationOptions.icon = iconUrl;
      notificationOptions.badge = iconUrl;
    }

    const notification = new Notification("Test Notification", notificationOptions);

    console.log("Notification created successfully:", notification);
    console.log("Notification should be visible now");

    // Handle notification events
    notification.onshow = () => {
      console.log("Notification shown!");
    };

    notification.onerror = (error) => {
      console.error("Notification error:", error);
    };

    notification.onclose = () => {
      console.log("Notification closed");
    };

    // Handle notification click
    notification.onclick = (event) => {
      console.log("Notification clicked", event);
      event.preventDefault();
      window.focus();
      notification.close();
    };

    // Auto-close after 10 seconds (longer so user can see it)
    setTimeout(() => {
      notification.close();
    }, 10000);

    return notification;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
}

export function sendTestCompleteNotification(testName: string, score?: number): void {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return;
  }

  const body = score !== undefined 
    ? `Test "${testName}" completed with a score of ${score}/10`
    : `Test "${testName}" has completed`;

  const iconUrl = typeof window !== "undefined" && window.location.origin 
    ? `${window.location.origin}/favicon.ico`
    : undefined;

  const notificationOptions: NotificationOptions = {
    body,
    tag: `test-complete-${Date.now()}`,
    requireInteraction: false,
    silent: false,
  };

  if (iconUrl) {
    notificationOptions.icon = iconUrl;
    notificationOptions.badge = iconUrl;
  }

  const notification = new Notification("Test Run Complete", notificationOptions);

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  // Auto-close after 10 seconds
  setTimeout(() => {
    notification.close();
  }, 10000);
}

export function getLastCheckedTestId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_CHECKED_TEST_KEY);
}

export function setLastCheckedTestId(testId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_CHECKED_TEST_KEY, testId);
}
