(function () {
  'use strict';

  // Redline owns the four-tab layout and settings. Keep this legacy injection
  // compatible with older HTML without installing a second navigation system.
  if (document.getElementById('page-program')) return;

  const NAV_KEY = 'wt_extra_nav_safe_v1';
  const STYLE_ID = 'wt-safe-ui-style';
  const APP_CARD_ID = 'wt-safe-app-card';
  const NAV_CARD_ID = 'wt-safe-nav-card';
  const EXTRA_NAV_ID = 'wt-safe-extra-nav';
  const ADVANCED_ID = 'wt-safe-advanced';
  const RPE_CARD_ID = 'wt-safe-rpe-card';

  function safeRun(name, fn) {
    try {
      fn();
    } catch (error) {
      console.warn('WT safe UI: ' + name + ' failed', error);
    }
  }

  function normalized(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function toolsPage() {
    return document.getElementById('page-tools');
  }

  function cardByTitle(title) {
    const root = toolsPage();
    if (!root) return null;
    const wanted = normalized(title);
    return Array.from(root.querySelectorAll('.card')).find(function (card) {
      const heading = card.querySelector('.ct');
      return heading && normalized(heading.textContent).indexOf(wanted) !== -1;
    }) || null;
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .topbar .topbtns:empty { display:none; }
      .wt-safe-actions {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:8px;
      }
      .wt-safe-actions .icon-btn {
        width:100%;
        min-height:42px;
        border-radius:10px;
      }
      .wt-safe-note {
        margin-top:8px;
        color:var(--text3);
        font-size:11px;
        line-height:1.45;
      }
      .wt-safe-select {
        width:100%;
        padding:9px 10px;
        border:.5px solid var(--border2);
        border-radius:8px;
        background:var(--bg3);
        color:var(--text);
        font:13px system-ui,sans-serif;
      }
      .wt-safe-ex-number {
        display:none;
        align-items:center;
        justify-content:center;
        min-width:34px;
        height:25px;
        padding:0 8px;
        border:1px solid var(--green);
        border-radius:999px;
        background:var(--green-bg);
        color:var(--green-text);
        font-size:11px;
        font-weight:800;
        flex-shrink:0;
      }
      .gym-mode .wt-safe-ex-number { display:inline-flex; }
      .wt-safe-advanced {
        margin-bottom:1rem;
        border:.5px solid var(--border);
        border-radius:12px;
        background:var(--bg2);
        overflow:hidden;
      }
      .wt-safe-advanced > summary {
        cursor:pointer;
        padding:13px 15px;
        color:var(--text);
        font-size:13px;
        font-weight:650;
        list-style:none;
      }
      .wt-safe-advanced > summary::-webkit-details-marker { display:none; }
      .wt-safe-advanced > summary::after {
        content:'▾';
        float:right;
        color:var(--text3);
      }
      .wt-safe-advanced[open] > summary::after { content:'▴'; }
      .wt-safe-advanced-body { padding:0 10px 10px; }
      .wt-safe-advanced-body .card { margin-bottom:8px; }
      #page-body { display:none !important; }
      @media(max-width:430px) {
        .wt-safe-actions { grid-template-columns:1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function resetCustomColors() {
    localStorage.removeItem('wt_colors');
    const rootStyle = document.documentElement.style;
    ['green', 'blue', 'amber', 'purple', 'red'].forEach(function (name) {
      rootStyle.removeProperty('--' + name);
      rootStyle.removeProperty('--' + name + '-bg');
      rootStyle.removeProperty('--' + name + '-text');
    });
  }

  function removeColorSettings() {
    resetCustomColors();
    const card = cardByTitle('Barve teme');
    if (card) card.remove();
  }

  function ensureAppCard() {
    const root = toolsPage();
    if (!root) return null;
    let card = document.getElementById(APP_CARD_ID);
    if (card) return card;

    card = document.createElement('div');
    card.className = 'card';
    card.id = APP_CARD_ID;
    card.innerHTML = `
      <div class="ct">📱 Aplikacija in podatki</div>
      <div class="wt-safe-actions" id="wt-safe-actions"></div>
      <div class="wt-safe-note">
        Light/Dark, Import, Export in Posodobitve so prestavljeni iz glavne strani.
      </div>
    `;
    root.insertBefore(card, root.firstChild);
    return card;
  }

  function moveTopActions() {
    const card = ensureAppCard();
    if (!card) return;
    const target = card.querySelector('#wt-safe-actions');
    const source = document.querySelector('.topbtns');
    if (!target || !source) return;

    Array.from(source.querySelectorAll('button')).forEach(function (button) {
      target.appendChild(button);
    });
  }

  function removeMeasurementsNav() {
    document.querySelectorAll(
      '.progress-subnav button[data-progress="body"]'
    ).forEach(function (button) {
      button.remove();
    });

    if (localStorage.getItem('wt_last_page') === 'body') {
      localStorage.setItem('wt_last_page', 'bodyweight');
    }
  }

  function ensureRpeCard() {
    const root = toolsPage();
    if (!root || document.getElementById(RPE_CARD_ID)) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.id = RPE_CARD_ID;
    card.innerHTML = `
      <div class="ct">🎯 RPE in progresija</div>
      <div style="font-size:12px;color:var(--text2);line-height:1.55;">
        RPE vneseš pri hitrem vnosu, na primer
        <strong style="color:var(--green-text);">120x5@8</strong>,
        ali s številkami RPE pod posameznim setom.
        <br><br>
        Predlog progresije uporablja zaključene ciljne sete, povprečni in najvišji RPE,
        bolečino, trend e1RM, ciljne ponovitve in izbrani način progresije.
        Brez RPE predlog deluje, vendar je manj natančen.
      </div>
    `;

    const progression = cardByTitle('Pravila progresije');
    if (progression && progression.nextSibling) {
      root.insertBefore(card, progression.nextSibling);
    } else {
      root.appendChild(card);
    }
  }

  function ensureAdvancedSection() {
    const root = toolsPage();
    if (!root || document.getElementById(ADVANCED_ID)) return;

    const cards = [
      cardByTitle('Sistemski testi'),
      cardByTitle('Diagnostika podatkov'),
      cardByTitle('Uredi pretekle podatke')
    ].filter(Boolean);

    if (!cards.length) return;

    const details = document.createElement('details');
    details.id = ADVANCED_ID;
    details.className = 'wt-safe-advanced';

    const summary = document.createElement('summary');
    summary.textContent = '🛠 Napredno: diagnostika in popravilo podatkov';

    const body = document.createElement('div');
    body.className = 'wt-safe-advanced-body';

    details.appendChild(summary);
    details.appendChild(body);
    cards.forEach(function (card) {
      body.appendChild(card);
    });
    root.appendChild(details);
  }

  const NAV_OPTIONS = {
    none: { label: 'Brez dodatnega gumba' },
    bodyweight: { label: 'Teža', icon: '⚖️', page: 'bodyweight' },
    cycle: { label: 'Cikli', icon: '🔄', page: 'cycle' },
    stats: { label: 'Moč', icon: '📊', page: 'stats' },
    gymlog: { label: 'Pregled', icon: '📈', page: 'gymlog' },
    program: { label: 'Program', icon: '🧱', action: 'program' },
    backup: { label: 'Backup', icon: '💾', action: 'backup' },
    alarm: { label: 'Alarm', icon: '⏰', action: 'alarm' },
    updates: { label: 'Posodobitve', icon: '⬆', action: 'updates' }
  };

  function openToolsCard(title) {
    if (typeof window.showPage === 'function') {
      window.showPage('tools');
    }
    window.setTimeout(function () {
      const card = cardByTitle(title);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  }

  function runNavOption(key, item) {
    const option = NAV_OPTIONS[key];
    if (!option) return;

    if (option.page && typeof window.showProgressPage === 'function') {
      window.showProgressPage(option.page);
      document.querySelectorAll('.nav .nt').forEach(function (navItem) {
        navItem.classList.remove('active');
      });
      item.classList.add('active');
      return;
    }

    if (option.action === 'program') {
      if (typeof window.showPage === 'function') window.showPage('tools');
      window.setTimeout(function () {
        if (typeof window.openProgramBuilderV6 === 'function') {
          window.openProgramBuilderV6();
        }
      }, 80);
    } else if (option.action === 'backup') {
      openToolsCard('Backup');
    } else if (option.action === 'alarm') {
      openToolsCard('Nastavitve alarma');
    } else if (
      option.action === 'updates' &&
      window.WTAndroidUpdates &&
      typeof window.WTAndroidUpdates.check === 'function'
    ) {
      window.WTAndroidUpdates.check();
    }
  }

  function renderExtraNav() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    const previous = document.getElementById(EXTRA_NAV_ID);
    if (previous) previous.remove();

    const key = localStorage.getItem(NAV_KEY) || 'none';
    const option = NAV_OPTIONS[key] || NAV_OPTIONS.none;

    if (key === 'none') {
      nav.style.gridTemplateColumns = 'repeat(3,1fr)';
      return;
    }

    const item = document.createElement('div');
    item.id = EXTRA_NAV_ID;
    item.className = 'nt';
    item.innerHTML =
      '<div class="nt-i">' + (option.icon || '•') + '</div>' + option.label;
    item.addEventListener('click', function () {
      runNavOption(key, item);
    });

    const settings = nav.querySelector('.nt[data-nav="tools"]');
    if (settings) nav.insertBefore(item, settings);
    else nav.appendChild(item);
    nav.style.gridTemplateColumns = 'repeat(4,1fr)';
  }

  function ensureNavCard() {
    const root = toolsPage();
    if (!root || document.getElementById(NAV_CARD_ID)) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.id = NAV_CARD_ID;

    const options = Object.keys(NAV_OPTIONS).map(function (key) {
      const option = NAV_OPTIONS[key];
      const prefix = option.icon ? option.icon + ' ' : '';
      return '<option value="' + key + '">' + prefix + option.label + '</option>';
    }).join('');

    card.innerHTML = `
      <div class="ct">📌 Spodnja vrstica</div>
      <div style="font-size:12px;color:var(--text2);line-height:1.45;margin-bottom:.7rem;">
        Dodaj en hiter gumb poleg Trening, Napredek in Nastavitve.
      </div>
      <select class="wt-safe-select" id="wt-safe-nav-select">${options}</select>
    `;

    const appCard = document.getElementById(APP_CARD_ID);
    if (appCard && appCard.nextSibling) root.insertBefore(card, appCard.nextSibling);
    else root.insertBefore(card, root.firstChild);

    const select = card.querySelector('#wt-safe-nav-select');
    const stored = localStorage.getItem(NAV_KEY) || 'none';
    select.value = NAV_OPTIONS[stored] ? stored : 'none';
    select.addEventListener('change', function () {
      localStorage.setItem(NAV_KEY, select.value);
      renderExtraNav();
      if (typeof window.toast === 'function') {
        window.toast('Spodnja vrstica je posodobljena.', 'ok');
      }
    });
  }

  function numberExerciseCards() {
    const cards = Array.from(document.querySelectorAll('#day-content .exc'));
    cards.forEach(function (card, index) {
      const wrap = card.querySelector('.ex-name-wrap');
      if (!wrap) return;
      let badge = wrap.querySelector('.wt-safe-ex-number');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'wt-safe-ex-number';
        wrap.insertBefore(badge, wrap.firstChild);
      }
      const label = (index + 1) + '/' + cards.length;
      if (badge.textContent !== label) badge.textContent = label;
    });
  }

  function observeWorkout() {
    const dayContent = document.getElementById('day-content');
    if (!dayContent || dayContent.dataset.wtSafeObserved === '1') return;
    dayContent.dataset.wtSafeObserved = '1';

    let pending = false;
    const observer = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      window.setTimeout(function () {
        pending = false;
        numberExerciseCards();
      }, 0);
    });

    observer.observe(dayContent, { childList: true, subtree: true });
  }

  function observeUpdateButton() {
    const source = document.querySelector('.topbtns');
    if (!source || source.dataset.wtSafeObserved === '1') return;
    source.dataset.wtSafeObserved = '1';
    const observer = new MutationObserver(function () {
      window.setTimeout(moveTopActions, 0);
    });
    observer.observe(source, { childList: true });
  }

  function initialize() {
    safeRun('styles', installStyles);
    safeRun('measurements', removeMeasurementsNav);
    safeRun('app card', ensureAppCard);
    safeRun('move actions', moveTopActions);
    safeRun('remove colors', removeColorSettings);
    safeRun('RPE card', ensureRpeCard);
    safeRun('advanced section', ensureAdvancedSection);
    safeRun('nav card', ensureNavCard);
    safeRun('extra nav', renderExtraNav);
    safeRun('exercise numbers', numberExerciseCards);
    safeRun('workout observer', observeWorkout);
    safeRun('update observer', observeUpdateButton);

    window.setTimeout(function () {
      safeRun('late actions', moveTopActions);
      safeRun('late numbering', numberExerciseCards);
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
