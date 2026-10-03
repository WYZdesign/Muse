# Muses by WYZ — App Store Submission Evidence

**Status:** source and policy-preparation audit; no store submission made  
**Scope:** iOS App Store and Google Play closed-beta readiness  
**App identity in source:** `Muses` / `com.wyzdesign.muse`

## Source evidence confirmed

| Area | Evidence | Status |
| --- | --- | --- |
| Stable native identity | `capacitor.config.ts` declares `appId: 'com.wyzdesign.muse'` and `appName: 'Muses'`. | Ready in source |
| Secure web transport | Capacitor points at `https://muse.wyzdesign.com`; Android disables mixed content. | Ready in source |
| iOS permission copy | `ios/App/App/Info.plist` declares purpose strings for camera, microphone, photo library, in-use location, and motion. Each names the user-facing feature. | Ready in source |
| iOS privacy access | `SettingsScreen` exposes Delete Account; `DeleteAccountModal` confirms the consequence and schedules deletion. | Ready in source |
| Server deletion behavior | `delete-account` removes access immediately, schedules a 30-day purge, and the purge cron exists. Tests cover the scheduled deletion response. | Ready in source; live cron proof pending |
| Public privacy/terms pages | The app contains public privacy, terms, safety, and pricing routes. The privacy copy describes collection, retention, and deletion. | Ready in source; live URL review pending |
| Push/camera/location packages | Capacitor packages are present and configuration has user-purpose messaging. | Requires real-device permission-path proof |

## Store requirements that source alone cannot prove

Apple requires a privacy-policy URL and accurate App Privacy responses that
cover both first-party handling and integrated third parties. Apps that create
accounts must offer in-app account-deletion initiation. Google Play requires
the Data safety declaration and, for apps with accounts, an in-app deletion
path plus a functional public web link for account-deletion information.

- [Apple App Privacy requirements](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
- [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Google Play account deletion and Data safety requirements](https://support.google.com/googleplay/android-developer/answer/13327111)

## Submission checklist

### Must be completed before any external beta

1. Verify the deployed public Privacy Policy, Terms, Safety, and account
   deletion information without authentication. The deletion page must name
   Muses by WYZ, explain the 30-day account/data lifecycle and retained legal,
   safety, fraud, tax, and dispute records, and contain a working support path.
2. Create accurate Apple App Privacy and Google Play Data safety declarations
   for data handled by the app and its processors: account/profile data,
   user-generated photos and video, messages, precise or coarse location as
   applicable, payment data handled by Stripe, identity-verification data,
   moderation outputs, device/push identifiers, diagnostics, and first-party
   analytics. Do not submit a generic “no data collected” declaration.
3. Confirm the production account-deletion cron is configured and authorized,
   then exercise it with a disposable account. Record request time, sign-out,
   access denial, queued purge, retained-record rationale, and final deletion.
4. Produce a real-device test record for iPhone and Android: first launch,
   denied and granted permissions, camera/photo selection, location fallback,
   push prompt behavior, keyboard, safe-area layout, sign in/out, deletion,
   and recovery after an offline/poor-network state.
5. Submit a closed-test build only after a staged real-payment/Connect review
   confirms that test payment flows cannot charge or pay out real people by
   accident, and after all beta communications say whether the build is demo
   or real-user mode.

### App Store Connect and Play Console preparation

| Store item | Owner action |
| --- | --- |
| Name and availability | Confirm whether the store-facing name is `Muses by WYZ` or the shorter `Muses`; check availability before committing artwork and copy. |
| Privacy policy URL | Enter the deployed public privacy-policy URL in Apple; enter the matching policy and deletion web link in Play Console. |
| Data declarations | Complete from the actual deployed data map and third-party SDK list, then keep in sync with code changes. |
| Review notes | Provide an honest test account or a defined review path, clearly identify gated beta features, moderation, age/identity checks, location, payments, and deletion flow. |
| Screenshots/video | Capture from release candidates on real devices after the browser-based audit; do not use mocked screens that differ from the shipped build. |
| Support contact | Set monitored support email and response ownership before invitations. |
| Monetization | Reconcile in-app subscription/boost behavior, RevenueCat configuration, and Stripe booking fees with each store’s current rules before submission. |

## Release blockers

1. Production security remediation remains the highest technical blocker:
   public `SECURITY DEFINER` callable functions and mutable function search
   paths require the reviewed Supabase migration described in
   `MUSES_SUPABASE_SECURITY_TRIAGE_2026-10-02.md`.
2. The applied state of migrations 0022/0024/0025/0026, private storage,
   deletion purge, and cleanup worker is not yet proven in production.
3. Real-device test evidence and store-console declarations do not exist in
   the repository and must be completed by the account holder/team.
4. External browser visual auditing remains pending until the requested browser
   extension is connected.

## What does not need premature work

No new analytics vendor, paid monitoring product, or global-scale native
architecture is necessary for the LA closed beta. The current first-party
analytics pipeline, constrained cohort plan, and city gates are the right
foundation while verified real-user demand is being proven.
