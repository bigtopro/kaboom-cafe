### Kaboom App – Monorepo

A monorepo containing Firebase Cloud Functions, web assets, custom Flutter/Dart actions, and utility scripts for Kaboom Gaming. It handles slot locking, Razorpay order creation and webhooks, bookings, and user account workflows.

## Tech stack
- **Firebase**: Cloud Functions (1st gen), Firestore, Realtime Database, Auth
- **Node.js**: Functions runtime (currently Node 18 in prod). Plan to migrate to Node 22 (Gen 2)
- **Razorpay**: Orders API and webhooks
- **Frontend (static)**: Public HTML/CSS/JS in `public/`
- **Flutter/Dart**: Custom actions used by the FlutterFlow app in `custom_code/` and `lib/`
- **Utilities**: Python scripts for device discovery/control

## Repository structure
```
inifnity-solutions-main-3/
  functions/                 Firebase Cloud Functions (Node.js)
    index.js                 All callable HTTP functions and webhook
    package.json
  public/                    Static web pages and JS bundles
    src/                     Client-side logic used by static pages
  custom_code/               FlutterFlow custom action sources (Dart)
  lib/                       Flutter app custom code hooks
  dataconnect/               (Reserved) DataConnect artifacts
  *.py                       Utility scripts for controllers / bulbs
```

## Core Cloud Functions (functions/index.js)
- **createOrder (callable)**: Creates a Razorpay order from client-provided amount/notes.
- **razorpayWebhook1 (HTTP)**: Verifies webhook signature and processes `payment.captured` / `payment.failed`.
- **handleCallbackBooking (callable)**: On successful payment, writes booking details to Realtime DB and Firestore, then releases slot locks.
- **lockSlotsTemporarily (callable)**: Places 3‑minute temporary locks in Realtime DB under `public/locks/{cafeId}/{gameType}/{slotId}`.
- **releaseLockedSlots (callable)**: Removes locks and clears in‑memory timers.
- **getDiscountAmount (callable)**: Applies discounts based on `offerID` (e.g., `happyhour`, `every5th`, `newuser`).
- **checkPhoneExists (callable)**: Checks whether a phone number exists in Firebase Auth.
- **AccountDeletion / cancelAccountDelete (callable)**: Schedules/cancels account deletion after a grace period.

## Data model (high-level)
- Realtime Database
  - `public/locks/{cafeId}/{gameType}/{slotId}`: `{ userId, timestamp }`
  - `public/slots/{cafeId}/{gameType}/{slotId}`: booking allocation for each slot
- Firestore
  - `transactions/{userId}/dashboardDetails/{NN}`: booking receipt data
  - `deleteTasks/{uid}`: account deletion timers

## Environment configuration
Rely on runtime configuration in Firebase rather than `.env` files for production deployments.

### Razorpay credentials
- Recommended (Functions Config):
  - Set: `firebase functions:config:set razorpay.key_id="<rk_...>" razorpay.key_secret="<rs_...>"`
  - Access in code: `functions.config().razorpay.key_id` and `functions.config().razorpay.key_secret`
- Alternative (Secret Manager): Bind `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to functions and read from `process.env`.

### CORS origins
Configured in `functions/index.js` via `cors({ origin: [ ... ] })`. Update to include any new admin/client hosts.

## Local development
1) Install Node 18 (nvm recommended) and dependencies:
```bash
nvm install 18 && nvm use 18
cd functions && npm ci
```

2) Set local config (for callable testing), or use emulators. If you depend on `functions.config()`, set them:
```bash
firebase functions:config:set razorpay.key_id="<rk_test_...>" razorpay.key_secret="<rs_test_...>"
```

3) Serve locally (emulators):
```bash
firebase emulators:start --only functions,firestore,database
```

4) Test callable functions with Firebase SDK from your app or with REST where applicable.

## Deployment
Deploy functions to the target project (example uses `kaboomapp-32688`):
```bash
nvm use 18
firebase deploy --only functions --project kaboomapp-32688
```

Notes:
- Node 18 in 1st gen is deprecated. Plan to migrate to **Gen 2 / Node 22**. This typically requires moving to the new `onCall`/`onRequest` v2 APIs or keeping compatibility via the latest `firebase-functions` and setting the runtime to Node 22.
- For webhooks, ensure your Razorpay dashboard points to: `https://us-central1-<project-id>.cloudfunctions.net/razorpayWebhook1`

## Razorpay integration details
- `createOrder` multiplies `amount` by 100 (paise) and passes `notes` including `slotIds`, `gameType`, `controllers`, `cafeId`, and times.
- `razorpayWebhook1` verifies `x-razorpay-signature` using `RAZORPAY_WEBHOOK_SECRET`. Ensure this secret is set and matches the Razorpay dashboard’s webhook secret.

## Troubleshooting
- 401 `Authentication failed` from Razorpay: Verify that the deployed functions have the correct live/test keys configured. Prefer `functions.config()` or Secret Manager.
- CORS errors on callable/HTTP usage: Add client/admin domains to CORS origins list in `functions/index.js`.
- Slot locks not expiring: Confirm the in‑memory timers are running and that the process is warm; also verify Realtime DB paths and timestamps.

## Scripts and tools
- `public/src/*.js`: Client logic for booking flow and dashboard interactions.
- `custom_code/actions/*`: FlutterFlow custom actions (Dart) for payment/locking flows.
- Python utilities: controller/bulb scripts and device discovery.

## Security
- Do not log secrets. Mask any key logging for debugging.
- Validate all user inputs in callable functions and webhooks.

## License
Proprietary – internal use for Kaboom Gaming.


