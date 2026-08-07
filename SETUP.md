# Kindredly iOS — Setup

One-time setup to build, sign, and ship the native iOS client. The app reuses the
existing backend (Supabase `wndkpoiuoxufvplnlaww` + the Cloudflare Pages Functions
at `https://kindredly.io/api/*`) — there is no new backend. iOS billing is Apple
IAP via RevenueCat; the new `/api/webhook/revenuecat` Function writes into the same
`subscriptions` table the web app's Creem webhook writes, so Kindredly+ unifies
across web and iOS.

Work top to bottom. Steps 1–2 get the app running locally; 3–5 get billing and a
signed build; 6 is the env-var reference.

---

## 1. Local iOS build toolchain

This Mac has **Xcode 26.6** and **iPhone 17** simulators, but **no CocoaPods**, and
the system Ruby is **2.6.10** (too old for modern CocoaPods, which needs Ruby ≥ 3.1).
An Expo dev-client build (`expo run:ios`) runs `pod install`, so CocoaPods is required.

Fix (installs a modern Ruby + CocoaPods via Homebrew):

```bash
# 1. Homebrew — https://brew.sh (paste the one-line installer from the site)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. CocoaPods (Homebrew's formula brings its own Ruby — no need to touch system Ruby)
brew install cocoapods
pod --version        # sanity check

# 3. Build + boot the app on a simulator (first run compiles native code — slow)
cd ~/Desktop/kindredly-ios
npm install
npx expo run:ios
```

**Alternative — skip local native builds entirely:** use an EAS cloud build
(`eas build -p ios --profile development`, see step 5) and install the resulting
`.app`/dev-client on a simulator or device. No CocoaPods needed locally.

---

## 1b. Supabase — apply the iOS feature migrations

Two additive migrations in the web repo (`~/Desktop/kindredly/supabase/migrations/`)
enable iOS-only features. Apply via `supabase db push` or paste each into the
Supabase SQL editor. Until applied, the app degrades gracefully (voice compose
fails with a friendly message; Window shows empty):

- **`0006_windows.sql`** — the "window" post kindreds can see (table + kindred-scoped RLS).
- **`0007_voice_letters.sql`** — voice letters: `letters.kind/media_path/duration_s`,
  `threads.opening_media/opening_duration_s`, and the **`voice-letters` storage
  bucket** (public read; authenticated upload into own `auth.uid()` folder).
  Note: web renders a voice letter as a text card via its caption — no web changes.
  Wren's AI screen can't hear audio; report/block + 3-report auto-suspend still cover
  voice letters.

## 2. Supabase — add the Apple auth provider

Google OAuth and email magic-link already work. Sign in with Apple is **mandatory**
for App Review because the app offers Google login, and the app already ships the
SIWA button (`expo-apple-authentication`, `usesAppleSignIn: true` in `app.json`).

In the Supabase dashboard → **Authentication → Providers → Apple**, enable it and fill:

- **Services ID** (the identifier you create in the Apple Developer portal for "Sign in with Apple")
- **Team ID**
- **Key ID** + the **`.p8` private key** (from a "Sign in with Apple" key in the Apple Developer portal)

Then in **Authentication → URL Configuration → Redirect URLs**, add the app's deep link:

```
kindredly://auth-callback
```

This is `Linking.createURL("auth-callback")` with the `kindredly` scheme (see
`src/lib/auth.tsx`). Without it, the OAuth/magic-link round-trip won't return to the app.

---

## 3. RevenueCat

1. Create a RevenueCat account and add a **project → iOS app** (bundle id `io.kindredly.app`).
2. Copy the app's **public SDK key** (starts with `appl_`). Put it in:
   - `.env.local` → `EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_…` (local Metro)
   - `eas.json` → each build profile's `env.EXPO_PUBLIC_REVENUECAT_IOS_KEY` (cloud builds)

   > Left blank, the app runs in null-safe demo mode (no paywall gating, no crash) —
   > see `src/lib/iap.ts` (`IAP_READY`). Set it to enable purchases.
3. Create an **entitlement** with identifier **`plus`** (exactly — the app checks
   `entitlements.active["plus"]`, `ENTITLEMENT_ID` in `src/lib/iap.ts`).
4. Create an **Offering** (e.g. `default`) with a **monthly** package and an **annual**
   package, each mapped to its App Store Connect product (step 4). The paywall reads
   `offerings.current.availablePackages` and shows MONTHLY / ANNUAL.
