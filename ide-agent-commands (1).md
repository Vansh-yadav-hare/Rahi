# RideSure — IDE Agent Command Sequence

A list of prompts to hand to an IDE coding agent (Claude Code, Cursor, etc.) one at a time, in order. Each command is scoped to a single deliverable so the agent has a clear, checkable unit of work before you move to the next one. Wait for each step to complete, review the diff, then paste the next command.

Adjust names/paths if your repo already differs, but the order (setup → frontend shell → frontend components one by one → backend piece by piece) is designed so nothing depends on something that doesn't exist yet.

**⚠️ Whenever you see a "🔑 EXTERNAL SERVICE" callout**, the agent should stop and ask you to create the account/API key and paste it into `.env` *before* it writes the integration code — not guess, invent, or hardcode a key itself. Step 0 below sets this as a standing rule so you don't have to repeat it every time.

---

## 0. Ground rule — paste this first, before anything else

```
Standing rule for this whole project: whenever a task requires a credential,
API key, or account from a third-party service (MongoDB Atlas, Redis, Razorpay,
Google Maps, Cloudinary, Firebase, AWS, or any other external provider), do NOT
generate, guess, or hardcode a placeholder key and continue. Instead, stop and
tell me exactly which service you need a key for, what to name the env variable,
and where to get it (sign-up page / dashboard section). Wait for me to paste the
real value into .env before writing the integration code that uses it. You can
still write and scaffold everything else in the meantime.
```

---

## 1. Project setup (Frontend SPA set up; Backend initialization)

```
The frontend is already set up as a standard React + JavaScript SPA using Vite, Tailwind CSS v4, and react-router-dom. Pages like Home.jsx, Search.jsx, Safety.jsx, and RideDetails.jsx have been stubbed and connected using apiClient.js (axios instance with automatic JWT header attachment).
Let's set up the backend. In backend/, initialize a Node.js + Express project with ES Modules and a single /health route that returns { status: "ok" }. Add a `.env.example` file in backend/ listing these keys with placeholder values: MONGODB_URI, REDIS_URL, JWT_SECRET, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_MAPS_API_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, CLOUDINARY_URL, FIREBASE_SERVER_KEY.
Add ESLint and Prettier configs for backend.
```

🔑 **EXTERNAL SERVICE — before continuing to step 2:**
Create your MongoDB Atlas cluster and Redis instance now, and paste `MONGODB_URI` and `REDIS_URL` into `backend/.env`. The next command needs both to actually connect.

```
In backend/, create this folder structure under src/: config/, models/, routes/,
controllers/, services/, middleware/, sockets/, utils/. Add empty index.js or
placeholder files in each so the structure is visible in git.
Create config/db.js that connects to MongoDB via Mongoose using MONGODB_URI from env.
Create config/redis.js that connects to Redis using REDIS_URL from env.
Wire both into server.js so the app fails fast with a clear error if either connection fails.
If MONGODB_URI or REDIS_URL are missing from .env, throw a clear startup error
telling me to add them rather than silently falling back to a default.
```

---

## 2. Backend — data models (do these before any routes)

```
In backend/src/models/, create a Mongoose schema for User with fields: name,
phone, email, passwordHash, oauthId, role (enum: passenger, driver, both),
profilePhoto, trustScore (default 0), isVerified (default false), timestamps.
```

```
In backend/src/models/, create a Mongoose schema for Ride with fields: driverId
(ref User), origin, destination, route, dateTime, seatsAvailable, price, status
(enum: active, completed, cancelled), timestamps.
```

```
In backend/src/models/, create a Mongoose schema for Booking with fields: rideId
(ref Ride), passengerId (ref User), seatsBooked, status (enum: pending, confirmed,
cancelled), paymentId, cancellationInfo, timestamps.
```

```
In backend/src/models/, create Mongoose schemas for: Review (rideId, fromUserId,
toUserId, rating, comment, timestamps), Payment (bookingId, amount, razorpayOrderId,
status, timestamps), Verification (userId, govIdDoc, faceMatchStatus, vehicleDocs,
status, timestamps).
```

---

## 3. Backend — auth first (everything else depends on this)

```
Implement OTP-based auth in backend/. Create POST /api/auth/otp/send that accepts
a phone number, generates a 6-digit OTP, stores it in Redis with a 5-minute TTL
keyed by phone number, and rate-limits to 1 request per phone per 60 seconds.
For now, log the OTP to the console instead of sending a real SMS — if this needs
an SMS provider (Twilio, MSG91, etc.), stop and tell me which one to sign up for
and what env var to add before wiring it in.
Create POST /api/auth/otp/verify that checks the OTP against Redis, creates or
finds the User, and returns a signed JWT.
```

🔑 **EXTERNAL SERVICE — before continuing:**
Create a Google Cloud project, enable OAuth consent + credentials, and paste `GOOGLE_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_SECRET` into `backend/.env`.

