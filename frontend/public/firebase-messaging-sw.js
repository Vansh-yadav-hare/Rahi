/* global importScripts, firebase */
// Import Firebase scripts for Service Worker compatibility mode
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

// Initialize Firebase App in service worker context
// Firebase FCM compatibility layer allows generic initialization in SW because credentials
// are linked dynamically during the client-side token request.
firebase.initializeApp({
  apiKey: true,
  projectId: true,
  messagingSenderId: true,
  appId: true,
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background message received: ", payload);

  const notificationTitle = payload.notification.title || "Rahi Alert";
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
