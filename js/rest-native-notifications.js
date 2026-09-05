(function () {
  'use strict';

  const NOTIFICATION_ID = 42002;
  const CHANNEL_ID = 'workout_rest_timer_v2';
  const CHANNEL_SOUND = 'workout_rest.wav';
  const EXACT_WARNING_KEY = 'wt_exact_alarm_v2_warning';

  let appIsActive = true;
  let scheduleGeneration = 0;
  let channelReadyPromise = null;

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
      console.warn('Plugin lookup failed:', error);
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

  function nativeNotificationsEnabled() {
    try {
      if (typeof window.getAlarmSettings !== 'function') {
        return true;
      }

      const settings = window.getAlarmSettings();
      return !settings || settings.notif !== false;
    } catch (error) {
      console.warn('Alarm settings lookup failed:', error);
      return true;
    }
  }

  const localNotifications = getPlugin('LocalNotifications');
  const appPlugin = getPlugin('App');
  const haptics = getPlugin('Haptics');

  if (!window.__WT_ANDROID_APP__) return;
  if (!localNotifications) {
    console.warn(
      'Native rest notifications niso aktivne: Android plugin ni na voljo.'
    );
    return;
  }

  const originalStartT =
    typeof window.startT === 'function'
      ? window.startT
      : null;

  const originalStopT =
    typeof window.stopT === 'function'
      ? window.stopT
      : null;

  const originalAlertEnd =
    typeof window.alertEnd === 'function'
      ? window.alertEnd
      : null;

  if (!originalStartT || !originalStopT || !originalAlertEnd) {
    console.error(
      'Native timer wrapper ni nasel funkcij startT, stopT ali alertEnd.'
    );
    return;
  }

  async function refreshAppState() {
    try {
      if (appPlugin && typeof appPlugin.getState === 'function') {
        const state = await appPlugin.getState();
        appIsActive = Boolean(state && state.isActive);
        return;
      }
    } catch (error) {
      console.warn('App state read failed:', error);
    }

    appIsActive = document.visibilityState !== 'hidden';
  }

  function registerAppStateListener() {
    if (
      appPlugin &&
      typeof appPlugin.addListener === 'function'
    ) {
      appPlugin
        .addListener('appStateChange', function (state) {
          appIsActive = Boolean(state && state.isActive);
        })
        .catch(function (error) {
          console.warn('App state listener failed:', error);
        });
    }

    document.addEventListener('visibilitychange', function () {
      if (!appPlugin) {
        appIsActive = document.visibilityState !== 'hidden';
      }
    });
  }

  async function createRestChannel() {
    if (channelReadyPromise) {
      return channelReadyPromise;
    }

    channelReadyPromise = (async function () {
      if (typeof localNotifications.createChannel !== 'function') {
        return;
      }

      await localNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'Odmor timer',
        description: 'Obvestilo ob koncu odmora med serijami',
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#00C853',
        sound: CHANNEL_SOUND
      });
    })();

    try {
      await channelReadyPromise;
    } catch (error) {
      channelReadyPromise = null;
      throw error;
    }
  }

  async function ensureNotificationPermission() {
    let permission =
      await localNotifications.checkPermissions();

    if (
      permission.display === 'prompt' ||
      permission.display === 'prompt-with-rationale'
    ) {
      permission =
        await localNotifications.requestPermissions();
    }

    if (permission.display !== 'granted') {
      showMessage(
        'Obvestila so blokirana. Dovoli jih za Workout Tracker TEST.',
        'err'
      );

      return false;
    }

    if (typeof localNotifications.areEnabled === 'function') {
      const enabled = await localNotifications.areEnabled();

      if (!enabled || enabled.value !== true) {
        showMessage(
          'Android obvestila so izklopljena v nastavitvah aplikacije.',
          'err'
        );

        return false;
      }
    }

    return true;
  }

  async function ensureExactAlarmPermission() {
    if (
      typeof localNotifications.checkExactNotificationSetting !==
      'function'
    ) {
      return true;
    }

    const setting =
      await localNotifications.checkExactNotificationSetting();

    if (setting && setting.exact_alarm === 'granted') {
      localStorage.removeItem(EXACT_WARNING_KEY);
      return true;
    }

    if (!localStorage.getItem(EXACT_WARNING_KEY)) {
      localStorage.setItem(EXACT_WARNING_KEY, '1');

      showMessage(
        'Odprejo se nastavitve. Dovoli Alarms & reminders, nato znova zazeni timer.',
        'err'
      );
    }

    if (
      typeof localNotifications.changeExactNotificationSetting ===
      'function'
    ) {
      await localNotifications.changeExactNotificationSetting();
    }

    return false;
  }

  async function removeDeliveredRestNotification() {
    if (
      typeof localNotifications.getDeliveredNotifications !==
        'function' ||
      typeof localNotifications.removeDeliveredNotifications !==
        'function'
    ) {
      return;
    }

    const delivered =
      await localNotifications.getDeliveredNotifications();

    const matching = Array.isArray(delivered.notifications)
      ? delivered.notifications.filter(function (notification) {
          return notification.id === NOTIFICATION_ID;
        })
      : [];

    if (matching.length > 0) {
      await localNotifications.removeDeliveredNotifications({
        notifications: matching
      });
    }
  }

  async function cancelNativeOnly() {
    try {
      await localNotifications.cancel({
        notifications: [
          {
            id: NOTIFICATION_ID
          }
        ]
      });
    } catch (error) {
      console.warn('Native notification cancel failed:', error);
    }

    try {
      await removeDeliveredRestNotification();
    } catch (error) {
      console.warn('Delivered notification cleanup failed:', error);
    }
  }

  async function cancelNativeAndInvalidate() {
    scheduleGeneration += 1;
    await cancelNativeOnly();
  }

  async function scheduleNativeNotification(seconds) {
    if (!nativeNotificationsEnabled()) {
      return;
    }

    const safeSeconds = Math.max(
      1,
      Math.floor(Number(seconds) || 0)
    );
    // Permission dialogs must not restart the duration after they close.
    const deadlineMs = Date.now() + safeSeconds * 1000;

    const myGeneration = scheduleGeneration + 1;
    scheduleGeneration = myGeneration;

    await cancelNativeOnly();

    if (myGeneration !== scheduleGeneration) {
      return;
    }

    const permissionGranted =
      await ensureNotificationPermission();

    if (
      !permissionGranted ||
      myGeneration !== scheduleGeneration
    ) {
      return;
    }

    const exactAlarmGranted =
      await ensureExactAlarmPermission();

    if (
      !exactAlarmGranted ||
      myGeneration !== scheduleGeneration
    ) {
      return;
    }

    await createRestChannel();

    if (myGeneration !== scheduleGeneration) {
      return;
    }

    const fireAt = new Date(
      Math.max(Date.now() + 100, deadlineMs)
    );

    const result = await localNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_ID,
          title: 'Konec odmora',
          body: 'Naslednja serija - gremo!',
          channelId: CHANNEL_ID,
          schedule: {
            at: fireAt,
            allowWhileIdle: true
          },
          autoCancel: true,
          extra: {
            type: 'workout-rest'
          }
        }
      ]
    });

    console.log(
      'Native timer scheduled:',
      result,
      fireAt.toISOString()
    );

    if (typeof localNotifications.getPending === 'function') {
      const pending = await localNotifications.getPending();
      console.log('Native timer pending:', pending);
    }
  }

  async function vibrateForeground() {
    if (!haptics || typeof haptics.vibrate !== 'function') {
      return;
    }

    try {
      await haptics.vibrate({
        duration: 900
      });
    } catch (error) {
      console.warn('Native vibration failed:', error);
    }
  }

  window.startT = function (key, seconds) {
    const result =
      originalStartT.apply(this, arguments);

    scheduleNativeNotification(seconds).catch(function (error) {
      console.error(
        'Native timer schedule failed:',
        error
      );

      showMessage(
        'Native obvestila ni bilo mogoce nastaviti. Preveri Android dovoljenja.',
        'err'
      );
    });

    return result;
  };

  window.stopT = function (key) {
    const result =
      originalStopT.apply(this, arguments);

    cancelNativeAndInvalidate().catch(function (error) {
      console.warn(
        'Native timer stop cancel failed:',
        error
      );
    });

    return result;
  };

  window.alertEnd = function (key) {
    if (appIsActive) {
      cancelNativeAndInvalidate().catch(function (error) {
        console.warn(
          'Foreground native cancel failed:',
          error
        );
      });

      vibrateForeground();
    }

    return originalAlertEnd.apply(this, arguments);
  };

  window.WTRestNotifications = {
    reschedule: function (seconds) {
      return scheduleNativeNotification(seconds);
    },

    scheduleTest: function (seconds) {
      return scheduleNativeNotification(seconds || 5);
    },

    cancel: function () {
      return cancelNativeAndInvalidate();
    },

    status: async function () {
      const result = {
        appIsActive: appIsActive,
        permission:
          await localNotifications.checkPermissions(),
        enabled:
          typeof localNotifications.areEnabled === 'function'
            ? await localNotifications.areEnabled()
            : null,
        exactAlarm:
          typeof localNotifications.checkExactNotificationSetting ===
          'function'
            ? await localNotifications.checkExactNotificationSetting()
            : null,
        pending:
          typeof localNotifications.getPending === 'function'
            ? await localNotifications.getPending()
            : null,
        channels:
          typeof localNotifications.listChannels === 'function'
            ? await localNotifications.listChannels()
            : null
      };

      console.log('WTRestNotifications status:', result);
      return result;
    }
  };

  refreshAppState();
  registerAppStateListener();

  createRestChannel().catch(function (error) {
    console.warn('Rest notification channel create failed:', error);
  });

  showMessage(
    'Native timer V2 je aktiven.',
    'ok'
  );

  console.log('Native Android rest notifications V2 so aktivne.');
})();
