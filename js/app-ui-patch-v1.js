(function () {
  'use strict';

  const PATCH_ID = 'wt-ui-patch-v1';
  const EXTRA_NAV_KEY = 'wt_nav_extra_v1';
  const DEFAULT_COLORS_APPLIED_KEY = 'wt_default_colors_patch_v1';

  if (window.__WT_UI_PATCH_V1__) {
    return;
  }

  window.__WT_UI_PATCH_V1__ = true;

  const NAV_OPTIONS = {
    none: {
      label: 'Brez dodatnega gumba',
      icon: '',
      page: ''
    },
    bodyweight: {
      label: 'Teža',
      icon: '⚖️',
      page: 'bodyweight'
    },
    cycle: {
      label: 'Cikli',
      icon: '🔄',
      page: 'cycle'
    },
    stats: {
      label: 'Moč',
      icon: '📊',
      page: 'stats'
    },
    gymlog: {
      label: 'Pregled',
      icon: '📈',
      page: 'gymlog'
    },
    program: {
      label: 'Program',
      icon: '🧱',
      action: function () {
        if (typeof window.showPage === 'function') {
          window.showPage('tools');
        }

        window.setTimeout(function () {
          if (typeof window.openProgramBuilderV6 === 'function') {
            window.openProgramBuilderV6();
          }
        }, 100);
      }
    },
    backup: {
      label: 'Backup',
      icon: '💾',
      action: function () {
        openToolsCard('Backup');
      }
    },
    alarm: {
      label: 'Alarm',
      icon: '⏰',
      action: function () {
        openToolsCard('Nastavitve alarma');
      }
    }
  };

  function normalizeText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function showMessage(message, type) {
    if (typeof window.toast === 'function') {
      window.toast(message, type || 'ok');
      return;
    }

    console.log(message);
  }

  function getToolsPage() {
    return document.getElementById('page-tools');
  }

  function getCardByTitle(searchText) {
    const tools = getToolsPage();

    if (!tools) {
      return null;
    }

    const wanted = normalizeText(searchText);
    const cards = Array.from(tools.querySelectorAll('.card'));

    return (
      cards.find(function (card) {
        const title = card.querySelector('.ct');
        return (
          title &&
          normalizeText(title.textContent).indexOf(wanted) !== -1
        );
      }) || null
    );
  }

  function openToolsCard(searchText) {
    if (typeof window.showPage === 'function') {
      window.showPage('tools');
    }

    window.setTimeout(function () {
      const card = getCardByTitle(searchText);

      if (card) {
        card.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

        card.classList.add('wt-patch-highlight');

        window.setTimeout(function () {
          card.classList.remove('wt-patch-highlight');
        }, 1600);
      }
    }, 120);
  }

  function installStyles() {
    if (document.getElementById(PATCH_ID + '-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = PATCH_ID + '-styles';

    style.textContent = `
      .topbar .topbtns {
        display: none !important;
      }

      #wt-app-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      #wt-app-actions .icon-btn,
      #wt-app-actions .sb {
        width: 100%;
        min-height: 42px;
        border-radius: 10px;
        font-size: 12px;
      }

      .wt-settings-note {
        margin-top: 9px;
        color: var(--text3);
        font-size: 11px;
        line-height: 1.45;
      }

      .wt-nav-select {
        width: 100%;
        padding: 9px 10px;
        border: .5px solid var(--border2);
        border-radius: 8px;
        background: var(--bg3);
        color: var(--text);
        font: 13px system-ui, sans-serif;
      }

      .wt-ex-number {
        display: none;
        min-width: 25px;
        height: 25px;
        padding: 0 7px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: var(--green-bg);
        border: 1px solid var(--green);
        color: var(--green-text);
        font-size: 11px;
        font-weight: 800;
        flex-shrink: 0;
      }

      .gym-mode .wt-ex-number {
        display: inline-flex;
      }

      .wt-rpe-inline {
        display: none;
        margin: 2px 0 7px;
        padding: 6px 8px;
        border: .5px solid var(--border2);
        border-radius: 7px;
        background: var(--bg3);
        color: var(--text2);
        font-size: 10px;
        line-height: 1.4;
      }

      .gym-mode .wt-rpe-inline {
        display: block;
      }

      .wt-maintenance {
        margin-bottom: 1rem;
        border: .5px solid var(--border);
        border-radius: 12px;
        background: var(--bg2);
        overflow: hidden;
      }

      .wt-maintenance > summary {
        cursor: pointer;
        padding: 13px 15px;
        color: var(--text);
        font-weight: 650;
        font-size: 13px;
        list-style: none;
      }

      .wt-maintenance > summary::-webkit-details-marker {
        display: none;
      }

      .wt-maintenance > summary::after {
        content: '▾';
        float: right;
        color: var(--text3);
      }

      .wt-maintenance[open] > summary::after {
        content: '▴';
      }

      .wt-maintenance-body {
        padding: 0 10px 10px;
      }

      .wt-maintenance-body .card {
        margin-bottom: 8px;
      }

      .wt-patch-highlight {
        outline: 2px solid var(--green);
        outline-offset: 2px;
      }

      #page-body,
      .progress-subnav button[data-progress="body"] {
        display: none !important;
      }

      @media (max-width: 430px) {
        #wt-app-actions {
          grid-template-columns: 1fr;
        }
      }

      :root {
        --green: #1d9e75 !important;
        --green-bg: #0d2a1f !important;
        --green-text: #4ecba0 !important;
        --blue: #378add !important;
        --blue-bg: #0d1e33 !important;
        --blue-text: #7ab8f0 !important;
        --amber: #ef9f27 !important;
        --amber-bg: #2a1f0a !important;
        --amber-text: #f5c060 !important;
        --red: #e24b4a !important;
        --red-bg: #2a0f0f !important;
        --red-text: #f08080 !important;
        --purple: #7f77dd !important;
        --purple-bg: #1a1630 !important;
        --purple-text: #a89de8 !important;
      }

      [data-theme="light"] {
        --green: #0f6e56 !important;
        --green-bg: #e1f5ee !important;
        --green-text: #085041 !important;
        --blue: #185fa5 !important;
        --blue-bg: #e6f1fb !important;
        --blue-text: #0c447c !important;
        --amber: #ba7517 !important;
        --amber-bg: #faeeda !important;
        --amber-text: #633806 !important;
        --red: #a32d2d !important;
        --red-bg: #fcebeb !important;
        --red-text: #791f1f !important;
        --purple: #534ab7 !important;
        --purple-bg: #eeedfe !important;
        --purple-text: #3c3489 !important;
      }
    `;

    document.head.appendChild(style);
  }

  function forceDefaultColors() {
    if (!localStorage.getItem(DEFAULT_COLORS_APPLIED_KEY)) {
      localStorage.removeItem('wt_colors');
      localStorage.setItem(DEFAULT_COLORS_APPLIED_KEY, '1');
    }

    const rootStyle = document.documentElement.style;
    const names = [
      'green',
      'blue',
      'amber',
      'red',
      'purple'
    ];

    names.forEach(function (name) {
      rootStyle.removeProperty('--' + name);
      rootStyle.removeProperty('--' + name + '-bg');
      rootStyle.removeProperty('--' + name + '-text');
    });
  }

  function removeThemeColorCard() {
    const card = getCardByTitle('Barve teme');

    if (card) {
      card.remove();
    }
  }

  function createAppSettingsCard() {
    const tools = getToolsPage();

    if (!tools) {
      return null;
    }

    let card = document.getElementById('wt-app-settings-card');

    if (card) {
      return card;
    }

    card = document.createElement('div');
    card.className = 'card';
    card.id = 'wt-app-settings-card';

    card.innerHTML = `
      <div class="ct">📱 Aplikacija in podatki</div>
      <div id="wt-app-actions"></div>
      <div class="wt-settings-note">
        Light/Dark, uvoz, izvoz in preverjanje posodobitev so prestavljeni sem.
        Glavna stran ostane namenjena treningu.
      </div>
    `;

    tools.insertBefore(card, tools.firstChild);
    return card;
  }

  function moveMainActionsToSettings() {
    const card = createAppSettingsCard();

    if (!card) {
      return;
    }

    const actions = card.querySelector('#wt-app-actions');

    if (!actions) {
      return;
    }

    const themeButton = document.getElementById('theme-btn');

    if (themeButton && themeButton.parentElement !== actions) {
      actions.appendChild(themeButton);
    }

    const topButtons = Array.from(
      document.querySelectorAll('.topbtns button')
    );

    topButtons.forEach(function (button) {
      const onclickText = String(
        button.getAttribute('onclick') || ''
      );

      if (
        onclickText.indexOf('importData') !== -1 ||
        onclickText.indexOf('exportData') !== -1
      ) {
        actions.appendChild(button);
      }
    });

    const updateButton =
      document.getElementById('wt-update-check-btn');

    if (updateButton && updateButton.parentElement !== actions) {
      updateButton.textContent = '⬆ Posodobitve';
      actions.appendChild(updateButton);
    }

    const topContainer = document.querySelector('.topbtns');

    if (topContainer) {
      topContainer.setAttribute('aria-hidden', 'true');
    }
  }

  function createNavSettingsCard() {
    const tools = getToolsPage();

    if (!tools || document.getElementById('wt-nav-settings-card')) {
      return;
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'wt-nav-settings-card';

    const optionHtml = Object.keys(NAV_OPTIONS)
      .map(function (key) {
        const option = NAV_OPTIONS[key];

        return (
          '<option value="' +
          key +
          '">' +
          (option.icon ? option.icon + ' ' : '') +
          option.label +
          '</option>'
        );
      })
      .join('');

    card.innerHTML = `
      <div class="ct">📌 Spodnja vrstica</div>
      <div style="font-size:12px;color:var(--text2);line-height:1.45;margin-bottom:.7rem;">
        Izberi en dodatni gumb. Osnovni gumbi Trening, Napredek in Nastavitve ostanejo.
      </div>
      <select class="wt-nav-select" id="wt-extra-nav-select">
        ${optionHtml}
      </select>
    `;

    const appCard = document.getElementById('wt-app-settings-card');

    if (appCard && appCard.nextSibling) {
      tools.insertBefore(card, appCard.nextSibling);
    } else {
      tools.insertBefore(card, tools.firstChild);
    }

    const select = card.querySelector('#wt-extra-nav-select');
    const stored = localStorage.getItem(EXTRA_NAV_KEY) || 'none';

    select.value = NAV_OPTIONS[stored] ? stored : 'none';

    select.addEventListener('change', function () {
      localStorage.setItem(EXTRA_NAV_KEY, select.value);
      renderExtraNav();
      showMessage('Spodnja vrstica je posodobljena.', 'ok');
    });
  }

  function activateExtraNavForPage(page) {
    const extra = document.getElementById('wt-extra-nav');
    const stored = localStorage.getItem(EXTRA_NAV_KEY) || 'none';
    const option = NAV_OPTIONS[stored];

    if (!extra || !option || !option.page) {
      return;
    }

    const isMatch = page === option.page;
    extra.classList.toggle('active', isMatch);

    if (isMatch) {
      const normalProgress = document.querySelector(
        '.nt[data-nav="progress"]'
      );

      if (normalProgress) {
        normalProgress.classList.remove('active');
      }
    }
  }

  function renderExtraNav() {
    const nav = document.querySelector('.nav');

    if (!nav) {
      return;
    }

    const old = document.getElementById('wt-extra-nav');

    if (old) {
      old.remove();
    }

    const stored = localStorage.getItem(EXTRA_NAV_KEY) || 'none';
    const option = NAV_OPTIONS[stored] || NAV_OPTIONS.none;

    if (stored === 'none' || !option) {
      nav.style.gridTemplateColumns = 'repeat(3,1fr)';
      return;
    }

    const item = document.createElement('div');
    item.className = 'nt';
    item.id = 'wt-extra-nav';
    item.dataset.nav = 'wt-extra';
    item.dataset.target = stored;

    item.innerHTML =
      '<div class="nt-i">' +
      option.icon +
      '</div>' +
      option.label;

    item.addEventListener('click', function () {
      if (option.page && typeof window.showProgressPage === 'function') {
        window.showProgressPage(option.page);
        return;
      }

      if (typeof option.action === 'function') {
        option.action();
      }
    });

    const settingsItem = nav.querySelector('.nt[data-nav="tools"]');

    if (settingsItem) {
      nav.insertBefore(item, settingsItem);
    } else {
      nav.appendChild(item);
    }

    nav.style.gridTemplateColumns = 'repeat(4,1fr)';

    const activePage = document.querySelector('.page.active');

    if (activePage) {
      activateExtraNavForPage(
        activePage.id.replace(/^page-/, '')
      );
    }
  }

  function removeMeasurementsFromProgress() {
    document
      .querySelectorAll(
        '.progress-subnav button[data-progress="body"]'
      )
      .forEach(function (button) {
        button.remove();
      });

    const bodyPage = document.getElementById('page-body');

    if (bodyPage) {
      bodyPage.classList.remove('active');
      bodyPage.setAttribute('aria-hidden', 'true');
    }

    const lastPage = localStorage.getItem('wt_last_page');

    if (lastPage === 'body') {
      localStorage.setItem('wt_last_page', 'bodyweight');
    }
  }

  function createRpeInfoCard() {
    const tools = getToolsPage();

    if (!tools || document.getElementById('wt-rpe-info-card')) {
      return;
    }

    const progressionCard = getCardByTitle('Pravila progresije');
    const card = document.createElement('div');

    card.className = 'card';
    card.id = 'wt-rpe-info-card';

    card.innerHTML = `
      <div class="ct">🎯 RPE in progresija</div>
      <div style="font-size:12px;color:var(--text2);line-height:1.55;">
        <strong>Vnos RPE:</strong> pri hitrem vnosu napiši
        <code style="color:var(--green-text);">120x5@8</code>,
        ali po setu izberi RPE 6–10 pod vrstico seta.
        <br><br>
        <strong>Predlog teže uporablja:</strong> zaključene sete,
        odstotek izvedenih ciljnih setov, povprečni in najvišji RPE,
        bolečino, trend e1RM, ciljne ponovitve ter izbrani način progresije.
        Brez vnesenega RPE predlog še deluje, vendar je manj natančen.
      </div>
    `;

    if (progressionCard && progressionCard.nextSibling) {
      tools.insertBefore(card, progressionCard.nextSibling);
    } else {
      tools.appendChild(card);
    }
  }

  function createMaintenanceSection() {
    const tools = getToolsPage();

    if (!tools || document.getElementById('wt-maintenance')) {
      return;
    }

    const wantedTitles = [
      'Sistemski testi',
      'Diagnostika podatkov',
      'Uredi pretekle podatke'
    ];

    const cards = wantedTitles
      .map(getCardByTitle)
      .filter(Boolean);

    if (!cards.length) {
      return;
    }

    const details = document.createElement('details');
    details.id = 'wt-maintenance';
    details.className = 'wt-maintenance';

    const summary = document.createElement('summary');
    summary.textContent =
      '🛠 Napredno: diagnostika in popravilo podatkov';

    const body = document.createElement('div');
    body.className = 'wt-maintenance-body';

    details.appendChild(summary);
    details.appendChild(body);

    cards.forEach(function (card) {
      body.appendChild(card);
    });

    tools.appendChild(details);
  }

  function parseExerciseKey(key) {
    const match = String(key || '').match(
      /^c(\d+)w(\d+)d(\d+)e(\d+)$/
    );

    if (!match) {
      return null;
    }

    return {
      cycle: Number(match[1]),
      week: Number(match[2]),
      day: Number(match[3]),
      exercise: Number(match[4])
    };
  }

  function applyExerciseNumbers() {
    const cards = Array.from(
      document.querySelectorAll('#day-content .exc')
    );

    cards.forEach(function (card, index) {
      let badge = card.querySelector('.wt-ex-number');

      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'wt-ex-number';

        const wrap = card.querySelector('.ex-name-wrap');

        if (wrap) {
          wrap.insertBefore(badge, wrap.firstChild);
        }
      }

      if (badge) {
        badge.textContent = String(index + 1);
        badge.title =
          'Vaja ' + (index + 1) + ' od ' + cards.length;
      }

      card.dataset.wtExerciseNumber = String(index + 1);
      card.dataset.wtExerciseTotal = String(cards.length);
    });
  }

  function addRpeHints() {
    const quickInputs = document.querySelectorAll(
      '#day-content .quick-log-v6 input'
    );

    quickInputs.forEach(function (input) {
      input.placeholder = 'npr. 120x5@8';
      input.setAttribute(
        'aria-label',
        'Hitri vnos: teža x ponovitve @ RPE'
      );

      const quick = input.closest('.quick-log-v6');

      if (!quick || quick.nextElementSibling &&
          quick.nextElementSibling.classList.contains('wt-rpe-inline')) {
        return;
      }

      const hint = document.createElement('div');
      hint.className = 'wt-rpe-inline';
      hint.textContent =
        'RPE: vpiši npr. 120x5@8 ali izberi 6–10 pod setom.';

      quick.insertAdjacentElement('afterend', hint);
    });
  }

  function updateGymPositionMeta(key) {
    const meta = document.getElementById('gym-focus-meta');

    if (!meta) {
      return;
    }

    const cards = Array.from(
      document.querySelectorAll('#day-content .exc')
    );

    const keys = cards.map(function (card) {
      return card.id.replace(/^ec-/, '');
    });

    const position = keys.indexOf(String(key));
    const parsed = parseExerciseKey(key);

    if (position < 0 || !parsed) {
      return;
    }

    let targetSets = 0;
    let doneSets = 0;
    let nextSet = 0;

    try {
      const weekData =
        typeof PROG !== 'undefined' &&
        PROG.weeks
          ? PROG.weeks[parsed.week]
          : null;

      if (
        typeof nsf === 'function' &&
        typeof getSets === 'function'
      ) {
        targetSets = nsf(
          parsed.day,
          parsed.exercise,
          weekData,
          key
        );

        const sets = getSets()[key] || [];

        doneSets = sets
          .slice(0, targetSets)
          .filter(function (set) {
            return set && set.done;
          }).length;

        const pendingIndex = sets
          .slice(0, targetSets)
          .findIndex(function (set) {
            return !set || !set.done;
          });

        nextSet =
          pendingIndex >= 0
            ? pendingIndex + 1
            : targetSets;
      }
    } catch (error) {
      console.warn('Gym numbering meta failed:', error);
    }

    const parts = [
      'Vaja ' +
        (position + 1) +
        '/' +
        keys.length
    ];

    if (targetSets > 0) {
      parts.push(
        'set ' + nextSet + '/' + targetSets
      );

      parts.push(
        doneSets + '/' + targetSets + ' končano'
      );
    }

    meta.textContent = parts.join(' · ');
  }

  function wrapAppFunctions() {
    if (window.__WT_UI_PATCH_V1_WRAPPED__) {
      return;
    }

    window.__WT_UI_PATCH_V1_WRAPPED__ = true;

    if (typeof window.showPage === 'function') {
      const originalShowPage = window.showPage;

      window.showPage = function (page) {
        const safePage = page === 'body'
          ? 'bodyweight'
          : page;

        const result = originalShowPage.call(
          this,
          safePage
        );

        window.setTimeout(function () {
          activateExtraNavForPage(safePage);

          if (safePage === 'tools') {
            moveMainActionsToSettings();
            removeThemeColorCard();
            createMaintenanceSection();
          }
        }, 0);

        return result;
      };
    }

    if (typeof window.showProgressPage === 'function') {
      window.showProgressPage = function (page) {
        const safePage = page === 'body'
          ? 'bodyweight'
          : page || 'gymlog';

        return window.showPage(safePage);
      };
    }

    if (typeof window.showDay === 'function') {
      const originalShowDay = window.showDay;

      window.showDay = function () {
        const result = originalShowDay.apply(
          this,
          arguments
        );

        window.setTimeout(function () {
          applyExerciseNumbers();
          addRpeHints();

          const activeKey =
            localStorage.getItem('wt_active_ex');

          if (activeKey) {
            updateGymPositionMeta(activeKey);
          }
        }, 0);

        return result;
      };
    }

    if (typeof window.setGymFocus === 'function') {
      const originalSetGymFocus =
        window.setGymFocus;

      window.setGymFocus = function (key) {
        const result = originalSetGymFocus.apply(
          this,
          arguments
        );

        window.setTimeout(function () {
          updateGymPositionMeta(key);
        }, 0);

        return result;
      };
    }

    if (typeof window.updateGymFocusBar === 'function') {
      const originalUpdateGymFocusBar =
        window.updateGymFocusBar;

      window.updateGymFocusBar = function (key) {
        const result =
          originalUpdateGymFocusBar.apply(
            this,
            arguments
          );

        updateGymPositionMeta(key);
        return result;
      };
    }
  }

  function observeLateButtons() {
    const observer = new MutationObserver(function () {
      moveMainActionsToSettings();
      applyExerciseNumbers();
      addRpeHints();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function initialize() {
    installStyles();
    forceDefaultColors();
    removeMeasurementsFromProgress();
    createAppSettingsCard();
    createNavSettingsCard();
    createRpeInfoCard();
    removeThemeColorCard();
    createMaintenanceSection();
    moveMainActionsToSettings();
    renderExtraNav();
    wrapAppFunctions();
    applyExerciseNumbers();
    addRpeHints();
    observeLateButtons();

    const activePage = document.querySelector(
      '.page.active'
    );

    if (
      activePage &&
      activePage.id === 'page-body'
    ) {
      window.showPage('bodyweight');
    }

    console.log('Workout Tracker first UI patch is active.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initialize,
      {
        once: true
      }
    );
  } else {
    initialize();
  }
})();
