# Model shranjevanja podatkov (Storage Model)

Ta dokument je narejen z branjem kode (ne iz spomina ali domnev). Zajema vse `localStorage`
ključe z znanim prefiksom `wt_`, dva IndexedDB shrambi, obliko zapisov (sets, sessions, timer),
program/day-list model, in poti pisanja (safe writes, batch commit, journal, retry).

Viri, pregledani za ta dokument: `js/core/bootstrap.js`, `js/core/state-storage.js`,
`js/core/backup.js`, `src/app/workout-model.js`, `src/app/workout-runtime.js`,
`src/app/workout-ui.js`, `src/app/gym-session-core.js`, `src/app/v6-core.js`,
`src/app/analytics-tools.js`, `src/app/profile-strength.js`, `src/app/ui-shell.js`,
`src/app/main.js`, `js/compact-shell.js`, `js/compact-ui.js`, `js/history-editor.js`,
`js/rest-native-notifications.js`, `js/ui-safe-v1.js`, `js/app-update.js`.
`js/app.js` is the built bundle (see `tools/build-app-bundle.cjs`) — it is a concatenation of
the `src/app` + `js/core` + shell files above and was not read as an independent source of
truth; any key found only in `js/app.js` also exists in one of the source files it is built
from.

> Note on “written by”: functions named below are the primary write paths found by reading the
> code. Several values are read directly via `localStorage.getItem`/`.setItem` in more than one
> place (this file lists the defining/primary one and notes when others also touch the key).

## 1. Osrednji ključi (definirani v `LS`, `js/core/bootstrap.js:1`)

```js
const LS={sets:'wt_s6',pr:'wt_p6',notes:'wt_n6',bw:'wt_bw6',cycle:'wt_c6',meas:'wt_m6',
  gym:'wt_g6',theme:'wt_th6',sessions:'wt_sess6',cynotes:'wt_cyn6',restplan:'wt_rp6',
  setcounts:'wt_sc6',pain:'wt_pain6'};
```

Getters/setters for all of these live in `js/core/state-storage.js` (`getSets`/`saveSets`,
`getPRs`/`savePRs`, etc., lines 134-147). All of them go through `lss()` → `safeSetRaw()`
(see §7), so every write is retried/journaled the same way.

### `wt_s6` — all recorded sets (`LS.sets`)
- **Purpose**: every set of every exercise, for every cycle/week/day/exercise position, keyed by
  the set-key format `c{cycle}w{weekIdx}d{dayIdx}e{exerciseIdx}` (see §5).
- **Shape**: `{ [setKey: string]: SetRow[] }`. A `SetRow` (from `buildSessionSnapshot`,
  `src/app/gym-session-core.js:114-119`, and `addSet`, `src/app/workout-runtime.js:246`) has:
  `{ kg, reps, rpe?, done: boolean, type?: 'warmup'|'work', warm?: boolean, drop?: boolean,
  note?: string, id?: string, sessionId?: string|null, exerciseId?: string, exName?: string }`.
- **Example**:
  ```json
  { "c1w0d0e0": [
      {"kg":60,"reps":8,"rpe":8,"done":true,"type":"work"},
      {"kg":60,"reps":"","done":false}
  ]}
  ```
- **Written by**: `saveSets()` (state-storage.js), called from `addSet`, `removeSet`,
  set-toggle code (`workout-runtime.js:1028`, `all[key][si].done=!...`), `migrateSetExerciseIds`,
  `reconcilePositions` (workout-model.js), history editor commits
  (`js/history-editor.js`, `js/compact-shell.js` — undo/redo of past sessions), plan-editor
  commits (`js/compact-ui.js`, `wt_plan_undo_v26`).
- **Backup**: exported as `sets` (`src/app/analytics-tools.js:1543`), validated key-by-key in
  `validateBackupV18` (`^c\d+w\d+d\d+e\d+$`, rows checked for numeric bounds). Restore: replace
  clears the key first then writes the backup's value; merge takes the *incoming* value and
  overlays it with the *current* value (`put(key,value,true)` in `buildRestorePlanV18` does
  `value={...value,...read(key)}`, so for `sets` a **whole set-key entry** from backup is only
  kept if the current state has no entry under that same key — this is a shallow, per-set-key
  merge, not a per-set-row merge).

### `wt_p6` — PRs by legacy `'pr'+dayIdx+exIdx'` key (`LS.pr`)
- **Purpose**: personal-record bookkeeping keyed by day/exercise index (not by full set-key), used
  by `reconcilePositions` when exercises are reordered (`workout-model.js:213-216`).
- **Shape**: `{ [`pr${dayIdx}${exIdx}`]: <PR value, opaque here> }`.
- **Written by**: `savePRs()`; remapped by `reconcilePositions`; overwritten wholesale by the
  history editor's undo/redo commits (`commitHistory` in compact-shell.js/history-editor.js).
- **Backup**: exported as `pr`, restored via `maps.pr` in `buildRestorePlanV18` (merge overlays
  current on top of incoming, like `sets`).

