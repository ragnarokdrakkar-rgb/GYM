# 1.3.0 release verification

- `npm test`: 88 passed, 0 failed; strict code audit passed.
- Source and Android release guards passed; signed offline Gradle release build succeeded.
- APK: `com.kemal.workouttracker`, versionName `1.3.0`, versionCode `67`.
- APK Signature Scheme v2 verified. Signing certificate SHA-256 matches the existing release: `b0807ab8a94393f22694e927f81e6cced8dadf1ac71ead4758e239bacc7ab086`.
- Bundled compact JS, CSS and web icon byte hashes match the tested source files.
- Fresh isolated local test origin, mobile viewport: onboarding, whole-workout start/finish, optional manual RPE, plan persistence after reload, and next-set planned values verified through the UI.
- Focus: adding two future sets and removing one preserved the completed set; future rows remained incomplete. Completed-set review remains editable. Navigation no longer overlaps controls and the current-dot ring is visible.
- Five-second rest timer dismissed itself after expiry. Duration editing was tested in focus.
- Calendar works after the first saved workout and displays its day name and color. Unit tests verify distinct stable colors for the five standard workout days.
- Strength lists active roster exercises, opens actual logged-weight graph, links to its exact history session, and reflects a saved historical correction without changing the current workout value.
- New dumbbell/flame icon visually checked at 192 px; all existing Android launcher density variants regenerated.

Not directly tested: physical Android hardware, system keyboard/insets, lock-screen notification behavior, and installing over the user's actual phone database. No user workout database was read or modified in testing.
