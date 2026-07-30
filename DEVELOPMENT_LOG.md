# Rahi — Development & Architectural Decision Log

This log documents the directory structures, files, configurations, and core architectural choices made during the development of Rahi.

---

## 📅 Log Entry: July 28, 2026 (Monorepo Scaffolding & Setup)

### 1. Global Setup
* **Files Created:**
  * [.gitignore](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/.gitignore) - Root-level ignore configurations mapping standard Node/Vite build patterns, node modules, and environment profiles (`.env`, `*.env`).
  * [.vscode/settings.json](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/.vscode/settings.json) - Disables CSS syntax warning alerts for unknown at-rules like `@tailwind` to clean up the developer workspace.

### 2. Frontend Scaffolding (`frontend/`)
* **Framework/Tools:** React v19, Vite v8, Tailwind CSS v3, ESLint v9 (Flat Config), Prettier.
* **Files Created/Modified:**
  * [eslint.config.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/frontend/eslint.config.js) & [.prettierrc](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/frontend/.prettierrc) - Linter configs styled for ES Modules and React JSX styling.
  * [src/App.jsx](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/frontend/src/App.jsx) - Main entry page refactored to render a beautiful dark-mode Tailwind CSS dashboard.
  * [src/services/apiClient.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/frontend/src/services/apiClient.js) - Axiom API client. Uses `import.meta.env.VITE_API_URL` to define base server route, and contains an interceptor to pull JWT `token` from `localStorage` and inject it as `Bearer` token inside the `Authorization` header.
  * Placeholders created under `components/`, `pages/`, `features/`, and `hooks/`.

---

## 📅 Log Entry: July 28, 2026 (Backend Setup & Database Connectivity)

### 1. Backend Foundation (`backend/`)
* **Framework/Tools:** Node.js, Express, CORS, Dotenv, Mongoose, Redis.
* **Files Created:**
  * [package.json](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/package.json) - Node package setup. Main points to `src/server.js`.
  * [eslint.config.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/eslint.config.js) & [.prettierrc](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/.prettierrc) - Flat ESLint configuration.
  * [.env.example](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/.env.example) - Documented keys for MongoDB, Redis, JWT, Google Cloud, Razorpay, Cloudinary, and Firebase.
  * [.env](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/.env) - Local config holds MongoDB Atlas URI and Upstash Redis URL.

### 2. Connection Clients & Startup Fail-Fast
* **Files Created/Modified:**
  * [src/config/env.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/config/env.js) - Validates presence of critical variables (`MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`) immediately on start. If missing, it terminates process execution with an error, preventing silent connection fallback errors.
  * [src/config/db.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/config/db.js) - Establishes Mongoose database connection client.
  * [src/config/redis.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/config/redis.js) - Configures Upstash Redis Client with connection retry limit constraints to force-fail if the host is down.
  * [src/server.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/server.js) - Express instance. Performs DB/Redis asynchronous connections resolving before listening on PORT 5000. Features a `/health` route.

---

## 📅 Log Entry: July 28, 2026 (Backend Database Models)

To support platform listings, bookings, reviews, payments, and verifications, we registered the following models inside [backend/src/models/](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/models):
* [User.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/models/User.js) - Stores profiles. Uses `unique` + `sparse: true` options for `phone`, `email`, and `oauthId` to prevent index conflicts on unregistered properties. Sets role enums to `passenger`, `driver`, `both` (default: `passenger`).
* [Ride.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/models/Ride.js) - Stores driver ride offers. References `User`. Includes status constraints: `active`, `completed`, `cancelled`.
* [Booking.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/models/Booking.js) - Manages ride bookings. Stores seat counts, cancellation info, status (`pending`, `confirmed`, `cancelled`), and payment gateway transaction references.
* [Review.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/models/Review.js) - Stores ride ratings. References two user fields (`fromUserId` and `toUserId`) to distinguish reviews. Enforces numeric rating validation constraints between `1` and `5`.
* [Payment.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/models/Payment.js) - Manages transaction flows. Links to `Booking`, saves Razorpay order IDs, and maps payment statuses (`pending`, `completed`, `failed`, `refunded`).
* [Verification.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/models/Verification.js) - Tracks user trust/kyc validations. Documents Cloudinary paths, vehicle details (models, license plates), face match validation status, and overall KYC approval status.

---

## 📅 Log Entry: July 28, 2026 (OTP Verification & Google OAuth Setup)

### 1. OTP Authentication
* **Files Created/Modified:**
  * [src/controllers/authController.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/controllers/authController.js) (Handlers: `sendOTP`, `verifyOTP`):
    * `sendOTP`: Generates 6-digit numeric OTP. Caches in Redis (`otp:<phone>`) for 5 minutes. Creates a 60-second cooldown rate limit key (`otp:rate:<phone>`) returning `429` on double requests. Logs OTP to console.
    * `verifyOTP`: Matches OTP against Redis, deletes cached entry, finds or registers new user in MongoDB, and signs a 7-day JWT.
    * *Default name naming convention*: For OTP-only register users (who have no name profile property initially), we default name to `User_<last_4_digits>` (e.g. `User_8901`) to satisfy MongoDB schema validation constraints.
  * [src/routes/authRoutes.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/routes/authRoutes.js) - Registers endpoints `/otp/send` and `/otp/verify`.

