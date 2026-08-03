# Kindredly iOS — Plan

The native iOS client for Kindredly (kindredly.io). A new Expo SDK 57 app over the
existing web backend — NOT a new backend.

## Tech stack (strong lean)

- **Expo SDK 57 + React Native** — same toolchain as `~/Desktop/peekabug`, which the
  owner already shipped through App Review. Crib the working config from peekabug:
  expo-router, expo-apple-authentication (SIWA), @supabase/supabase-js 2.110,
  react-native-purchases 10.4 (RevenueCat), expo-image / -image-picker /
  -image-manipulator, expo-blur / -glass-effect / -linear-gradient,
  lucide-react-native, reanimated 4, react-native-svg. EAS build via eas.json.
- **Backend = 100% reuse.** Supabase ref `wndkpoiuoxufvplnlaww` + the Cloudflare Pages
  Functions already deployed for the web app (/api/wren for Kimi, billing endpoints,
  entitlement). Same tables: letters, threads, messages, fingerprints, morning_pages,
  subscriptions, moderation.

## ⚠️ THE payment fork (decide first)

Apple requires **In-App Purchase (StoreKit, ~30% / 15% small-business)** for digital
subscriptions sold inside an iOS app. **Creem/web checkout in-app = automatic
rejection.**

- Web keeps Creem. iOS uses **IAP via RevenueCat** (peekabug already has
  react-native-purchases).
- Dual-provider: both write entitlement into the SAME Supabase `subscriptions` table
  (it already has a `provider` column; add 'apple'). New CF Function
  `/api/webhook/revenuecat` upserts the row like the Creem webhook does.
- Set RevenueCat `app_user_id` = Supabase user id so web + iOS purchases unify.
- Pricing: match $6/$48 or bump on iOS (e.g. $6.99) to absorb Apple's cut — DECIDE.

## App Store review landmines (peekabug hit these — pre-empt)

- Official **Sign in with Apple** button (mandatory when Google login is offered).
- IAP price clarity + robust purchase flow for the review sandbox (Guideline 2.1(b)).
- Full session clear on sign-out (peekabug had a local-scope signOut bug).
- Anon/UGC apps: report + block (backend already has moderation tables), a EULA with
  zero tolerance for objectionable content, and blocking of abusive users.
- Age rating + parental considerations (web is 16+; payment consent uses 18+).

## Open decisions (confirm with owner before scaffolding)

1. Repo location: this folder `~/Desktop/kindredly-ios` (standalone). ✅ created.
2. IAP pricing: match $6/$48 or bump to $6.99 to absorb Apple's cut?
3. RevenueCat account (owner creates) + App Store Connect app record.
4. v1 scope: full parity (letters/journal/kindreds/compose/AI) vs focused MVP
   (read + write letters + kindreds)?
5. Reuse peekabug's Apple Developer account? (Yes — new app record under it.)

## Next step

After decisions locked: `npx create-expo-app@latest` pinned to SDK 57 (READ the v57
docs first), then wire Supabase auth + SIWA, then the letter/thread screens, then
RevenueCat for Kindredly+.