```
Implement Google OAuth login at POST /api/auth/google in backend/. Verify the
Google ID token server-side using GOOGLE_OAUTH_CLIENT_ID from env, find or create
the matching User by oauthId, and return a signed JWT in the same shape as the
OTP verify endpoint. If the env vars are missing, fail with a clear message
telling me to add them rather than skipping verification.
```

```
Create backend/src/middleware/authGuard.js — Express middleware that verifies
the JWT from the Authorization header, attaches the decoded user to req.user,
and returns 401 on missing/invalid tokens. Apply it to a new protected test
route GET /api/users/me that just returns req.user for now.
```

---

## 4. Frontend — auth integration and layout routing

```
Create/verify the app shell in frontend/src/App.jsx: using react-router-dom, add routes for
/, /search, /ride/:rideId, /booking/:bookingId, /profile, /login. 
Create a top-level layout layout containing <SiteHeader />, <Outlet /> or routes, and <SiteFooter />.
```

```
Create the Login page component in frontend/src/pages/Login.jsx. It should have a
phone number input, a "Send OTP" button that calls POST /api/auth/otp/send via apiClient,
then an OTP input and "Verify" button that calls POST /api/auth/otp/verify, stores the
returned JWT, and redirects to /. Add Google Login button calling POST /api/auth/google.
```

```
Create an AuthContext in frontend/src/features/auth/AuthContext.jsx that holds the current user
and JWT, exposes login/logout functions, and persists the JWT to local storage.
Wrap the app in this provider.
```

---

## 5. Backend — profile, rides, search (build one endpoint group at a time)

```
Implement GET and PUT /api/users/me in backend/ (protected by authGuard) to read
and update the current user's profile fields (name, email, profilePhoto).
```

🔑 **EXTERNAL SERVICE — before continuing:**
Enable the Geocoding API in your Google Cloud project and paste `GOOGLE_MAPS_API_KEY` into `backend/.env`.

```
Implement POST /api/rides in backend/ (protected, driver role only). Validate
origin and destination by geocoding them via the Google Maps Geocoding API,
using GOOGLE_MAPS_API_KEY from env, before saving. If the key is missing from
.env, stop and tell me instead of skipping validation. Create the ride in the
Ride collection with status "active".
```

```
Implement GET /api/rides/search in backend/, accepting origin, destination, and
date query params, returning matching active rides sorted by dateTime.
Implement GET /api/rides/:id returning full ride details including driver profile info.
```

---

## 6. Frontend — profile, ride creation, search integration

```
Create the Profile page in frontend/src/pages/Profile.jsx. Fetch the current
user via GET /api/users/me and render an editable form (name, email, profile
photo) that saves via PUT /api/users/me using apiClient.
```

```
Create a CreateRide form component in frontend/src/features/rides/CreateRideForm.jsx
for drivers — inputs for origin, destination, date/time, seats, price — submitting
to POST /api/rides. Show a success state with a link to the new ride's detail page (/ride/:rideId).
```

```
Integrate the Search page in frontend/src/pages/Search.jsx: read query parameters using useSearchParams, fetch matches from GET /api/rides/search using apiClient, and render RideCard components pointing to /ride/:rideId.
```

```
Integrate the RideDetails page in frontend/src/pages/RideDetails.jsx: fetch details from
GET /api/rides/:rideId using useParams and apiClient, render details, and add a "Book this ride"
button that navigates to /booking/:bookingId.
```

---

## 7. Backend — booking and payments (one endpoint at a time)

```
Implement POST /api/bookings in backend/ (protected). Use a MongoDB transaction
to atomically check seatsAvailable and decrement it while creating the Booking
document, to prevent overbooking under concurrent requests.
```

```
Implement PUT /api/bookings/:id/cancel in backend/, enforcing a cancellation
policy (e.g. no refund inside 2 hours of dateTime), updating booking status and
restoring seatsAvailable on the ride.
```

🔑 **EXTERNAL SERVICE — before continuing:**
Create a Razorpay account (test mode is fine to start), and paste `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` into `backend/.env`.

```
Implement POST /api/payments/order in backend/, creating a Razorpay order for a
given booking amount using RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET from env. Implement
POST /api/payments/verify that validates the Razorpay signature server-side and
marks the Payment and Booking as confirmed only on a valid signature. If the keys
are missing from .env, stop and tell me rather than stubbing a fake success response.
```

---

## 8. Frontend — booking and payment flow

```
Create the Booking page in frontend/src/pages/Booking.jsx: a seat-count selector,
a price summary, and a "Pay & Confirm" button that calls POST /api/bookings then
POST /api/payments/order, opens the Razorpay checkout widget (using the public
RAZORPAY_KEY_ID exposed via a frontend env var — VITE_RAZORPAY_KEY_ID in .env.local), and on success calls POST /api/payments/verify before redirecting
to a confirmation screen.
```