### 2. Google OAuth Integration
* **Files Modified:**
  * [src/controllers/authController.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/controllers/authController.js) (Handler: `googleLogin`):
    * Decrypts and validates Google ID token against `GOOGLE_OAUTH_CLIENT_ID` using `google-auth-library`.
    * Checks if a user already exists with matching `oauthId`.
    * If not found, searches by email. If email matches, it links the Google account automatically by appending the `oauthId` and `profilePhoto` fields.
    * If no account exists, it registers a new passenger profile.
    * Returns user details and signs a 7-day session JWT token.
  * [src/routes/authRoutes.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/routes/authRoutes.js) - Exposes POST endpoint `/google`.

### 3. AuthGuard Middleware & Profiles Route
* **Files Created/Modified:**
  * [src/middleware/authGuard.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/middleware/authGuard.js) - Inspects authorization headers, validates JWT using `process.env.JWT_SECRET`, queries user, strips password properties, and assigns the user profile to `req.user`. Returns `401 Unauthorized` for missing/invalid keys.
  * [src/routes/userRoutes.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/routes/userRoutes.js) - Exposes protected GET path `/me` returns authenticated profile.
  * [src/server.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/server.js) - Wired `/api/users` routes mapping.

---

## 📅 Log Entry: July 29, 2026 (Frontend Router & Layout App Shell)

* **Framework/Tools:** `react-router-dom`, Apple Glass UI components.
* **Files Created/Modified:**
  * [index.css](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/frontend/src/index.css) - Loaded Google Fonts (Fraunces & Inter) and set up radial gradient mesh background. Configured Tailwind classes for `.glass-card`, `.glass-input`, and `.glass-button` in accordance with the Apple Glass design spec.
  * [components/Layout.jsx](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/frontend/src/components/Layout.jsx) - Main Layout component providing navigation bar, dynamic user profile/login button, dynamic logout redirect handlers, and rendering content Outlet.
  * Pages created under [pages/](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/frontend/src/pages):
    * `Home.jsx` - Landing screen introducing key safety/trust score features.
    * `Search.jsx` - Ride search form.
    * `RideDetails.jsx` - Displays active ride details and links to booking.
    * `Booking.jsx` - Seat counts selector, total cost calculator, and payment gateways redirect.
    * `Profile.jsx` - Profile information display with badge statuses.
    * `Login.jsx` - Form layout mapping OTP input and Google OAuth triggers.
  * [App.jsx](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/frontend/src/App.jsx) - Initialized React Router via `createBrowserRouter` mapping child views within the Layout shell, mounting it with `<RouterProvider />`.
  * Deleted legacy page placeholders.

---

## 📅 Log Entry: July 29, 2026 (Frontend Login page with OTP Flow)

* **Framework/Tools:** Axios client request handling, React local state forms.
* **Files Modified:**
  * [pages/Login.jsx](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/frontend/src/pages/Login.jsx) - Implemented two-step form flow. Step 1 collects user's phone number and hits `/api/auth/otp/send`. Step 2 collects the 6-digit OTP code and calls `/api/auth/otp/verify`. On success, stores JWT token and user profile object in `localStorage` and redirects to the landing page (`/`). Integrates loader animation spinners on submit buttons and displays styled error/success alert banners.

---

## 📅 Log Entry: July 29, 2026 (Frontend Central AuthContext)

* **Framework/Tools:** React Context API, Axios request interceptors synchronization.
* **Files Created/Modified:**
  * [features/auth/AuthContext.jsx](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/frontend/src/features/auth/AuthContext.jsx) - Implemented `AuthProvider` and `useAuth` hook. Verifies session token on boot via `/api/users/me` and resets `localStorage` if expired.
  * [App.jsx](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/frontend/src/App.jsx) - Wrapped `<RouterProvider />` inside `<AuthProvider>`.
  * [components/Layout.jsx](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/frontend/src/components/Layout.jsx) - Refactored logout handlers and login indicators to pull from `useAuth()`.
  * [pages/Login.jsx](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/frontend/src/pages/Login.jsx) - Updated verification success logic to trigger context `login(token, user)`, making window reload redirections obsolete.

---

## 📅 Log Entry: July 29, 2026 (Backend User Profile Endpoints)

* **Framework/Tools:** Express controllers routing, MongoDB findOneAndUpdate validation schemas.
* **Files Created/Modified:**
  * [controllers/userController.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/controllers/userController.js) - Created profile handlers. `getProfile` returns active session details. `updateProfile` updates name/email/profile photo, checks for email duplicate conflicts across other accounts, and saves changes.
  * [routes/userRoutes.js](file:///c:/Users/vy111/OneDrive/Desktop/Rahi/backend/src/routes/userRoutes.js) - Routed `GET /me` and `PUT /me` protected by `authGuard` using the new profile controller handlers.

---




