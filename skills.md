# RideSure — Development Flow & Skills Guide

This document expands the RideSure build plan into a detailed, dependency-ordered execution flow. For each phase: what to build, why it comes at that point, how the pieces connect, and what skills/tools you need to pull it off.

---

## Phase 0 — Environment & Foundation

**Goal:** Get a working skeleton in place so every later phase has solid ground to build on. Skipping or rushing this phase is the most common cause of painful rework later (mismatched configs, missing env vars, inconsistent folder conventions across contributors).

1. **Create the GitHub repo** with `frontend/` and `backend/` top-level folders. Set branch protection early (e.g. require PRs into `main`) even if you're a solo dev — it forces good commit hygiene from day one.
2. **Scaffold the backend** with Node.js + Express. Add a `/health` route that returns a 200 with a simple JSON payload (`{status: "ok"}`) — this becomes your first deployment smoke test and your uptime monitor's ping target later.
3. **Scaffold the frontend** with a React app via Vite, then wire up Tailwind CSS. Vite over CRA for faster dev builds and HMR. Confirm Tailwind's JIT compiler is picking up your component classes before writing any real UI.
4. **Provision MongoDB Atlas** and connect it through Mongoose from a dedicated `config/db.js`. Use a free-tier cluster for dev, and set IP allowlisting properly — don't leave it open to `0.0.0.0/0` even in dev if you can avoid it.
5. **Stand up Redis** — Docker container locally, managed instance (e.g. Redis Cloud or AWS ElastiCache) for prod. You won't use it heavily until Phase 1's auth/session work and Phase 2's rate limiting, but configuring the connection now avoids scrambling later.
6. **Create third-party accounts**: Google Cloud (for Maps APIs — enable Geocoding, Directions, and Places APIs specifically), Razorpay (start in test mode), Cloudinary, Firebase (enable Cloud Messaging), and AWS (set up IAM users with scoped permissions rather than using root credentials).
7. **Add `.env` and `.env.example`** — the example file should list every key name with a placeholder value so any new contributor knows exactly what to fill in. Never commit real `.env` files; add it to `.gitignore` immediately.
8. **Set up ESLint + Prettier** on both frontend and backend, with a shared config if possible, so code style doesn't drift between the two codebases.
9. **Lay out the folder skeleton**:
   - Backend: `config/` (db, redis, firebase, cloudinary connection setup), `models/` (Mongoose schemas), `routes/` (route definitions only — no logic), `controllers/` (request handling), `services/` (business logic, external API calls), `middleware/` (auth guards, error handling, rate limiting), `sockets/` (Socket.IO handlers), `utils/` (OTP generation, JWT helpers, validators).
   - Frontend: `components/` (shared, reusable UI), `pages/` (route-level views — Home, Search, RideDetails, Booking, Profile), `features/` (state + API logic grouped by domain: auth, rides, bookings), `hooks/` (custom React hooks), `services/` (API client, socket client).

**Why this structure matters:** keeping routes thin and pushing logic into `services/` means your business logic is testable independently of HTTP, and reusable later when you add the AI service calls in Phase 3.

**Skills needed:** Git/GitHub workflow, Express fundamentals, Mongoose schema basics, Vite + Tailwind configuration, environment/secrets management, basic AWS IAM.

---

## Phase 1 — MVP

**Goal:** A complete, working loop a real user could go through end to end: sign up → list or search a ride → book it → pay → leave a review. Build in dependency order, not checklist order — each numbered step below assumes the previous one is done.

