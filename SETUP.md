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

---

## 7. Over-the-air updates (expo-updates — from app 1.2.3 / App Store 1.0.4)

Owner, 2026-10-13: small JavaScript-only changes (a what's-new reel, a copy fix,
a small bug) should reach phones without waiting for App Review.

- `runtimeVersion` is `{ "policy": "appVersion" }`: an update reaches only builds
  whose `version` matches it exactly. **Anything native (a new package with native
  code, a permission, an entitlement, a plugin, an icon) needs a new App Store build
  and a version bump** — never an update.
- Builds made from the `production` profile listen on the `production` channel
  (`eas.json`); `preview` on `preview`. Development builds ignore updates.
- `checkAutomatically: ON_LOAD`, `fallbackToCacheTimeout: 0`: the app opens on what
  it already has and fetches an update in the background; the next launch runs it.
  Rollback on its own covers only an update that crashes **before its first screen
  draws** (expo-updates ErrorRecovery); a bug on any later screen stays on every phone
  until the previous update is republished by hand. So an update is tried first: on a
  preview build of the same version if one is installed (publish to `preview`), and in
  any case on the simulator from this same checkout, before it goes to `production`.
- Only builds that contain expo-updates (1.0.4 on) can receive one.
- **Publish only from the code the live binary was built from.** An update replaces
  the app's JavaScript wholesale, so it must be that build's code plus the fix — never
  another branch at the same version. 1.0.4 (binary 1.2.3) is built from branch
  `hotfix-1.0.4`, checked out at `~/Desktop/claude-projects/kindredly-ios-hotfix`. The
  main checkout is the 10a overhaul (`ios-1.2.3`): published from there, its JS would
  call native code 1.0.4 doesn't have, and it lacks the journal fix.
- **The overhaul's version must move past the live one** (1.3.0, say) before it builds
  or publishes anything — merging `hotfix-1.0.4` into it brings `"version": "1.2.3"`
  along without a conflict, and from then on its updates would land on 1.0.4 phones.
- **From 1.0.5 on, one update per live runtime, all from the main checkout** (2026-10-25
  review). 1.0.5 (binary 1.2.4, build 34) and 1.0.6 (binary 1.2.5, build 35) are both
  built from `ios-1.2.3`; their native code differs only by the scene plugin and two
  Swift fixes, so the same JavaScript runs on both. But `runtimeVersion` follows
  `"version"`, and `eas update` publishes to exactly one runtime: from HEAD (`1.2.5`) only
  1.0.6 phones get it. So publish twice — HEAD as it is, then the same commit with
  `"version": "1.2.4"` set for the moment in this same checkout and put back right after
  (never edit `runtimeVersion` instead, and never commit the 1.2.4). Not in a throwaway
  worktree: without `ios/` the export falls back to `node_modules/hermes-compiler`'s
  hermesc, the same Hermes release and bytecode (v98) but 1.7 MB larger output, where this
  checkout's `ios/Pods/hermes-engine` hermesc matches the shipped bundles byte for byte in
  size (13.5 MB; done this way 2026-10-25). 1.0.4 (1.2.3) still comes only from the hotfix
  worktree above.
  Before every release from here, add its line to `STORE_OF_BINARY`
  (`src/lib/update-prompt-core.ts`), or the update prompt can't tell the new binary is
  already the newest.

**Upload only the bundle you counted.** 2026-10-25: the check exported with
`eas env:exec` (which reads `.env.local`) and counted Supabase = 1, then `eas update`
bundled again on its own, without `.env.local`: both runtimes got a bundle with no
Supabase ("Auth not configured", everyone signed out) for about half an hour, until the
counted bundle was uploaded with `--skip-bundler`. So never let `eas update` bundle: export
into `dist`, count `dist`, upload `dist` as it is.

