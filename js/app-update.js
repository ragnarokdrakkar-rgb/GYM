(function () {
  'use strict';

  const REPOSITORY = 'ragnarokdrakkar-rgb/GYM';

  const RELEASE_API =
    'https://api.github.com/repos/' +
    REPOSITORY +
    '/releases/latest';

  const RELEASE_PAGE =
    'https://github.com/' +
    REPOSITORY +
    '/releases/latest';

  const LAST_CHECK_KEY = 'wt_android_update_last_check';
  const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

  let updateCheckRunning = false;

  function getPlugin(name) {
    try {
      const capacitor = window.Capacitor;

      if (!capacitor || !capacitor.Plugins) {
        return null;
      }

      if (
        typeof capacitor.isNativePlatform === 'function' &&
        !capacitor.isNativePlatform()
      ) {
        return null;
      }

      return capacitor.Plugins[name] || null;
    } catch (error) {
      console.warn(
        'Capacitor plugin lookup failed:',
        error
      );

      return null;
    }
  }

  function showMessage(message, type) {
    if (typeof window.toast === 'function') {
      window.toast(message, type || 'ok');
      return;
    }

    console.log(message);
  }

  function normalizeVersion(version) {
    return String(version || '')
      .trim()
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map(function (part) {
        const number = parseInt(part, 10);

        return Number.isFinite(number)
          ? number
          : 0;
      });
  }

  function isNewerVersion(latest, current) {
    const latestParts = normalizeVersion(latest);
    const currentParts = normalizeVersion(current);

    const length = Math.max(
      latestParts.length,
      currentParts.length
    );

    for (
      let index = 0;
      index < length;
      index += 1
    ) {
      const latestPart = latestParts[index] || 0;
      const currentPart = currentParts[index] || 0;

      if (latestPart > currentPart) {
        return true;
      }

      if (latestPart < currentPart) {
        return false;
      }
    }

    return false;
  }

  async function getInstalledVersion() {
    const appPlugin = getPlugin('App');

    if (!appPlugin && !window.__WT_ANDROID_APP__ && typeof APP_VERSION === 'string') return APP_VERSION;

    if (
      !appPlugin ||
      typeof appPlugin.getInfo !== 'function'
    ) {
      throw new Error(
        'Capacitor App plugin ni na voljo.'
      );
    }

    const info = await appPlugin.getInfo();

    if (!info || !info.version) {
      throw new Error(
        'Verzije aplikacije ni bilo mogoče prebrati.'
      );
    }

    return String(info.version);
  }

  function findApkAsset(release) {
    const assets = Array.isArray(release.assets)
      ? release.assets
      : [];

    return (
      assets.find(function (asset) {
        return (
          asset &&
          typeof asset.name === 'string' &&
          /^Workout-Tracker.*\.apk$/i.test(
            asset.name
          )
        );
      }) ||
      assets.find(function (asset) {
        return (
          asset &&
          typeof asset.name === 'string' &&
          /\.apk$/i.test(asset.name)
        );
      }) ||
      null
    );
  }

  async function openExternalUrl(url) {
    const appLauncher = getPlugin('AppLauncher');

    if (
      !appLauncher ||
      typeof appLauncher.openUrl !== 'function'
    ) {
      return false;
    }

    try {
      const result = await appLauncher.openUrl({
        url: url
      });

      return Boolean(
        result &&
        result.completed === true
      );
    } catch (error) {
      console.warn(
        'AppLauncher.openUrl failed:',
        error
      );

      return false;
    }
  }

  async function openReleaseFallback(url) {
    const browserPlugin = getPlugin('Browser');

    try {
      if (
        browserPlugin &&
        typeof browserPlugin.open === 'function'
      ) {
        await browserPlugin.open({
          url: url
        });

        return true;
      }
    } catch (error) {
      console.warn(
        'Browser fallback failed:',
        error
      );
    }

    try {
      window.open(url, '_blank');
      return true;
    } catch (error) {
      console.warn(
        'window.open fallback failed:',
        error
      );

      return false;
    }
  }

  async function openUpdateDownload(release) {
    const apkAsset = findApkAsset(release);

    const directApkUrl =
      apkAsset &&
      apkAsset.browser_download_url
        ? apkAsset.browser_download_url
        : null;

    const releaseUrl =
      release &&
      release.html_url
        ? release.html_url
        : RELEASE_PAGE;

    const targetUrl =
      directApkUrl || releaseUrl;

    showMessage(
      'Odpiram prenos v zunanjem brskalniku ...',
      'ok'
    );

    /*
     * Glavna Android pot:
     * neposredni APK odpre zunanji sistemski brskalnik.
     */
    const openedExternally =
      await openExternalUrl(targetUrl);

    if (openedExternally) {
      return;
    }

    /*
     * Če neposredni APK ni bil odprt,
     * poskusi zunanji brskalnik še z Release stranjo.
     */
    if (targetUrl !== releaseUrl) {
      const releaseOpened =
        await openExternalUrl(releaseUrl);

      if (releaseOpened) {
        showMessage(
          'Na strani Releases izberi APK pod Assets.',
          'ok'
        );

        return;
      }
    }

    /*
     * Zadnja rezervna možnost:
     * Capacitor Browser odpre GitHub Release stran.
     */
    const fallbackOpened =
      await openReleaseFallback(releaseUrl);

    if (fallbackOpened) {
      showMessage(
        'Na strani Releases izberi APK pod Assets.',
        'ok'
      );

      return;
    }

    showMessage(
      'Prenosa ni bilo mogoče odpreti.',
      'err'
    );
  }

  function installStyles() {
    if (
      document.getElementById(
        'wt-update-styles'
      )
    ) {
      return;
    }

    const style =
      document.createElement('style');

    style.id = 'wt-update-styles';

    style.textContent = `
      #wt-update-banner {
        position: fixed;
        top: calc(8px + env(safe-area-inset-top));
        left: 10px;
        right: 10px;
        z-index: 10000;
        padding: 12px;
        border: 1px solid var(--green);
        border-radius: 12px;
        background: var(--green-bg);
        color: var(--text);
        box-shadow: 0 8px 28px rgba(0,0,0,.45);
      }

      #wt-update-banner .wt-update-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--green-text);
        margin-bottom: 5px;
      }

      #wt-update-banner .wt-update-text {
        font-size: 12px;
        color: var(--text2);
        line-height: 1.45;
      }

      #wt-update-banner .wt-update-actions {
        display: flex;
        gap: 8px;
        margin-top: 10px;
      }

      #wt-update-banner button {
        border-radius: 20px;
        border: 1px solid var(--border2);
        padding: 8px 13px;
        font-size: 12px;
        cursor: pointer;
      }

      #wt-update-download {
        flex: 1;
        background: var(--green);
        color: white;
        border-color: var(--green) !important;
      }

      #wt-update-close {
        background: var(--bg3);
        color: var(--text2);
      }
    `;

    document.head.appendChild(style);
  }

  function showUpdateBanner(
    release,
    currentVersion,
    latestVersion
  ) {
    installStyles();

    const previous =
      document.getElementById(
        'wt-update-banner'
      );

    if (previous) {
      previous.remove();
    }

    const banner =
      document.createElement('div');

    banner.id = 'wt-update-banner';

    const title =
      document.createElement('div');

    title.className = 'wt-update-title';

    title.textContent =
      'Nova verzija ' +
      latestVersion +
      ' je na voljo';

    const text =
      document.createElement('div');

    text.className = 'wt-update-text';

    text.textContent =
      'Nameščena verzija: ' +
      currentVersion +
      '. Prenesi APK in izberi Posodobi.';

    const actions =
      document.createElement('div');

    actions.className =
      'wt-update-actions';

    const downloadButton =
      document.createElement('button');

    downloadButton.id =
      'wt-update-download';

    downloadButton.type = 'button';

    downloadButton.textContent =
      'Prenesi posodobitev';

    downloadButton.addEventListener(
      'click',
      function () {
        downloadButton.disabled = true;
        downloadButton.textContent =
          'Odpiram ...';

        openUpdateDownload(release)
          .catch(function (error) {
            console.warn(
              'Update download failed:',
              error
            );

            showMessage(
              'Prenosa ni bilo mogoče odpreti.',
              'err'
            );
          })
          .finally(function () {
            window.setTimeout(function () {
              downloadButton.disabled = false;
              downloadButton.textContent =
                'Prenesi posodobitev';
            }, 1500);
          });
      }
    );

    const closeButton =
      document.createElement('button');

    closeButton.id =
      'wt-update-close';

    closeButton.type = 'button';
    closeButton.textContent = 'Pozneje';

    closeButton.addEventListener(
      'click',
      function () {
        banner.remove();
      }
    );

    actions.appendChild(downloadButton);
    actions.appendChild(closeButton);

    banner.appendChild(title);
    banner.appendChild(text);
    banner.appendChild(actions);

    document.body.appendChild(banner);
  }

  async function checkForUpdates(manualCheck) {
    if (updateCheckRunning) {
      return;
    }

    const manual = Boolean(manualCheck);

    if (navigator.onLine === false) {
      if (manual) showMessage('Ni povezave. Trening deluje brez interneta; posodobitve preveri pozneje.', 'err');
      return;
    }

    if (!manual) {
      const lastCheck = parseInt(
        localStorage.getItem(
          LAST_CHECK_KEY
        ) || '0',
        10
      );

      if (
        Number.isFinite(lastCheck) &&
        Date.now() - lastCheck <
          CHECK_INTERVAL_MS
      ) {
        return;
      }
    }

    updateCheckRunning = true;

    if (manual) {
      showMessage(
        'Preverjam posodobitve ...',
        'ok'
      );
    }

    try {
      const installedVersion =
        await getInstalledVersion();

      const response = await fetch(
        RELEASE_API,
        {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept:
              'application/vnd.github+json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(
          'GitHub API napaka: ' +
          response.status
        );
      }

      const release =
        await response.json();

      const latestVersion = String(
        release.tag_name || ''
      ).replace(/^v/i, '');

      if (!latestVersion) {
        throw new Error(
          'GitHub Release nima oznake verzije.'
        );
      }

      localStorage.setItem(
        LAST_CHECK_KEY,
        String(Date.now())
      );

      if (
        isNewerVersion(
          latestVersion,
          installedVersion
        )
      ) {
        showUpdateBanner(
          release,
          installedVersion,
          latestVersion
        );
      } else if (manual) {
        showMessage(
          'Najnovejša verzija je že nameščena (' +
          installedVersion +
          ').',
          'ok'
        );
      }
    } catch (error) {
      console.warn(
        'Update check failed:',
        error
      );

      if (manual) {
        showMessage(
          'Preverjanje posodobitev ni uspelo.',
          'err'
        );
      }
    } finally {
      updateCheckRunning = false;
    }
  }

  function addManualUpdateButton() {
    if (
      document.getElementById(
        'wt-update-check-btn'
      )
    ) {
      return;
    }

    const container =
      document.getElementById('wt-update-settings') || document.querySelector('.topbtns');

    if (!container) {
      return;
    }

    const button =
      document.createElement('button');

    button.id =
      'wt-update-check-btn';

    button.type = 'button';
    button.className = 'sb';

    button.textContent =
      '⬆ Posodobitve';

    button.addEventListener(
      'click',
      function () {
        checkForUpdates(true);
      }
    );

    container.appendChild(button);
  }

  function initializeUpdates() {
    addManualUpdateButton();

    window.setTimeout(
      function () {
        checkForUpdates(false);
      },
      2000
    );
  }

  window.WTAndroidUpdates = {
    check: function () {
      return checkForUpdates(true);
    }
  };

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      initializeUpdates,
      {
        once: true
      }
    );
  } else {
    initializeUpdates();
  }
})();