### `wt_n6` — notes (`LS.notes`)
- **Purpose**: free-text notes, keyed presumably by exercise/day key (opaque object, only ever
  read/written wholesale via `getNotes`/`saveNotes`; no other file reads inside it directly in
  the reviewed sources — **uncertain** whether any UI currently writes into this key, since no
  caller of `saveNotes` was found outside `state-storage.js` itself and the backup path).
- **Backup**: exported as `notes`, restored via `maps.notes`.

### `wt_bw6` — body-weight log (`LS.bw`)
- **Shape**: `{ [dateISO: string]: number }` (kg). Confirmed by `editWeight()` in
  `js/compact-shell.js:468`: `next[d]=Number(data.get('kg'))`.
- **Example**: `{"2026-09-20": 82.4, "2026-09-24": 82.1}`
- **Written by**: `saveBW()`; `editWeight()` in compact-shell.js (writes via `commitStorageBatch`,
  also snapshotting the previous value into `wt_bw_undo_v27`, an undo-only key — see §8).
- **Backup**: exported as `bw`, restored via `maps.bw` (merge overlays current on incoming).

### `wt_c6` — cycle number/start dates (`LS.cycle`)
- **Shape**: `{ num: number, startDates: { [cycleNum: string]: 'YYYY-MM-DD' } }`.
  Default from `getCyc()`: `{num:1, startDates:{'1': today}}`.
- **Written by**: `saveCyc()`.
- **Backup**: exported as `cycle`; restore is special-cased in `buildRestorePlanV18` (line 92):
  on merge it takes `num = max(current.num, backup.num)` and merges `startDates` with current
  winning conflicts; on replace it takes the backup's cycle wholesale.