1. **Auth first** — OTP login (phone-based, typically via an SMS provider or Firebase Auth) plus Google OAuth. Every other feature needs a logged-in user, so this has to exist before anything else is meaningful to build. Store hashed OTPs (never plaintext) with a short TTL in Redis, and rate-limit OTP requests per phone number to prevent abuse.
2. **User model & profile** — build out the `users` collection (name, phone/email, password/oauthId, role, profilePhoto, trustScore, isVerified) and the `GET/PUT /api/users/me` endpoints. Both drivers and passengers use the same user model with a `role` field, so decide early whether a single account can be both.
3. **Ride creation (driver side)** — `POST /api/rides`, backed by the `rides` collection (driverId, origin, destination, route, dateTime, seatsAvailable, price, status). Validate that origin/destination resolve to real places via the Google Maps Geocoding API before saving — this prevents garbage data from breaking search later.
4. **Ride search (passenger side)** — `GET /api/rides/search` filtered by route and date, plus `GET /api/rides/:id` for the details page. Start with simple exact/nearby-route matching; you'll revisit this with smarter matching in Phase 3.
5. **Booking flow** — `POST /api/bookings` (decrement `seatsAvailable` atomically to avoid race conditions on popular rides) and `PUT /api/bookings/:id/cancel` (with a defined cancellation window/policy). Tie both to the `bookings` collection.
6. **Payments** — Razorpay order creation (`POST /api/payments/order`) followed by payment verification (`POST /api/payments/verify`, checking the Razorpay signature server-side — never trust the client's "payment succeeded" claim alone). Log every transaction in the `payments` collection with status tracking.
7. **Reviews** — `POST /api/reviews`, only enabled after a ride's status flips to completed, tied to the `reviews` collection (rideId, fromUserId, toUserId, rating, comment). This data becomes the seed for the trust score in Phase 3.
8. **Notifications** — Firebase push for booking created, confirmed, and cancelled events. Wire this in last since it's additive — the core flow works without it, but users expect it.
9. **Deploy to staging on AWS** once the full loop works locally end to end. Use this deployment to catch environment-specific bugs (CORS, env var mismatches, cold-start issues) before Phase 2 adds real-time features that are harder to debug in production.

**Skills needed:** REST API design, MongoDB/Mongoose schema design, transaction-safe booking logic, Razorpay integration and signature verification, Firebase Cloud Messaging, basic AWS deployment (EC2/ECS/Elastic Beanstalk).

---

## Phase 2 — Verification, Tracking, Chat & Safety

**Goal:** This is where RideSure differentiates itself — layering trust and real-time safety on top of the working MVP. Nothing here works without Phase 1's user and ride models already in place.

1. **Government ID verification** — `POST /api/verification/id`. Documents upload to Cloudinary (never store raw ID images in your own database), with the verification record tracked in the `verifications` collection (userId, govIdDoc, status). Decide early whether verification is manual (admin review queue) or automated (third-party KYC API) — this materially changes the implementation.
2. **Face verification** — `POST /api/verification/face`, a selfie-match step compared against the submitted ID. This typically needs a specialized face-matching API/SDK rather than building matching from scratch; factor that vendor choice in before writing this endpoint.
3. **Vehicle document verification** — extend the same verification pipeline for drivers' vehicle documents (registration, insurance), reusing the `verifications` collection with a document-type distinction.
4. **Live trip tracking** — a Socket.IO room scoped per active ride, where the driver's client emits periodic location updates and subscribed passengers receive them. Combine with Google Maps for rendering the live position on a route. Throttle emit frequency (e.g. every 5–10 seconds) to avoid flooding the socket connection and draining the driver's battery.
5. **In-app chat** — Socket.IO events for driver↔passenger messaging within a ride's room, persisted to the `messages` collection so history survives reconnects. Consider a simple profanity/abuse filter here since this is a safety-sensitive surface.
6. **Emergency SOS** — `POST /api/sos`, logging to `sos_alerts` (userId, rideId, location, timestamp, contactsNotified) and immediately notifying the rider's pre-registered emergency contacts (SMS/push). This endpoint needs to be fast and fail-safe — minimize dependencies on the request path so it can't silently fail under load.
7. **Masked calling** — integrate a telephony provider (e.g. Twilio-style proxy numbers) so driver and passenger can call each other without either party seeing the other's real phone number.

**Skills needed:** Socket.IO room/event design, identity-verification UX and vendor evaluation, Cloudinary upload pipelines, real-time geolocation handling, telephony API integration.

---

## Phase 3 — AI Trust Score & Matching

**Goal:** Add intelligence layered on top of the data that Phases 1–2 have been accumulating (ratings, verification status, ride history, cancellations). None of this phase is possible without that historical data existing first.

1. **AI trust score model** — combine verification completeness, average rating, ride history length, and cancellation rate into a single composite score per user. Start with a transparent, rules-based weighted formula before reaching for a trained model — it's easier to explain to users and debug.
2. **Cancellation risk prediction** — flag bookings/rides statistically likely to be cancelled, using historical patterns (time-to-ride-date, user's past cancellation rate, etc.), so you can proactively notify affected passengers or suggest backup rides.
3. **Intelligent route matching** — move search beyond exact origin/destination matches to consider partial route overlaps and nearby waypoints, so a passenger searching A→C can also see a driver going A→B→C.
4. **Smart pickup point suggestions** — given a driver's route, suggest a small set of sensible pickup points along it rather than requiring an exact address match, reducing detours.
5. **AI chatbot** — first-line customer support for common questions (booking status, cancellation policy, how verification works), escalating to a human for anything outside its confidence.
6. **Fraud detection** — anomaly detection on profile creation patterns and payment behavior (e.g. many accounts from one device, unusual payment retry patterns) to catch abuse before it scales.

**Skills needed:** basic scoring/ML model design (rules-based v1 before ML v2), recommendation and matching logic, anomaly detection, LLM-based chatbot integration and prompt design.

---

## Phase 4 — Premium Safety & Women-First Options

**Goal:** Differentiated, premium safety features that build directly on Phase 2's verification/tracking infrastructure and Phase 3's trust score.

1. **Women-only ride toggle** — a filter on both ride creation and search, gated by a verified gender field, surfaced clearly in the UI so passengers can filter results.
2. **Family live-tracking share links** — a read-only, expiring link (no login required) that renders the same live tracking view from Phase 2 for a trusted contact who isn't a platform user.
3. **Reliability badges** — visual badges on driver/passenger profiles derived from thresholds on the Phase 3 trust score (e.g. "Top Rated," "Verified Pro").
4. **Ride insurance option at checkout** — an add-on line item in the Phase 1 payments flow, likely requiring a third-party insurance API integration.
5. **Lost & found reporting system** — a simple reporting form tied to a completed ride, routed to an admin queue or directly connecting the two parties via masked calling/chat.

**Skills needed:** feature flagging, shareable read-only/expiring links, insurance API integration, admin tooling for reports.

---

## Phase 5 — Full AI-Powered Mobility Platform

**Goal:** Scale RideSure from a ride-matching app into a broader mobility platform. This phase is the most speculative and benefits from having real usage data from Phases 1–4 to validate against.

1. **Demand prediction for driver supply** — forecast where and when more drivers are needed based on historical search-vs-availability gaps, to power incentive campaigns.
2. **Multi-stop route optimization** — for carpool-style rides with several passengers, optimize pickup/drop-off order to minimize total detour time.
3. **Personalized ride recommendations** — surface rides based on a user's history (frequent routes, preferred departure times, preferred driver ratings).
4. **Multilingual chat translation** — extend the Phase 2 chat feature with real-time translation so driver and passenger can converse across languages.
5. **Student/community verification tiers** — extend the Phase 2 verification flow with additional tiers (e.g. student ID, employer ID) that unlock community-specific ride pools.
6. **Corporate carpool accounts and billing** — B2B accounts with centralized billing for employee commute programs.
7. **Carbon footprint tracking and rewards** — estimate emissions saved per shared ride and gamify it with a rewards system.

**Skills needed:** forecasting/time-series models, multi-stop route optimization algorithms (e.g. variants of the vehicle routing problem), translation API integration, B2B billing and invoicing flows.

---

## Testing & Launch Checklist (ongoing, not a separate phase)

Run these continuously as each phase lands — don't save them all for the end:

- **Unit tests** for auth, booking, and payment logic — these are the modules where bugs are costliest.
- **End-to-end test** of the full search → book → pay → rate flow, re-run after every phase touches that path.
- **Load test** ride search under concurrent users, since search is the highest-traffic read path.
- **Security review** of ID/verification data storage — this is sensitive personal data and deserves its own audit pass, not just general code review.
- **Verify the SOS flow** with real device GPS, not just simulated coordinates, before trusting it in production.
- **Confirm compliance** with local ride-hailing/KYC regulations relevant to your launch region.
- **Set up AWS monitoring/alerting** (CloudWatch or equivalent) before public launch, so you find out about failures before your users do.

---

*Source: derived from the RideSure Build Guide v1.0, reorganized into a dependency-ordered execution flow with added implementation detail and the skills each phase requires.*
