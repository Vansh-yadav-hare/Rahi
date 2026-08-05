import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import apiClient from "./services/apiClient";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Safe initialization for environments that do not support Service Workers or FCM (e.g. incognito)
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (err) {
  console.warn("Firebase Messaging is not supported in this browser environment:", err.message);
}

export { messaging };

/**
 * Request notification permission and register the FCM token with the backend user profile.
 */
export const requestAndRegisterFcmToken = async () => {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[FCM] Notification permission denied by user.");
      return null;
    }

    // Register service worker explicitly and wait until it is fully active
    let registration;
    try {
      registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      console.log("[FCM] Service worker registration initiated:", registration);

      // Wait for service worker to activate if it's currently installing
      if (registration.installing) {
        const sw = registration.installing;
        await new Promise((resolve) => {
          sw.addEventListener("statechange", () => {
            if (sw.state === "activated") {
              console.log("[FCM] Service worker state transitioned to activated.");
              resolve();
            }
          });
          // Timeout fallback in case it activates instantly
          setTimeout(resolve, 1500);
        });
      }

      // Ensure the browser registers the worker as ready
      await navigator.serviceWorker.ready;
      console.log("[FCM] Service worker is active and ready.");
    } catch (swErr) {
      console.error("[FCM] Service worker registration failed:", swErr);
    }

    // Retrieve FCM Token. VAPID key is highly recommended for modern web browsers.
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("[FCM] Token retrieved successfully:", token);
      // Register token to user profile
      await apiClient.put("/users/me", { fcmToken: token });
      console.log("[FCM] Registered token with backend user profile.");
      return token;
    } else {
      console.warn("[FCM] No registration token received from Firebase.");
    }
  } catch (error) {
    console.error("[FCM] Error occurred while obtaining registration token:", error);
  }
  return null;
};

/**
 * Register foreground message listener callback
 */
export const onForegroundMessage = (callback) => {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    console.log("[FCM] Foreground message received:", payload);
    callback(payload);
  });
};

export default app;
