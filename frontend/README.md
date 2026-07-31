# RideSure Frontend Setup & Connection Guide

This directory contains the client-side single page application (SPA) built using **React**, **Vite**, and **Tailwind CSS v4**.

---

## 🚀 Local Development Setup

To run the frontend locally, follow these steps:

### 1. Install Dependencies
Navigate into the `frontend` directory and install the packages:
```bash
cd frontend
npm install
```

### 2. Configure Environment Variables
Copy the example environment file and set the backend API address:
```bash
cp .env.example .env.local
```
Inside `.env.local`, specify your backend server URL (the default is port `5000`):
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run the Development Server
Start the Vite local development server:
```bash
npm run dev
```
The application will boot up at **[http://localhost:5173](http://localhost:5173)**.

### 4. Build for Production
To bundle and optimize the application for deployment (outputs static files to the `dist/` directory):
```bash
npm run build
```

---

## 🔌 Connecting to the Backend

### 1. API Client (`src/services/apiClient.js`)
All communication with the Node.js + Express backend is handled via the configured [apiClient.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/frontend/src/services/apiClient.js). 

This client:
- Automatically reads the base backend endpoint from your `VITE_API_URL` environment variable.
- Uses an request interceptor to fetch the JWT auth token from `localStorage` (`token`) and inject it as a `Bearer` token inside the `Authorization` header for protected endpoints:
```javascript
// Example API call inside a component
import apiClient from "@/services/apiClient";

const fetchUserProfile = async () => {
  try {
    const response = await apiClient.get("/users/me");
    return response.data;
  } catch (error) {
    console.error("Failed to load profile", error);
  }
};
```

### 2. Handling CORS (Cross-Origin Resource Sharing)
By default, the frontend running on port `5173` will make calls to the backend on port `5000`. To prevent CORS blockers:
- **Backend Configuration**: Ensure the backend Express app uses the `cors` middleware configured to allow requests from your frontend source (e.g., `http://localhost:5173`).
- **Proxy Configuration (Alternative)**: You can set up a Vite proxy inside [vite.config.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/frontend/vite.config.js) to route frontend requests through port `5173` directly to port `5000`:
  ```javascript
  // Add to defineConfig in vite.config.js:
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    }
  }
  ```