5. Attach both products to the `plus` entitlement.
6. **Webhook** — RevenueCat dashboard → **Integrations → Webhooks**:
   - URL: `https://kindredly.io/api/webhook/revenuecat`
   - **Authorization header value:** a strong random secret. This exact string must
     also be set as `REVENUECAT_WEBHOOK_AUTH` in Cloudflare Pages (step 6). The
     Function returns **501** until that env var exists and **401** on any mismatch.
   - Set `app_user_id` correctly: the app calls `Purchases.configure({ appUserID })` /
     `logIn()` with the **Supabase user id** (`src/lib/iap.ts`), so RevenueCat's
     `event.app_user_id` is the `subscriptions.user_id` the webhook writes. Do not
     let RevenueCat generate anonymous ids for signed-in users.

---

## 4. App Store Connect

1. Create the **app record** — bundle id **`io.kindredly.app`** (matches `app.json`
   `ios.bundleIdentifier`). Reuse the existing Apple Developer account (the one that
   shipped peekabug); create a new app record under it.
2. Create **two auto-renewable subscriptions** in **one subscription group**
   (so users can switch between them and only hold one at a time):
   - **Monthly**
   - **Annual**

   Use product identifiers whose names include `month` / `annual` (or `year`) — the
   webhook derives `plan` from the product id string (`annual`/`year`/`yr` → `yearly`,
   else `monthly`; see `planFromProduct` in `functions/api/webhook/revenuecat.js`).
3. **Pricing decision (OPEN — confirm with owner):** the web app charges **$6/mo**
   and **$48/yr** (Creem). Either match those on iOS, or bump to absorb Apple's cut
   (e.g. **$6.99/mo**). Apple takes 15% (Small Business Program, < $1M/yr) or 30%.
   Note: the price is set in App Store Connect and surfaced to the app via RevenueCat —
   no code change needed to adjust it.
4. Map each product into the RevenueCat Offering packages (step 3.4).

---

## 5. EAS build

```bash
cd ~/Desktop/kindredly-ios

# One-time: create the EAS project and get a projectId
eas init
```

Then fill the two placeholders that `eas init` / App Store Connect give you:

- `app.json` → `expo.extra.eas.projectId` (from `eas init`)
- `eas.json` → `submit.production.ios.ascAppId` (the App Store Connect app's Apple ID)

Build:

```bash
eas build -p ios --profile development   # dev client for on-device / TestFlight-less testing
# later:
eas build   -p ios --profile production
eas submit  -p ios --profile production  # uploads to App Store Connect / TestFlight
```

---

## 6. Environment variables

### Client — `EXPO_PUBLIC_*` (inlined into the JS bundle; public by design)

Set in **`.env.local`** (local Metro) **and** in each **`eas.json`** build profile's
`env` block. These are already scaffolded in `.env.example`.

| Var | Value | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://wndkpoiuoxufvplnlaww.supabase.co` | shared with web |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_…` | publishable key, protected by RLS |
| `EXPO_PUBLIC_API_BASE` | `https://kindredly.io` | hosts `/api/entitlement`, `/api/bump-letters`, `/api/wren` |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | `appl_…` | RevenueCat **public** SDK key; blank = IAP demo mode |

Never put service-role or other secret keys in `EXPO_PUBLIC_*` — they ship in the app binary.

### Server — Cloudflare Pages secrets (the `kindredly` Pages project)

Set in **Cloudflare Pages → the `kindredly` project → Settings → Environment variables**
(Production **and** Preview). These are server-only and never reach the app.

| Var | Purpose | Status |
| --- | --- | --- |
| `REVENUECAT_WEBHOOK_AUTH` | Shared secret the RevenueCat webhook must send in its `Authorization` header. Must equal the value set in RevenueCat (step 3.6). | **NEW — add this** |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role for the webhook's `subscriptions` writes. | already set (used by Creem webhook) |
| `SUPABASE_URL` | Supabase REST base for the Functions. | already set |
| `MOONSHOT_API_KEY` | Kimi/Moonshot key for `/api/wren`. | already set |

The existing Creem billing secrets (`CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, …) stay as-is —
the RevenueCat webhook does not use them.

> **Cloudflare gotcha:** Super Bot Fight Mode will 403 legitimate webhook deliveries
> (RevenueCat has no static IPs). Add a WAF bypass for `/api/webhook/revenuecat` — same
> as the existing carve-out for `/api/webhook/creem`.