```bash
cd ~/Desktop/claude-projects/kindredly-ios
git branch --show-current                        # ios-1.2.3
git status --short src                           # nothing: publish committed code only
ota() {   # export → count → upload exactly what was counted
  rm -rf dist
  eas env:exec production "npx expo export --platform ios --clear --output-dir dist" || return 1
  F=$(ls dist/_expo/static/js/ios/*.hbc)
  S=$(LC_ALL=C grep -c -a "wndkpoiuoxufvplnlaww" "$F"); A=$(LC_ALL=C grep -c -a "https://kindredly.io" "$F"); R=$(LC_ALL=C grep -c -a "appl_[A-Za-z0-9]" "$F")
  echo "version $(node -p "require('./app.json').expo.version")  supabase=$S api=$A revenuecat=$R"
  [ "$S" -ge 1 ] && [ "$A" -ge 1 ] && [ "$R" -ge 1 ] || { echo "STOP: config missing"; return 1; }
  eas update --channel production --environment production --platform ios --skip-bundler --input-dir dist --non-interactive --message "$1"
}
node -p "require('./app.json').expo.version"     # 1.2.5
ota "<what changed>"                             # runtime 1.2.5 (App Store 1.0.6)
sed -i '' 's/"version": "1.2.5"/"version": "1.2.4"/' app.json
ota "<what changed> (at version 1.2.4)"          # runtime 1.2.4 (App Store 1.0.5)
git checkout -- app.json && node -p "require('./app.json').expo.version"   # 1.2.5 again
eas update:list --branch production --limit 4    # two new groups: runtime 1.2.5 and 1.2.4
```

**The pitfall: what gets inlined.** `EXPO_PUBLIC_*` values are baked into the bundle
at build/update time. Supabase and the API base come from the `production` profile's
`env` in `eas.json` (builds) or `.env.local` (this Mac). The RevenueCat key lives only
in EAS's `production` environment — and **a variable with "Secret" visibility is never
handed to anything that runs on this Mac**: not `eas build --local`, not `eas update`,
not `eas env:exec`. The b27 build log says so in its first lines ("No environment
variables with visibility "Plain text" and "Sensitive" found"), and the 1.0.2 archive's
bundle has Supabase in it but no `appl_` key — so a local build ships with IAP off:
placeholder prices and "Can't reach the store". The RevenueCat iOS key is a public SDK
key; its EAS visibility must be "Sensitive" (or Plain text) — fixed 2026-10-15 (recreated
as Sensitive in production, preview and development). And **clear the bundler cache
whenever a variable changes** (`--clear` / `--clear-cache`): the first export after the
fix still came out with no key, from code Metro had cached with the empty value.

Check a bundle before anything ships (counts only — never print the key):

```bash
cd ~/Desktop/claude-projects/kindredly-ios-hotfix   # the live build's code (see above)
git branch --show-current                             # must be: hotfix-1.0.4
node -p "require('./app.json').expo.version"          # must be the live binary's: 1.2.3
# this checkout has no .env.local, so give the export the production profile's public values
EXPO_PUBLIC_SUPABASE_URL=https://wndkpoiuoxufvplnlaww.supabase.co \
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_bJM4pydUeVPY1CWuifk7Yw_CqclSzVj \
EXPO_PUBLIC_API_BASE=https://kindredly.io \
eas env:exec production "npx expo export --platform ios --clear --output-dir /tmp/kindredly-ota-check"
F=$(ls /tmp/kindredly-ota-check/_expo/static/js/ios/*.hbc)
LC_ALL=C grep -c -a "wndkpoiuoxufvplnlaww" "$F"      # must be ≥ 1 (Supabase)
LC_ALL=C grep -c -a "appl_[A-Za-z0-9]" "$F"          # must be ≥ 1 (RevenueCat)
# only then, with the owner's go-ahead (it reaches every phone on that version):
eas update --channel production --environment production --clear-cache --message "<what changed>"
# (--channel preview first when a preview build of this version is installed to try it on)
```

The same two counts on a built `.ipa` (`Payload/Kindredly.app/main.jsbundle`) belong in
the package check before every upload.

Roll back a bad update from the EAS dashboard (Updates → republish the previous one),
or `eas update:republish`.
