# Patch 1.1.3 — scope and follow-up backlog

The user requested publishing the completed subset on 2026-09-07. The remaining features below are follow-up work, not a promise that they ship in 1.1.3. The signed 1.1.3 APK passed 67 tests, source/Android guards and signature verification. See RELEASE_NOTES_1.1.3.md for the shipping scope and checksum.

Implemented:
- Plate calculator moved beside the current quick-entry weight, outside collapsed set history; updates on typing and does not follow an old history row.
- 5/3/1 prescription collapsed by default.
- Independent red/pending, blue/partial, green/complete exercise states, with a white ring for the current exercise.
- Main Program overview excludes inactive/deleted days without reindexing saved workout keys.
- Muscle volume merges common English/Slovenian aliases and avoids double-counting aliases within a muscle mapping.
- Dark Fire icon master generated; launcher integration still pending.

Verification so far: baseline plus new progress test passed (67 tests) before muscle-alias change. Fresh browser origin 127.0.0.1:4174 shows current 140kg plate composition while history is collapsed. Old preview origin 4173 contained a stale service-worker version and must not be used to verify this patch without updating it.

Follow-up features (not included in 1.1.3):
- Explicit archived/deleted-day management in builder.
- Strength ratios based on named source sets, with kg/reps/date provenance rather than positional legacy PR fallback.
- Settings history review/edit, suspicious-only filter, explanations, pre-edit backup and safe undo; no automatic data deletion.
- Complete icon launcher/web renditions and small-size visual QA.
- Full mobile UI checks, backup/edit regression tests, version bump, signed APK build, release verification and GitHub upload.

Existing generated Capacitor Gradle modifications belong to the user; exclude them from staging. GitHub remote is `github`, not local `origin`. No release has been published for this work-in-progress patch.
