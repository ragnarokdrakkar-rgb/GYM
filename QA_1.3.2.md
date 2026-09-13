# Quick workout navigation — verification for 1.3.2

## Automated checks

- 108/108 tests passed, including 13 new quick-navigation regressions.
- Exact cycle/week/original-day matching; planned/partial/complete sets; saved partial workouts; repeated sessions; active repeats; warmup-only and empty sessions; canonical inactive/deleted/hidden filtering; adjusted 5/3/1 and manual targets; next-workout ordering.
- Guarded direct selection, active/recovery navigation locks, sixth/seventh day restoration, seven-day wrapping and empty-program messaging.
- Existing Compact Gym v3 reference-style equality, storage, history, phase, logging and package-version regressions remain green.
- Strict code audit, Source/Android release guards and offline signed Gradle build passed.

## Browser UI checks

Used a separate localhost test origin with synthetic sessions created through UI. No user phone database was accessed or changed.

- Training and Program show direct week/day buttons, current cycle and week, per-week progress and a next-workout action.
- Existing two Push A sessions counted as one completed day: 1/4, not 2/4 or 1/5. Inactive Pull B excluded.
- One-tap next workout opens Pull A without starting the timer. Direct week 2 selection shows a separate 0/4 count. Reload preserves Pull A/week 2.
- Active training disables week/day/cycle changes and shows blue “V teku”. Focus contains the concise cycle/week line but no quick-navigation block or finish button.
- Logged 20 kg × 5 in a test Pull A session; confirmed finish. Week 2 changed to 1/4 with a green Pull A check, independently of week 1's Push A check.
- New-cycle confirmation shows unfinished-week warning. Cancel leaves cycle 1/week 2 unchanged. Confirm opens cycle 2/week 1/first active day with 0/4, retaining all three old calendar sessions and previous exercise history.
- Visual checks at 390 × 844 and 352 × 780. At 352 px, document client/scroll widths are both 337 px (15 px desktop scrollbar); navigation client/scroll widths both 305 px. Day buttons are 48 px high. No horizontal clipping and no browser console errors observed.

## APK

- `com.kemal.workouttracker`, versionName `1.3.2`, versionCode `69`.
- Size: 7,984,439 bytes.
- SHA-256: `dd35be1ad5ec8b495d2e1edfb21d1be3dbded1fc81157af19fc3c36a878e4c54`.
- APK v2 signature verified; existing signer SHA-256: `b0807ab8a94393f22694e927f81e6cced8dadf1ac71ead4758e239bacc7ab086`.
- Packaged renderer, navigation CSS, reference CSS, version script, runtime bundle and web icons match source bytes. Packaged HTML selects the real compact-shell renderer.
- Gym-fire icon and app identity remain unchanged from 1.3.1.

No Android device was connected. Physical installation and device lock-screen testing were not performed; browser/package checks do not replace those tests.
