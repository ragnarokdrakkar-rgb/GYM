# Compact Gym v3 — verification for 1.3.1

## Design

- The approved HTML is retained in `design/compact-gym-v3-reference.html` as a design/test source, not installed app code.
- `tools/build-compact-reference.cjs` extracts its style blocks with only the root selector changed. A regression test checks exact equality.
- Main app screens use `js/compact-shell.js` in a shadow root. No demo session data or preview JavaScript is imported.
- Direct browser comparison against the approved preview at 390 px. Production input height 46 px and font size 21 px match the reference.
- Production Focus additionally viewed at 352 px with seven exercises. No horizontal overflow: document width 337 px within a 352 px viewport (desktop scrollbar occupies 15 px); status controls wrap instead of clipping.
- Training, Focus, Program, Settings, strength graph, bodyweight graph and calendar were viewed using browser UI tools.

## Functional browser checks

All test entries were created through the UI on a separate localhost origin. No user phone database was modified.

- Log sets, complete an exercise: green check after required sets; partial remains blue.
- Enter future kg/reps; add two planned sets and remove one; existing completed sets remain.
- Edit one historical set from 65 × 6 to 67.5 × 6. Strength graph showed 67.5 kg and the corrected session volume of 885 kg. Today's raw sets were independent.
- Add a custom-named exercise once; it appears immediately. Set 5/3/1 explicitly for a single exercise.
- Deactivate a day: active day count changed from five to four, with original day still available for editing.
- Save bar type and available plates; selected values remain visible.
- Enter bodyweight; set a missing Bulk start date; phase average shows 80.2 kg, with insufficient weekly trend correctly left blank.
- Set a five-second rest; expired bar disappears.
- Start a repeat of an existing day: old history stays, a fresh current draft is created.
- Reload during an active workout: new recovery dialog offers resume; recorded set and timer resume.
- Finish resumed workout: new history calendar opens, old summary popup does not. Both sessions on the same date remain selectable.

## Automated and package checks

- 95/95 tests passed, strict code audit passed.
- Source and Android release guards passed; offline signed Gradle release build passed.
- APK package: `com.kemal.workouttracker`; versionName `1.3.1`; versionCode `68`.
- APK v2 signature verified with the existing signer certificate SHA-256:
  `b0807ab8a94393f22694e927f81e6cced8dadf1ac71ead4758e239bacc7ab086`.
- Installed web assets checked byte-for-byte against the new renderer, its styles, bundled runtime, version file and web icons.
- Packaged HTML selects `compact-shell`; design preview is not in installed assets.
- Android adaptive icon points to the existing gym-fire foreground mipmaps at all five densities.

No Android device was connected for a physical-device installation/lock-screen test. Browser layout testing and signed-package checks do not claim to replace that test.
