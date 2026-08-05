import { io } from "socket.io-client";

let API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

if (API_URL.endsWith("/api")) {
  API_URL = API_URL.slice(0, -4);
} else if (API_URL.endsWith("/api/")) {
  API_URL = API_URL.slice(0, -5);
}

export const trackingSocket = io(`${API_URL}/tracking`, {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  forceNew: true,
  multiplex: false,
});

export const chatSocket = io(`${API_URL}/chat`, {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  forceNew: true,
  multiplex: false,
});

export const notificationSocket = io(API_URL, {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  forceNew: true,
  multiplex: false,
});