### `wt_m6` — body measurements (`LS.meas`)
- **Purpose**: historical measurements (chest/waist/hips/arms/thighs, see `MEAS_FIELDS` in
  bootstrap.js). The dedicated "Measurements" page/route has been removed from the UI
  (per `tests/body-measurements.test.js`: "measurements page and navigation are gone; old route
  opens bodyweight without deleting stored data") but **the storage key and its data are kept**
  — this is a UI removal, not a data-model removal. Treat `wt_m6` as **legacy-but-preserved**:
  still exported/imported by backup, still readable via `getMeas()`, but there is no discovered
  menu entry that writes new values through the normal UI anymore (uncertain — no writer other
  than `saveMeas()` calls found in the reviewed sources besides backup restore).
- **Backup**: exported as `meas`, restored via `maps.meas`.

### `wt_g6` — plate/bar gym config (`LS.gym`)
- **Shape**: `{ bar: number, plates: number[] }`, e.g. `{"bar":20,"plates":[1.25,2.5,5,10,20,25]}`.
- **Written by**: `saveGym()`.
- **Backup**: exported as `gym`, restored via `maps.gym`.

### `wt_th6` — theme (`LS.theme`)
- **Shape**: plain string `'dark'` or `'light'` (not JSON — read with `localStorage.getItem`
  directly in `analytics-tools.js:1556`, not through `ls()`).
- **Backup**: exported as `theme` (raw string). Restore (replace only) accepts either the raw
  string or a JSON-quoted string (`backup.js:100`: unwraps `'"dark"'`/`'"light"'`) and only
  writes it if the value is exactly `'dark'` or `'light'`.

### `wt_sess6` — finished workout sessions (`LS.sessions`)
- **Purpose**: the array of completed-workout records (history). See §6 for the record shape.
- **Written by**: `saveSessions()`; produced by `transitionSessionV18()`
  (`workout-runtime.js:1359-1361`) when a workout is finished, and rewritten wholesale by the
  history editor's undo/redo commits.
- **Backup**: exported as `sessions` (array), restored via `LS.sessions` — on **merge**,
  `mergeSessions(backup.sessions, currentSessions)` dedupes by
  `id || [date,dayName,startISO||startTime,durationMin].join('|')` and keeps one record per key
  (last-one-wins from array order, sorted by start time descending); on **replace** the backup's
  array is written verbatim.

### `wt_cyn6` — cycle notes (`LS.cynotes`)
- Opaque object, `getCyNotes`/`saveCyNotes`. Exported as `cynotes`, restored via `maps.cynotes`.

### `wt_rp6` — rest plan (`LS.restplan`)
- Opaque object, `getRestPlan`/`saveRestPlan`. Exported as `restplan`, restored via
  `maps.restplan`. Not to be confused with `wt_rest_log_v6` (§2), which is the *actual measured*
  rest-time log, or `wt_custom_rest` (per-exercise custom rest seconds).

### `wt_sc6` — extra-set counts (`LS.setcounts`)
- **Purpose**: how many *extra* sets (beyond the program default) the user has added per set-key,
  written by `setExtraSets`/read by `getExtraSets` (used in `addSet`/`removeSet`,
  `workout-runtime.js:238-263`) and remapped by `reconcilePositions`.
- **Shape**: `{ [setKey]: number }`.
- **Backup**: exported as `setcounts`, restored via `maps.setcounts`.

### `wt_pain6` — pain log (`LS.pain`)
- **Shape**: `{ [setKey]: { level: 0-10, date, exerciseId, exerciseName, cycle, week, day } }`,
  written by `setExPain()` (`gym-session-core.js:6-17`), read by `getPain()`. Cleaned up together
  with sets/setcounts/hidden in `reconcilePositions` and in the ghost-key cleanup inside
  `ensureDayLists()`.
- **Backup**: exported as `pain`, restored via `maps.pain`.

## 2. V6 keys (`V6_KEYS`, `src/app/v6-core.js:4-7`)

```js
const V6_KEYS={
  settings:'wt_v6_settings', restLog:'wt_rest_log_v6', draft:'wt_session_draft_v6',
  metaCut:'wt_program_meta_cut', metaBulk:'wt_program_meta_bulk',
  metaShared:'wt_program_meta_shared_v16', lastExternal:'wt_last_external_backup_v6'
};
```

### `wt_v6_settings` — progression/auto-rest settings
- **Shape**: `{progression, smartRest, restWarning, rpeUp, rpeDown, completionUp, painStop}`
  merged over `V6_DEFAULTS`. Written by `saveV6Settings()`.
- **Backup**: exported as `v6settings` (via the v6 wrapper of `buildBackupJSON`,
  `v6-core.js:263`). Restored **only on replace** (`buildRestorePlanV18` line 95,
  `v6settings:V6_KEYS.settings`); a merge import leaves current settings untouched.

### `wt_rest_log_v6` — measured rest-time samples
- **Shape**: array of `{id?, actualSec, ...}` entries (only `actualSec` and `id` are read back,
  by `renderV6Settings()`'s average and the merge-dedupe in backup.js).
- **Backup**: exported as `restLog` (top-level array field). Restore: on **replace**,
  `put(V6_KEYS.restLog, backup.restLog||[])` — replaced wholesale (or emptied if absent). On
  **merge**, entries from backup and current are combined, deduped by `r.id || JSON.stringify(r)`.

### `wt_session_draft_v6` — in-progress session draft
- Referenced as a managed/cleared key (`buildRestorePlanV18`'s `managed` array, and cleared with
  `null` when a session finishes: `transitionSessionV18` line 1361). **No code was found that
  writes a non-null value into this key in the reviewed sources** — it looks like the remnant of
  an older autosave-draft mechanism that has since been superseded by `wt_active_sess` +
  `wt_previous_day_draft_v18` (uncertain; flagged as likely-unused/legacy rather than confirmed
  dead, since it is still actively read as an object default via `ls(V6_KEYS.draft)`-style code
  paths were not found either).

### `wt_program_meta_shared_v16` — active program metadata (current, v16 shared model)
- **Shape**: `{version:2, shared:true, days:[{name,title,sub,active}, ...]}`.
- Written by `saveProgramMetaV6()`. Read/derived by `getProgramMetaV6()`, which merges over
  `defaultProgramMetaV6()`.
- **Backup**: exported as `programMeta.shared` (v6-core.js:263 sets
  `b.programMeta={shared:getProgramMetaV6(), cut:null, bulk:null}`). Restore (replace only):
  `put(V6_KEYS.metaShared, backup.programMeta?.shared || backup.programMeta?.cut ||
  backup.programMeta?.bulk)` — falls back to the legacy per-profile fields if a very old backup
  only has those. Not restored at all on merge.

### `wt_program_meta_cut` / `wt_program_meta_bulk` — **legacy, read-only in current code**
- These are the pre-v16 per-profile program metadata keys. `migrateProgramMetaV16()`
  (`v6-core.js:28-37`) reads them **once**, as a fallback, to build the initial
  `wt_program_meta_shared_v16` if that key doesn't exist yet. **No code path in `src/app`,
  `js/core` or the top-level `js/*.js` files was found that writes to these two keys** — they can
  only be present on a device that still has data from a version predating the v16 shared-daylist
  migration, or via `buildRestorePlanV18` writing `backup.programMeta.cut`/`.bulk` — but that
  restore path only writes `V6_KEYS.metaShared`, not these two keys directly, so **in the current
  code these two keys are read-only migration inputs and are never freshly written**. They are
  not covered by `MANAGED_LOCAL_KEYS`, so they also would *survive* a "replace" restore untouched
  if a device happened to still have them. **Finding, not a bug fix**: this is worth a cleanup
  task if migration is considered complete for all supported installs.

### `wt_last_external_backup_v6` — timestamp of the last *file* export
- Plain ISO-date string. Written by `exportData()` (`v6-core.js:274`) and mirrored into
  `wt_last_backup` (see §4) in the same call.
- **Backup**: exported as `lastExternal` (v6 wrapper). Restored **only on replace**
  (`buildRestorePlanV18` line 95, field `lastExternal`).

## 3. Legacy program/day-list keys (pre-v16, still read as fallback)

- `wt_daylist_cut`, `wt_daylist_bulk` — old, **per-profile** exercise/day lists. Migrated once by
  `migrateSharedDayListsV16()` (`src/app/workout-model.js:106-121`) into the single shared list
  `wt_daylist_shared_v16`, using a heuristic score (`dayListCustomizationScoreV16` +
  `dayListSetAlignmentScoreV16`) to decide whether the `cut` or `bulk` list is more likely to be
  the user's real customized program (ties go to `cut`). The migration result and the reasoning
  (`source, cutScore, bulkScore, cutAlignment, bulkAlignment`) are recorded in
  `wt_daylist_migration_v16` for auditability. The two legacy keys are **not deleted** by the
  migration (`legacyPreserved:true` in the migration record) — they simply stop being read once
  `wt_daylist_shared_v16` exists.
- `wt_daylist_shared_v16` — the **current** single day-list, shared between cut/bulk profiles
  (`SHARED_DAYLIST_KEY_V16`). Shape: `{ [dayIdx: string]: DayListItem[] }`, where a
  `DayListItem` is `{id, n0, m, r, rl, d, tip, extra, progMode, targetSets?, targetReps?,
  targetRpe?, lift531?, sw?: [{n,c,w}]}`. Written by `saveDayLists()`, mutated only through
  `mutateDayList()` (which always follows a mutation with `reconcilePositions`, §5).
- `wt_daylist_migration_v16` — one-shot migration audit record (`{version,date,source,
  cutScore,bulkScore,cutAlignment,bulkAlignment,legacyPreserved:true}`). Read by
  `migrateProgramMetaV16()` to know which legacy profile's program-meta to prefer.
- `wt_extra_ex`, `wt_ex_ordernames`, `wt_exswap` — **pre-daylist-model** per-exercise extras,
  custom ordering and swap overrides. Once `ensureDayLists()` runs (first time a shared day-list
  is built) these three keys are folded into the new `DayListItem`s and then **actively deleted**
  (`workout-model.js:191-193`: `localStorage.removeItem('wt_extra_ex')` etc.). They remain
  meaningful only as a legacy fallback inside `dayListFor()`/`buildDayExList()` for
  pre-migration state, and are still round-tripped by the backup format (`swaps`, `extra_ex`,
  `hidden_ex`… — note `hidden_ex` is a different, still-active key, see §3.1) for backward
  compatibility with older backup files. **On a fully migrated install these three keys are
  normally absent/empty** — a backup taken from such an install will export them as `{}`.
- `wt_hidden_ex` — **still active** (not folded away): per-set-key "hidden" flag map, read by
  `isExHidden()`/`getHiddenEx()`, cleaned up in `reconcilePositions` and the ghost-key sweep in
  `ensureDayLists()`. Exported/restored as `hidden_ex`.

## 4. Profile, phase and misc single-value keys

| Key | Purpose | Written by | In backup? |
|---|---|---|---|
| `wt_profile` | active phase (`'cut'`\|`'bulk'`\|`'maintain'`) | `setActiveProfile` (getActiveProfile/profile-strength.js) | Yes, field `profile`/`phase.active`; restore **replace-only** |
| `wt_531tm` | 5/3/1 training maxes | `set531TMs`/`get531TMs` (profile-strength.js) | Yes, field `tm531`; replace-only |
| `wt_531offset` | 5/3/1 cycle offset | `get531CycleOffset`/setter (profile-strength.js) | Yes, field `offset531`; replace-only |
| `wt_bwgoal` | body-weight goal | `getBWGoal`/setter | Yes, field `bwgoal`; replace-only |
| `wt_alarm6` | rest-timer alarm/notification settings | `getAlarmSettings`/setter | Yes, field `alarm`; replace-only |
| `wt_collars_kg` | plate-calculator collar weight | `getCollars`/setter | Yes, field `collars`; replace-only |
| `wt_goals` | user goals list (array) | direct `localStorage.setItem('wt_goals',...)` call sites | Yes, field `goals`; replace-only |
| `wt_kg_step` / `wt_reps_step` | +/- stepper increments | direct `localStorage.setItem` | Yes, fields `kg_step`/`reps_step`; replace-only |
| `wt_sugs6` | cycle-end progression suggestions | `renderCycle`-family code | Yes, field `sugs` (array **or** object — both forms accepted); replace-only |
| `wt_colors` | custom theme accent colors | `getStoredColors`/setter (ui-shell.js) | Yes, field `colors`; replace-only |
| `wt_custom_rest` | per-exercise custom rest override | `getCustomRest`/`setCustomRestFor` (bootstrap.js) | Yes, field `custom_rest`; replace-only |
| `wt_custom_ex` (via `CUST_KEY`) | user-added custom exercise definitions | direct set | Yes, field `custom_ex`; replace-only |
| `wt_daylog` | free-form day log/journal | direct set | Yes, field `daylog`; replace-only |
| `wt_rep_prs` | rep-based PR tracking | direct set, remapped in `reconcilePositions`-adjacent code | Yes, field `rep_prs`; replace-only |
| `wt_phases` | historical phase-change log (array) | direct set | Yes, field `phases`; replace-only |
| `wt_compact` | compact-cards display toggle (`'1'`/`'0'`) | `setCompactMode()` (bootstrap.js, plain `localStorage.setItem`, **not** `safeSetRaw`) | Yes, field `compact` (boolean); replace-only |
| `wt_gym_mode` | gym/focus-mode toggle (`'1'`/`'0'`) | `setGymMode()` (**does** use `safeSetRaw`) | Yes, field `gym_mode` (boolean); replace-only |
| `wt_onboarding_done` | first-run onboarding completed flag | `finishOnboarding()` | **No** — not in any backup field list |
| `wt_active_ex` | currently gym-mode-focused exercise's set-key | `setGymFocus()` | **No** |
| `wt_last_page` | last-opened app page/route, for reload restore | `showPage()`/`ui-shell.js:142` | **No** |
| `wt_last_week` / `wt_last_day` | last-viewed week/day index | `setWeek()`/day-select code (`workout-ui.js`); also force-reset to `'0'` by restore (replace mode, `backup.js:104`) | **No** (write-only reset on restore) |
| `wt_notif_warned` | "notifications blocked" one-time toast flag | `startT()` (workout-runtime.js) | **No** |
| `wt_last_backup` | timestamp of the most recent *file* export | `exportData()` | **No** (it's a UI status field, not restored) |
| `wt_last_idb_backup` | timestamp of the most recent *local IndexedDB* snapshot | `autoBackupToIDB()` | **No** |
| `wt_plate_calc_exercises_v13` | plate-calculator per-exercise preferences | direct set (`PLATE_PREF_KEY`, v6-core.js) | Yes, field `platePrefsV13`; **restored on both replace and merge** (`maps.platePrefsV13`) |
| `wt_ai_key` | leftover key from a removed "AI chat" feature | **never written** in current code — only ever `localStorage.removeItem('wt_ai_key')` (`src/app/main.js:32`, run at startup) and asserted absent by a self-test (`v6-core.js:287`) | **No** — dead/legacy, actively swept on every load |
| `wt_v6_last_test` | last self-test-suite run result (`{date,pass,total}`) | internal QA self-test runner (`v6-core.js`) | **No** — diagnostic only |
| `wt_release_version` | last-applied patch/migration version tag | version-migration runner (`v6-core.js:1870`, `safeSetRaw`) | **No** |
| `wt_v11_rpe_touched_<id>` | per-set "user manually touched RPE" flag (dynamic suffix, `TOUCHED_PREFIX` = `'wt_v11_rpe_touched_'`) | RPE-input handler (v6-core.js) | **No** |
| `wt_dl_renamed` | one-time "day list renamed" migration flag | `src/app/main.js:23` | **No** |
| `wt_extra_nav_safe_v1` | one-time nav-safety patch flag (`js/ui-safe-v1.js`) | `js/ui-safe-v1.js` | **No** |
| `wt_android_update_last_check` | Android in-app-update check throttle timestamp (`js/app-update.js`) | `js/app-update.js` | **No** |
| `wt_exact_alarm_v2_warning` | one-time "exact alarm permission" warning flag (`js/rest-native-notifications.js`) | `js/rest-native-notifications.js` | **No** |

`wt_last_week`/`wt_last_day` are explicitly force-reset to `'0'` by a **replace**-mode restore
(`backup.js:104`), regardless of what was in the backup — this looks intentional (start the
restored data at week/day 0) but is called out here since it means those two keys' *previous*
value in the backup file itself, if any, is never actually used.

## 5. Set-key format and `reconcilePositions`

Every exercise-set is addressed by a synthetic string key, built by `sdk()`
(`src/app/workout-model.js:42`):

```js
function sdk(c,w,d,e){ return `c${c}w${w}d${d}e${e}`; }
```

i.e. `c{cycle}w{weekIdx}d{dayIdx}e{exerciseIdx}` — **all four numbers are 0-based except
`cycle`, which is 1-based** (see `getCyc()` defaulting `num` to `1`). This key is used, unchanged,
as the map key inside `wt_s6` (sets), `wt_sc6` (extra-set counts), `wt_pain6` (pain), and
`wt_hidden_ex` (hidden flags); `wt_p6` (PRs) uses a related but distinct key,
`'pr'+dayIdx+exIdx'` (no cycle/week component).

Because the key embeds the exercise's **positional index** within a day (`exIdx`), reordering,
inserting or deleting an exercise in the day-list would otherwise silently reassign one
exercise's recorded history to another position. `reconcilePositions(di, oldIds, newIds)`
(`workout-model.js:198-217`) prevents this: it is called by `mutateDayList()` immediately after
every day-list mutation, and remaps data for **every existing cycle (1..current) × every week
(0..3)**:

1. For each old position `i` (`oldIds[i]`), read out and *delete* the `wt_s6`/`wt_sc6`/
   `wt_hidden_ex`/`wt_pain6` entries at `sdk(c,w,di,i)`, keyed temporarily by the exercise's
   stable `id` (not its index).
2. For each new position `i` (`newIds[i]`), if that stable id existed in the old set, write its
   saved data back at the *new* `sdk(c,w,di,i)`.
3. Anything whose stable id is not present in `newIds` (an exercise that was removed) is dropped.
4. PRs (`wt_p6`) are remapped the same way using the day-scoped `'pr'+di+i'` key form.

This is the only sanctioned way to change a day's exercise list — comments in the code
(`workout-model.js:195-197`, `workout-runtime.js:218-226`) explicitly warn that an older version
of the app used to swap data between positions incorrectly, and that this function is what fixed
it "from this version on".

## 6. Session record shape (`wt_sess6` entries)

Built by `buildImmutableSessionRecord()` + `buildSessionSnapshot()`
(`src/app/gym-session-core.js:84-123`):

```json
{
  "schemaVersion": 4,
  "id": "sess_1758700000000_ab12cd",
  "date": "2026-09-24",
  "startISO": "2026-09-24T17:00:00.000Z",
  "endISO": "2026-09-24T18:05:00.000Z",
  "dayName": "Push A",
  "dayIdx": 0,
  "weekNum": 1,
  "weekIdx": 0,
  "cycle": 1,
  "profile": "bulk",
  "startTime": "19:00",
  "endTime": "20:05",
  "durationMin": 65,
  "totals": {"sets": 12, "doneSets": 11, "tonnage": 4820, "maxPain": 0},
  "exercises": [
    {
      "key": "c1w0d0e0",
      "exerciseId": "ex_barbell-bench-press",
      "rosterId": "barbell-bench-press-ab12c",
      "name": "Barbell bench press",
      "originalName": "Barbell bench press",
      "isExtra": false,
      "isMain": true,
      "loadType": "external",
      "targetSets": 3,
      "targetReps": "6-8",
      "targetRpe": 8,
      "pain": 0,
      "sets": [
        {"id":"c1w0d0e0:0","sessionId":null,"set":1,"kg":60,"reps":8,"rpe":8,"done":true,
         "type":"work","drop":false,"note":"","volume":480,
         "exerciseId":"ex_barbell-bench-press","rosterId":"barbell-bench-press-ab12c",
         "exName":"Barbell bench press"}
      ]
    }
  ],
  "snapshotLocked": true
}
```

Notes:
- `snapshotLocked:true` marks the record as an immutable historical snapshot — the History editor
  (`js/history-editor.js`, `js/compact-shell.js`) is the only path that mutates it afterwards, and
  it always does so via a full `commitStorageBatch` of `sets`+`sessions`+`pr` together with a
  paired undo entry (see §8).
- A set is retained in the snapshot even if the exercise's current target-set count was later
  reduced, as long as it was `done` (`retainedCount` logic, line 111) — completed work is never
  silently dropped from history.
- `warmup` sets (`type==='warmup'` or `warm===true`) are excluded from the `totals` counters but
  are still recorded in `exercises[].sets`.

## 7. Write paths: `safeSetRaw`, journaling, batch commit, retry

All of this lives in `js/core/state-storage.js`.

- **`safeSetRaw(k,v)`**: the base primitive. Writes with `localStorage.setItem`, **reads the
  value back and compares** it (`StorageVerificationError` if mismatched — guards against silent
  truncation on low storage), and on any failure (quota, verification) records the key in the
  in-memory `pendingStorageWrites` map instead of losing the write, flips a global
  "not saved" UI flag (`window.__WT_STORAGE_ERROR__`, `#storage-error-banner`,
  `markSaveStateV15`), and shows a one-time toast/alert. `lss(k,v)` is `safeSetRaw(k,
  JSON.stringify(v))` for object values.
- **`pendingStorageWrites`** (`Map<key,value|null>`): failed single-key writes/removals that
  still need to be retried. `retryPendingStorageWrites()` replays them (delete for `null`,
  set otherwise) and clears the map on success.
- **`commitStorageBatch(changes: Map<key,value|null>)`**: the atomic multi-key write path used
  for anything that must change several keys together (finishing a session, restoring a backup,
  history-editor corrections, plan edits). Sequence:
  1. Refuses to start if there are already-pending single-key writes
     (`storageHasPendingWrites()`), so a batch never races an unretried failure.
  2. Snapshots the **current** value of every key about to change into
     `before = [[key, localStorage.getItem(key)], ...]` and writes that snapshot to the durable
     journal key `wt_storage_journal_v18` (`STORAGE_JOURNAL_KEY`) **before** touching any real
     key ("acknowledged before any active data changes").
  3. Applies deletions (`value===null`) then sets, verifying each write like `safeSetRaw` does.
  4. On full success, deletes the journal key.
  5. On any failure mid-way, rolls back every key in `before` to its pre-batch value
     (`restoreStorageEntries`) and deletes the journal — **unless the rollback itself throws**, in
     which case `storageRecoveryError` is set and the journal is deliberately **left in place**
     so it can be recovered on next load.
  6. Whether or not the rollback succeeded, the whole attempted batch (`{entries, before}`) is
     kept in `pendingBatchWrites` so the "not saved" indicator stays correctly on and
     `retryPendingStorageWrites()` can replay the exact same batch later — but only if none of its
     target keys were written by something else in the meantime (`batch.before.every(([key,value])
     =>localStorage.getItem(key)===value)`), so a newer successful write is never clobbered by
     replaying a stale failed batch.
- **`recoverStorageJournal()`**: runs once at load (`state-storage.js:131`) and again from
  `retryPendingStorageWrites()` if `storageRecoveryError` is set. If `wt_storage_journal_v18`
  exists, it validates the journal's shape strictly (`Array` of `[key,value]` pairs, each key
  matching `/^wt_[\w]+$/` and not equal to the journal key itself, values are `null` or strings)
  before restoring it — a defensive check against a corrupted/tampered journal — then removes the
  journal key.
- **Not everything goes through this path.** `wt_compact` (`bootstrap.js:52`) and the active-timer
  key `wt_active_timer` (`workout-runtime.js:1171/1181/1190`) are written with plain
  `localStorage.setItem`/`removeItem`, bypassing `safeSetRaw`/journaling — a quota failure on
  either of those would be silent (not surfaced by the "not saved" banner, not retried). This is
  a **finding**, not something fixed as part of this task.

## 8. Undo-buffer keys (single-slot, transient, not exported)

These hold exactly one "before" snapshot each, to support a single Undo action in their
respective editors. None of them appear in the backup export or the restore plan's field maps —
**however, `wt_undo_v15` is explicitly cleared (`null`) by a replace-mode restore** (it's in the
`managed` array in `buildRestorePlanV18`), while **`wt_history_undo_v24`, `wt_plan_undo_v26` and
`wt_bw_undo_v27` are not** — a stale undo buffer from before a restore can still be present
afterwards, and "Undo" in those editors would then try to undo *into* pre-restore state. This
is flagged as a **potential inconsistency finding**, not fixed here.

| Key | Set by | Undone by |
|---|---|---|
| `wt_undo_v15` | v6-core.js save-state helper | (save-state internal use; cleared by replace-restore) |
| `wt_history_undo_v24` | `js/history-editor.js` / `js/compact-shell.js` history edits | same files' "Razveljavi" (undo) action |
| `wt_plan_undo_v26` | `js/compact-ui.js` / `js/compact-shell.js` plan/day editor edits | same files |
| `wt_bw_undo_v27` | `js/compact-shell.js` `editWeight()` | (referenced as the rollback snapshot for that edit) |
| `wt_previous_day_draft_v18` | `transitionSessionV18()` when starting a new attempt over an already-completed day | `restorePreviousDayDraftV18()` |

## 9. IndexedDB stores

Database name: **`wt_photos`**, version 2 (`src/app/analytics-tools.js:1409-1424`,
`openPhotoDB()`). Two object stores, both `keyPath:'id', autoIncrement:true`:

- **`photos`**: `{id, date: ISOString, blob: dataURL string}`. Written by `savePhoto()` (from a
  `<input type=file>` via `FileReader.readAsDataURL`), read by `getAllPhotos()`, deleted by
  `deletePhoto(id)`. Included in the file-export backup only when `includePhotos=true`
  (`buildBackupJSON(true)`, used by `exportData()`); restore imports them through a **separate
  IndexedDB transaction**, not through `commitStorageBatch` — on `mode==='replace'` the store is
  cleared first, on `merge` new photos are just added — and the user is asked to confirm the
  photo import specifically, after the rest of the data is already restored
  (`restoreBackupObjectP1`, `gym-session-core.js:186-199`). A failed photo import does not roll
  back the already-restored LS data; it's reported to the user as a separate, non-fatal error.
- **`backups`**: `{id, date, label, blob: JSON string, sizeKB}` — local, on-device backup
  snapshots taken automatically after every finished workout (`autoBackupToIDB()`, without
  photos) and once before every restore (`saveBackupToIDB(rollback, 'rollback-before-import')`,
  with label `'rollback-before-import'`, also without photos since it's built with
  `buildBackupJSON(false)`). `pruneOldBackups(12)` keeps at most the 12 most recent snapshots
  (best-effort — failures are only logged). These snapshots live only in this browser/WebView's
  IndexedDB; clearing app/site data removes them, and they are not themselves exported by the
  file-based backup.

## 10. Program/day-list model summary

- **Current (v16+) model**: one shared list of exercises per day, independent of cut/bulk phase,
  in `wt_daylist_shared_v16`. The active phase (`wt_profile`) only changes which
  `PROG.days[i].ex[j].m`/week percentages/rep-schemes apply, not which exercises exist.
  `wt_program_meta_shared_v16` holds the *day list*'s own metadata (names/titles/active flag),
  separate from the exercises inside each day.
- **Legacy (pre-v16) model**: separate `wt_daylist_cut`/`wt_daylist_bulk` day lists per phase, plus
  separate `wt_extra_ex`/`wt_ex_ordernames`/`wt_exswap` overlays and separate
  `wt_program_meta_cut`/`wt_program_meta_bulk` metadata. `migrateSharedDayListsV16()` and
  `migrateProgramMetaV16()` convert this to the v16 model the first time either is needed; the
  legacy source keys are left in place (not deleted) except for `wt_extra_ex`/`wt_ex_ordernames`/
  `wt_exswap`, which `ensureDayLists()` actively deletes once folded into the new day-list.

## 11. "Done" / "planned" / "warm-up" semantics

A `SetRow` inside `wt_s6` represents one planned-or-recorded set:
- **Planned but not done**: `done` is falsy (`false`/`undefined`). A day/week/exercise counts a
  set as still outstanding if `!s.done` for any of its first *N* rows, where *N* is the
  currently-configured target-set count (`nsf()`/`exerciseTargetSetsV19()`, base program value +
  any user-added extra sets from `wt_sc6`).
- **Done**: `done===true`. Only `done` sets are counted toward `totals.doneSets`, tonnage
  (`kg*reps`), best-e1RM (`smartCycleSuggestion`), and "is a PR" checks.
- **Warm-up**: a set is a warm-up if `type==='warmup'` **or** the legacy boolean `warm===true`
  (both forms are checked, e.g. `buildSessionSnapshot` line 116 and
  `workout-runtime.js:976`). Warm-up sets are excluded from `totalSets`/`totalDone`/tonnage
  counters but are still stored and still shown in the exercise's set list and in session
  history — they are not a separate storage key, just a per-row flag.
- **Hidden**: entirely separate concept, `wt_hidden_ex`, — an exercise/set-key can be hidden from
  the "is this day complete" calculation (`isDayComplete()` skips keys present in
  `getHiddenEx()`), independent of whether it has any recorded sets.

## 12. Pravila za spremembe (rules for changes)

1. **Nikoli ne preimenuj obstoječih `localStorage` ključev.** Vsak ključ tukaj je v uporabi na
   napravah uporabnikov; preimenovanje pomeni takojšnjo izgubo podatkov ob naslednjem nalaganju,
   razen če je hkrati napisana eksplicitna migracija, ki prebere stari ključ in zapiše novega
   (glej `migrateSharedDayListsV16`/`migrateProgramMetaV16` kot vzorec: preberi staro, zapiši
   novo, **ne** briši starega, dokler ni jasno, da noben nameščen odjemalec še ni migriral).
2. **Backup je prednosten pri vsaki migraciji sheme.** Preden se doda nov ključ v
   `MANAGED_LOCAL_KEYS`/`managed` seznam v `buildRestorePlanV18` ali se spremeni pomen obstoječega
   polja v `validateBackupV18`, mora `schemaVersion` v `buildBackupJSON`/`v6-core.js`-ovojnici
   ustrezno narasti, stari backupi pa morajo ostati berljivi (glej `version<1||version>7` mejo in
   toleranco za `sugs` array-ali-objekt obliko kot primer nazaj-združljive validacije).
3. **Vsak nov `localStorage` ključ z znanim pomenom naj gre skozi `safeSetRaw`/`lss`/
   `commitStorageBatch`**, ne skozi gol `localStorage.setItem`, razen za resnično prehodne UI-flag
   ključe (npr. `wt_last_page`), kjer izguba zapisa ni usodna. Za karkoli, kar mora biti atomarno
   z drugim ključem (npr. seti + seje + PR-ji), uporabi `commitStorageBatch`, ne zaporednih
   posameznih zapisov.
4. **Po vsaki spremembi day-lista pokliči `mutateDayList()`**, nikoli ne piši neposredno v
   `wt_daylist_shared_v16` — sicer se pozicijski podatki (seti, bolečina, skrito, PR-ji) ne bodo
   preslikali in bodo pripisani napačni vaji.
5. **Po vsaki spremembi tega shranjevalnega modela zgradi bundle** (`tools/build-app-bundle.cjs`,
   preveri z `npm test` — testni sklop na koncu poganja "CODE AUDIT", ki prešteje datoteke,
   funkcije in preveri podvojene ID-je/funkcije v zgrajenem `js/app.js`), sicer se `js/app.js`
   (dejanski zagnani bundle) razide od `src/app`/`js/core` virov.
6. **Ne dodajaj podatkov, ki bi jih bilo treba počistiti ob "Zamenjaj" (replace) restore, ne da bi
   jih dodal tudi v `MANAGED_LOCAL_KEYS`/`managed`** — sicer bo "replace" pustil osirotele stare
   podatke poleg na novo obnovljenih (glej najdbo o `wt_history_undo_v24`/`wt_plan_undo_v26`/
   `wt_bw_undo_v27` v §8).

## 13. Znane nedoslednosti / uncertain (findings — ne popravljeno v tem opravilu)

- `wt_program_meta_cut`/`wt_program_meta_bulk` so berljive samo za enkratno migracijo in jih noben
  najden del kode ne zapisuje več (§2) — kandidat za odstranitev, če je migracija za vse
  nameščene odjemalce zaključena.
- `wt_ai_key` je mrtev ključ: nikoli se ne zapiše, samo briše ob zagonu in preverja z self-testom,
  da ga ni (§4) — ostanek odstranjene "AI chat" funkcije.
- `wt_compact` in `wt_active_timer` se pišeta mimo `safeSetRaw`/journaling (§7) — napaka pri
  shranjevanju teh dveh ključev ne bi sprožila banner-ja "ni shranjeno" niti retry logike.
- Undo-buferji `wt_history_undo_v24`, `wt_plan_undo_v26`, `wt_bw_undo_v27` niso počiščeni ob
  "Zamenjaj" restore (§8), za razliko od `wt_undo_v15`, ki je.
- `wt_session_draft_v6` je referenciran kot upravljan/počiščen ključ, a v pregledanih virih ni bilo
  najdeno mesto, ki bi vanj kdaj zapisalo neničelno vrednost — verjetno ostanek starejšega
  mehanizma (§2).
- `wt_m6` (meritve telesa) ostaja v modelu podatkov in v backupu, čeprav je namenska stran v UI
  odstranjena (§1) — podatki niso izgubljeni, samo brez namenskega urejevalnika v trenutni UI.
- `wt_notes` (`wt_n6`) — v pregledanih virih ni bilo najdeno mesto zunaj `state-storage.js`/
  backup poti, ki bi klicalo `saveNotes()`; negotovo, ali je funkcija za urejanje opomb še
  dosegljiva iz UI.