```
Create a MyBookings component in frontend/src/features/bookings/MyBookings.jsx listing the
current user's bookings (upcoming and past), fetched from a new
GET /api/bookings/me endpoint you should also add to the backend, with a cancel
button on upcoming bookings.
```

---

## 9. Backend — reviews and notifications

```
Implement POST /api/reviews in backend/ (protected), only allowed if the
associated ride's status is "completed" and the requesting user was a participant.
Update the target user's trustScore as a simple running average of their ratings.
```

🔑 **EXTERNAL SERVICE — before continuing:**
Create a Firebase project, enable Cloud Messaging, and paste `FIREBASE_SERVER_KEY` (or the service-account JSON, whichever the agent asks for) into `backend/.env`.

```
Add Firebase Cloud Messaging to backend/. Create a notifications service in
services/notificationService.js with a sendPush(userId, title, body) function
using FIREBASE_SERVER_KEY from env, and call it from the booking creation,
confirmation, and cancellation handlers. If the key is missing, log a warning
and skip the push rather than crashing the request.
```

---

## 10. Frontend — reviews

```
Create a ReviewForm component in frontend/src/features/reviews/ReviewForm.jsx, shown on
completed ride details/bookings, submitting rating + comment to POST /api/reviews.
Display existing reviews on the driver's public profile page.
```

---

## 11. Deploy MVP checkpoint

🔑 **EXTERNAL SERVICE — before continuing:**
Set up your AWS account/IAM user (or whichever host you choose), and have those credentials ready — the agent should ask for the exact ones it needs (e.g. `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) rather than assuming a deployment target.

```
Add a Dockerfile for backend/ and a build script for frontend/ (static export
for S3/CloudFront or a Node server for Vercel/Render — tell me which target
you're deploying to and generate the matching config). Add a GitHub Actions
workflow that runs lint and tests on every PR. If any deployment step needs
credentials or secrets, list exactly which ones and where I should generate
them (e.g. AWS IAM console) instead of assuming defaults.
```

---

## 12. Phase 2 — safety features (one endpoint/component pair at a time)

Repeat the same pattern for each feature — backend endpoint first, then the matching frontend piece:

🔑 **EXTERNAL SERVICE — before continuing:**
Create a Cloudinary account and paste `CLOUDINARY_URL` (or `CLOUDINARY_CLOUD_NAME`/`API_KEY`/`API_SECRET`) into `backend/.env`.

```
Implement POST /api/verification/id in backend/: accept a document upload,
store it via Cloudinary using CLOUDINARY_URL from env, create a Verification
record with status "pending". If the Cloudinary env vars are missing, stop and
tell me before implementing the upload.
```
```
Create a VerificationUpload page in frontend/ for submitting ID documents and
showing verification status (pending/approved/rejected).
```
```
Implement POST /api/verification/face in backend/ for selfie-match verification.
Face-matching typically needs a dedicated vendor (e.g. AWS Rekognition, a KYC
API) — before writing this, tell me which provider to sign up for and what env
var to add, then wire it in once I've pasted the key.
```
```
Set up a Socket.IO server in backend/src/sockets/tracking.js: a per-ride room
where the driver emits location updates and passengers in that ride's booking
receive them. This uses the same GOOGLE_MAPS_API_KEY already in .env — no new key needed.
```
```
Create a LiveTrackingMap component in frontend/ using the Google Maps JS SDK
that joins the ride's socket room and renders the driver's live position.
This needs VITE_GOOGLE_MAPS_API_KEY exposed as a frontend env var.
```
```
Set up a chat namespace in backend/src/sockets/chat.js, persisting messages to
the Message collection, and create a ChatWindow component in frontend/ for the
ride details page. No new external service needed here.
```
```
Implement POST /api/sos in backend/, logging to sos_alerts and notifying the
user's pre-registered emergency contacts via SMS/push. If SMS is needed and no
provider is configured yet, tell me which one to sign up for and what env var
to add. Create an SOSButton component in frontend/ visible during an active ride.
```

---

## How to use this file

- Paste one code block at a time as a prompt to your IDE agent.
- Review and test the diff before moving to the next command — each step assumes the previous one is merged.
- Whenever a 🔑 callout appears before a command, do that setup step and add the key to `.env` before pasting the command below it — this is what keeps the agent from guessing or hardcoding a fake credential.
- If the agent's output drifts from the schema/route names used in earlier steps, correct it before continuing, since later prompts reference these names directly (e.g. `req.user`, `/api/rides/:id`, the `Booking` model).
- Phases 3–5 (AI trust score, premium safety, full AI platform) aren't broken into commands here since they depend on real usage data from the MVP — revisit this file once Phase 1–2 are live and I can generate that section next.
