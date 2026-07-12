(function () {
  'use strict';

  if (window.WTSetLog && window.WTSetLog.version) return;

  const VERSION = '1.0.0';
  const PANEL_ID = 'wt-set-log-panel';
  const STYLE_ID = 'wt-set-log-style';
  const INPUT_ID = 'wt-set-log-rpe';
  const BUTTON_ID = 'wt-set-log-button';

  let busy = false;
  let renderPending = false;
  let focusAfterRender = false;
  let lastContextId = '';

  function warn(label, error) {
    console.warn('WT set log: ' + label, error);
  }

  function scheduleRender(delay) {
    if (renderPending) return;
    renderPending = true;
    window.setTimeout(function () {
      renderPending = false;
      render();
    }, Number.isFinite(delay) ? delay : 0);
  }

  function parseExerciseKey(key) {
    const match = String(key || '').match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);
    if (!match) return null;

    return {
      key: String(key),
      cycle: Number(match[1]),
      week: Number(match[2]),
      day: Number(match[3]),
      exercise: Number(match[4])
    };
  }

  function normalizedDecimal(value) {
    return String(value ?? '').trim().replace(',', '.');
  }

  function displayNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return Number.isInteger(number) ? String(number) : String(number).replace('.', ',');
  }

  function validRpe(value) {
    const number = Number(normalizedDecimal(value));

    if (!Number.isFinite(number) || number < 5 || number > 10) {
      return null;
    }

    if (Math.abs(number * 2 - Math.round(number * 2)) > 0.001) {
      return null;
    }

    return Math.round(number * 2) / 2;
  }

  function getProgram() {
    try {
      if (typeof PROG !== 'undefined') return PROG;
    } catch (error) {
      warn('program binding', error);
    }

    return window.PROG || null;
  }

  function getExerciseName(context) {
    try {
      if (typeof window.currentExerciseName === 'function') {
        return window.currentExerciseName(
          context.day,
          context.exercise,
          context.key
        );
      }

      return getProgram()?.days?.[context.day]?.ex?.[context.exercise]?.n || 'Aktivna vaja';
    } catch (error) {
      warn('exercise name', error);
      return 'Aktivna vaja';
    }
  }

  function readSetValues(context, setIndex, setData) {
    const row = document.getElementById(
      'row-' + context.key + '-' + setIndex
    );

    const kgInput = row ? row.querySelector('input.wi, .wi') : null;
    const repsInput = row ? row.querySelector('input.ri, .ri') : null;

    const kgRaw = normalizedDecimal(
      kgInput ? kgInput.value : (setData?.kg ?? '')
    );
    const repsRaw = normalizedDecimal(
      repsInput ? repsInput.value : (setData?.reps ?? '')
    );

    const kg = kgRaw === '' ? null : Number(kgRaw);
    const reps = repsRaw === '' ? null : Number(repsRaw);

    return {
      row,
      kgInput,
      repsInput,
      kgRaw,
      repsRaw,
      kg,
      reps,
      validKg: kgRaw !== '' && Number.isFinite(kg) && kg >= 0,
      validReps:
        repsRaw !== '' &&
        Number.isFinite(reps) &&
        Number.isInteger(reps) &&
        reps > 0
    };
  }

  function currentSetContext() {
    if (
      typeof window.getGymMode !== 'function' ||
      typeof window.getSets !== 'function' ||
      typeof window.nsf !== 'function'
    ) {
      return { ready: false };
    }

    if (!window.getGymMode()) {
      return { ready: true, gymMode: false };
    }

    let key = localStorage.getItem('wt_active_ex') || '';

    if (!key && typeof window.findNextPendingExerciseKey === 'function') {
      key = window.findNextPendingExerciseKey() || '';
    }

    const parsed = parseExerciseKey(key);

    if (!parsed) {
      return {
        ready: true,
        gymMode: true,
        complete: true
      };
    }

    const weekPlan = getProgram()?.weeks?.[parsed.week];

    if (!weekPlan) {
      return {
        ready: true,
        gymMode: true,
        complete: true
      };
    }

    const totalSets = Math.max(
      1,
      Number(
        window.nsf(
          parsed.day,
          parsed.exercise,
          weekPlan,
          parsed.key
        )
      ) || 1
    );

    const allSets = window.getSets();
    const exerciseSets = Array.isArray(allSets[parsed.key])
      ? allSets[parsed.key]
      : [];

    let setIndex = -1;

    for (let index = 0; index < totalSets; index += 1) {
      if (!exerciseSets[index] || !exerciseSets[index].done) {
        setIndex = index;
        break;
      }
    }

    if (setIndex < 0) {
      return {
        ready: true,
        gymMode: true,
        complete: true,
        ...parsed,
        totalSets
      };
    }

    const setData = exerciseSets[setIndex] || {};
    const values = readSetValues(parsed, setIndex, setData);

    return {
      ready: true,
      gymMode: true,
      complete: false,
      ...parsed,
      totalSets,
      setIndex,
      setData,
      values,
      exerciseName: getExerciseName(parsed)
    };
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .wt-set-log {
        display:none;
        margin:0 0 .75rem;
        padding:12px;
        border:1px solid var(--green);
        border-radius:12px;
        background:linear-gradient(180deg,var(--green-bg),var(--bg2));
        box-shadow:0 8px 22px rgba(0,0,0,.14);
      }
      .gym-mode .wt-set-log { display:block; }
      .wt-set-log-head {
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:10px;
        margin-bottom:9px;
      }
      .wt-set-log-eyebrow {
        color:var(--green-text);
        font-size:11px;
        font-weight:800;
        letter-spacing:.05em;
        text-transform:uppercase;
      }
      .wt-set-log-name {
        margin-top:2px;
        color:var(--text);
        font-size:14px;
        font-weight:700;
        line-height:1.25;
      }
      .wt-set-log-set {
        flex:none;
        padding:4px 9px;
        border:.5px solid var(--green);
        border-radius:999px;
        color:var(--green-text);
        background:var(--bg2);
        font-size:11px;
        font-weight:800;
      }
      .wt-set-log-main {
        display:grid;
        grid-template-columns:minmax(0,1fr) 88px minmax(108px,.72fr);
        gap:8px;
        align-items:stretch;
      }
      .wt-set-log-load {
        display:flex;
        align-items:center;
        min-height:46px;
        padding:8px 11px;
        border:.5px solid var(--border2);
        border-radius:9px;
        background:var(--bg3);
        color:var(--text);
        font-size:18px;
        font-weight:800;
        white-space:nowrap;
      }
      .wt-set-log-rpe {
        width:100%;
        min-height:46px;
        padding:8px 6px;
        border:1px solid var(--border2);
        border-radius:9px;
        background:var(--bg3);
        color:var(--text);
        font:800 19px system-ui,sans-serif;
        text-align:center;
      }
      .wt-set-log-rpe:focus {
        outline:none;
        border-color:var(--green);
        box-shadow:0 0 0 3px rgba(29,158,117,.16);
      }
      .wt-set-log-rpe.invalid {
        border-color:var(--red);
        background:var(--red-bg);
      }
      .wt-set-log-button {
        min-height:46px;
        padding:8px 10px;
        border:1px solid var(--green);
        border-radius:9px;
        background:var(--green);
        color:#fff;
        font:800 13px system-ui,sans-serif;
        cursor:pointer;
      }
      .wt-set-log-button:disabled {
        cursor:not-allowed;
        opacity:.48;
      }
      .wt-set-log-note {
        min-height:17px;
        margin-top:7px;
        color:var(--text3);
        font-size:11px;
        line-height:1.4;
      }
      .wt-set-log-note.error { color:var(--red-text); }
      .wt-set-log-note.ok { color:var(--green-text); }
      @media(max-width:430px) {
        .wt-set-log-main {
          grid-template-columns:minmax(0,1fr) 78px;
        }
        .wt-set-log-button {
          grid-column:1/-1;
        }
        .wt-set-log-load {
          font-size:17px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;

    const focusBar = document.getElementById('gym-focusbar');
    const workoutPage = document.getElementById('page-workout');

    if (!focusBar || !workoutPage) return null;

    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'wt-set-log';
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = `
      <div class="wt-set-log-head">
        <div>
          <div class="wt-set-log-eyebrow" id="wt-set-log-eyebrow">Naslednji set</div>
          <div class="wt-set-log-name" id="wt-set-log-name">Aktivna vaja</div>
        </div>
        <div class="wt-set-log-set" id="wt-set-log-set">Set —</div>
      </div>
      <div class="wt-set-log-main">
        <div class="wt-set-log-load" id="wt-set-log-load">— kg × — pon</div>
        <input
          class="wt-set-log-rpe"
          id="${INPUT_ID}"
          type="text"
          inputmode="decimal"
          enterkeyhint="done"
          autocomplete="off"
          maxlength="4"
          placeholder="RPE"
          aria-label="RPE za trenutni set"
        >
        <button class="wt-set-log-button" id="${BUTTON_ID}" type="button">✓ Log set</button>
      </div>
      <div class="wt-set-log-note" id="wt-set-log-note">
        Vpiši RPE 5–10. Enter potrdi set.
      </div>
    `;

    focusBar.insertAdjacentElement('afterend', panel);

    const input = panel.querySelector('#' + INPUT_ID);
    const button = panel.querySelector('#' + BUTTON_ID);

    input.addEventListener('input', function () {
      input.classList.remove('invalid');
      updateButtonState();
    });

    input.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      logCurrentSet();
    });

    button.addEventListener('click', logCurrentSet);

    return panel;
  }

  function panelElements() {
    const panel = ensurePanel();
    if (!panel) return null;

    return {
      panel,
      eyebrow: panel.querySelector('#wt-set-log-eyebrow'),
      name: panel.querySelector('#wt-set-log-name'),
      set: panel.querySelector('#wt-set-log-set'),
      load: panel.querySelector('#wt-set-log-load'),
      input: panel.querySelector('#' + INPUT_ID),
      button: panel.querySelector('#' + BUTTON_ID),
      note: panel.querySelector('#wt-set-log-note')
    };
  }

  function setNote(elements, message, type) {
    elements.note.textContent = message;
    elements.note.className =
      'wt-set-log-note' + (type ? ' ' + type : '');
  }

  function updateButtonState() {
    const elements = panelElements();
    if (!elements) return;

    const context = currentSetContext();
    const rpe = validRpe(elements.input.value);

    const canLog =
      !busy &&
      context.ready &&
      context.gymMode &&
      !context.complete &&
      context.values.validKg &&
      context.values.validReps &&
      rpe !== null;

    elements.button.disabled = !canLog;
  }

  function render() {
    installStyles();

    const elements = panelElements();
    if (!elements) return;

    const context = currentSetContext();

    if (!context.ready) {
      elements.panel.hidden = true;
      return;
    }

    elements.panel.hidden = !context.gymMode;

    if (!context.gymMode) return;

    if (context.complete) {
      lastContextId = '';
      elements.eyebrow.textContent = 'Trening';
      elements.name.textContent = 'Vsi seti so zaključeni';
      elements.set.textContent = '✓';
      elements.load.textContent = 'Končano';
      elements.input.value = '';
      elements.input.disabled = true;
      elements.button.disabled = true;
      elements.button.textContent = '✓ Končano';
      setNote(elements, 'Zaključi session, ko končaš trening.', 'ok');
      return;
    }

    const contextId = context.key + ':' + context.setIndex;

    if (contextId !== lastContextId) {
      lastContextId = contextId;
      elements.input.value = '';
      elements.input.classList.remove('invalid');
    }

    elements.input.disabled = false;
    elements.eyebrow.textContent = 'Naslednji set';
    elements.name.textContent = context.exerciseName;
    elements.set.textContent =
      'Set ' + (context.setIndex + 1) + '/' + context.totalSets;

    const kgText = context.values.validKg
      ? displayNumber(context.values.kg)
      : '—';
    const repsText = context.values.validReps
      ? displayNumber(context.values.reps)
      : '—';

    elements.load.textContent =
      kgText + ' kg × ' + repsText + ' pon';

    elements.button.textContent = busy ? 'Shranjujem …' : '✓ Log set';

    if (!context.values.validKg || !context.values.validReps) {
      setNote(
        elements,
        'Najprej v označenem setu vnesi veljavne kg in ponovitve.',
        'error'
      );
    } else {
      setNote(
        elements,
        'Vpiši samo RPE 5–10. Dovoljene so tudi polovice, npr. 8,5.',
        ''
      );
    }

    updateButtonState();

    if (focusAfterRender) {
      focusAfterRender = false;
      window.setTimeout(function () {
        if (!elements.input.disabled) {
          elements.input.focus();
          elements.input.select();
        }
      }, 80);
    }
  }

  function syncVisibleRpe(context, rpe) {
    const row = document.getElementById(
      'rpe-' + context.key + '-' + context.setIndex
    );

    if (!row) return;

    row.querySelectorAll('.rpe-chip').forEach(function (chip) {
      const chipRpe = Number(
        normalizedDecimal(chip.textContent)
      );
      const selected = Math.abs(chipRpe - rpe) < 0.001;

      chip.className =
        'rpe-chip' +
        (
          selected
            ? (rpe >= 9 ? ' sel high' : rpe >= 8 ? ' sel med' : ' sel')
            : ''
        );
    });
  }

  function persistCurrentSet(context, rpe) {
    const allSets = window.getSets();

    if (!Array.isArray(allSets[context.key])) {
      allSets[context.key] = [];
    }

    while (allSets[context.key].length <= context.setIndex) {
      allSets[context.key].push({
        kg: '',
        reps: '',
        done: false
      });
    }

    const set = allSets[context.key][context.setIndex];
    set.kg = context.values.kgRaw;
    set.reps = String(context.values.reps);
    set.rpe = rpe;

    if (typeof window.currentExerciseName === 'function') {
      const name = window.currentExerciseName(
        context.day,
        context.exercise,
        context.key
      );

      if (name) {
        set.exName = name;

        if (typeof window.exStableId === 'function') {
          set.exerciseId = window.exStableId(name);
        }
      }
    }

    window.saveSets(allSets);
    syncVisibleRpe(context, rpe);
  }

  function logCurrentSet() {
    if (busy) return;

    const elements = panelElements();
    const context = currentSetContext();

    if (
      !elements ||
      !context.ready ||
      !context.gymMode ||
      context.complete
    ) {
      return;
    }

    const rpe = validRpe(elements.input.value);

    if (rpe === null) {
      elements.input.classList.add('invalid');
      setNote(
        elements,
        'RPE mora biti med 5 in 10, v koraku 0,5.',
        'error'
      );
      elements.input.focus();
      elements.input.select();
      return;
    }

    if (!context.values.validKg || !context.values.validReps) {
      setNote(
        elements,
        'Set ni potrjen: manjkajo veljavni kg ali ponovitve.',
        'error'
      );
      return;
    }

    if (context.setData?.done) {
      scheduleRender();
      return;
    }

    if (typeof window.tgSet !== 'function') {
      setNote(
        elements,
        'Set ni potrjen: funkcija za shranjevanje ni na voljo.',
        'error'
      );
      return;
    }

    busy = true;
    elements.button.disabled = true;
    elements.button.textContent = 'Shranjujem …';

    try {
      persistCurrentSet(context, rpe);

      window.tgSet(
        context.key,
        context.setIndex,
        context.day,
        context.exercise,
        context.cycle
      );

      if (typeof window.toast === 'function') {
        window.toast(
          '✓ Set ' +
            (context.setIndex + 1) +
            ': ' +
            displayNumber(context.values.kg) +
            'kg × ' +
            context.values.reps +
            ' @ RPE ' +
            displayNumber(rpe),
          'ok'
        );
      }

      elements.input.value = '';
      focusAfterRender = true;
    } catch (error) {
      warn('log set', error);
      setNote(
        elements,
        'Set ni bil shranjen. Poskusi znova.',
        'error'
      );
    } finally {
      busy = false;
      scheduleRender(60);
    }
  }

  function wrapFunction(name) {
    const original = window[name];

    if (
      typeof original !== 'function' ||
      original.__wtSetLogWrapped
    ) {
      return;
    }

    function wrapped() {
      let result;

      try {
        result = original.apply(this, arguments);
      } finally {
        scheduleRender(20);
      }

      if (result && typeof result.finally === 'function') {
        result.finally(function () {
          scheduleRender(20);
        });
      }

      return result;
    }

    wrapped.__wtSetLogWrapped = true;
    wrapped.__wtSetLogOriginal = original;
    window[name] = wrapped;
  }

  function installFunctionHooks() {
    [
      'showDay',
      'setWeek',
      'setGymMode',
      'toggleGymMode',
      'setGymFocus',
      'moveGymFocus',
      'refreshGymTarget',
      'tgSet',
      'sv'
    ].forEach(wrapFunction);
  }

  function installObservers() {
    const dayContent = document.getElementById('day-content');

    if (
      dayContent &&
      dayContent.dataset.wtSetLogObserved !== '1'
    ) {
      dayContent.dataset.wtSetLogObserved = '1';

      const observer = new MutationObserver(function () {
        scheduleRender(0);
      });

      observer.observe(dayContent, {
        childList: true,
        subtree: true
      });
    }

    document.addEventListener('input', function (event) {
      if (
        event.target &&
        (
          event.target.classList.contains('wi') ||
          event.target.classList.contains('ri')
        )
      ) {
        scheduleRender(0);
      }
    });
  }

  function updateSettingsHelp() {
    const card = document.getElementById('wt-safe-rpe-card');
    if (!card || card.querySelector('.wt-set-log-settings-note')) return;

    const note = document.createElement('div');
    note.className = 'wt-set-log-settings-note';
    note.style.cssText =
      'margin-top:10px;padding:9px 10px;border-radius:8px;' +
      'background:var(--green-bg);color:var(--green-text);' +
      'font-size:11px;line-height:1.45;';
    note.textContent =
      'V Gym mode aplikacija prebere kg in ponovitve trenutnega seta. ' +
      'Vpišeš samo RPE in pritisneš Log set oziroma Enter.';

    card.appendChild(note);
  }

  function initialize() {
    try {
      installStyles();
      ensurePanel();
      installFunctionHooks();
      installObservers();
      updateSettingsHelp();
      render();

      window.setTimeout(function () {
        installFunctionHooks();
        updateSettingsHelp();
        render();
      }, 300);
    } catch (error) {
      warn('initialize', error);
    }
  }

  window.WTSetLog = {
    version: VERSION,
    refresh: render,
    logCurrentSet,
    current: currentSetContext
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }
})();
