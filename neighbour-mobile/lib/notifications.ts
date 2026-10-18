/**
 * SOS notifications.
 * Android: a dedicated "sos" channel (max importance, alarm sound, vibration, may bypass Do Not
 * Disturb). Channel settings are fixed once created, so the id changes if they ever change.
 * iOS: the server sends interruptionLevel "time-sensitive"; ringing on silent needs Apple's
 * Critical Alerts entitlement (requested separately).
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {router} from 'expo-router';
import {Linking, Platform} from 'react-native';

import {alertsApi} from './endpoints';

export const SOS_CHANNEL = 'sos';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export async function setupNotificationChannels() {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(SOS_CHANNEL, {
        name: 'SOS from neighbours',
        description: 'Rings when a neighbour near you sends an SOS.',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'alarm.mp3',
        vibrationPattern: [0, 600, 200, 600, 200, 600],
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        audioAttributes: {
            usage: Notifications.AndroidAudioUsage.ALARM,
            contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        },
    });
}

export const askForNotifications = () => Notifications.requestPermissionsAsync({
    ios: {allowAlert: true, allowSound: true, allowBadge: true, allowCriticalAlerts: true},
});

/**
 * Gets the Expo push token and gives it to the server, saying which step failed. A silent failure
 * here means a neighbour's phone never rings, so the Alarm check screen shows the reason.
 */
export type TokenResult = 'ok' | 'not-a-device' | 'refused' | 'no-token' | 'server';

export async function savePushToken(): Promise<TokenResult> {
    if (!Device.isDevice) return 'not-a-device';
    const {granted} = await Notifications.getPermissionsAsync();
    if (!granted) return 'refused';
    let token: string;
    try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        token = (await Notifications.getExpoPushTokenAsync({projectId})).data;
    } catch {
        return 'no-token';
    }
    try {
        await alertsApi.savePushToken(token);
    } catch {
        return 'server';
    }
    return 'ok';
}

/** Ask permission, get the Expo push token and give it to the server. Returns false if refused. */
export async function registerForSos(): Promise<boolean> {
    if (!Device.isDevice) return false;
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted && (await askForNotifications()).granted === false) return false;
    return (await savePushToken()) === 'ok';
}

function openFromNotification(data: Record<string, unknown> | undefined) {
    if (data?.kind === 'sos' && data.alert_id) router.push(`/alert/${data.alert_id}`);
}

/** Opens the alarm screen when an SOS arrives while the app is open, or when one is tapped. */
export function listenForSos() {
    const received = Notifications.addNotificationReceivedListener((n) =>
        openFromNotification(n.request.content.data as Record<string, unknown>));
    const tapped = Notifications.addNotificationResponseReceivedListener((r) =>
        openFromNotification(r.notification.request.content.data as Record<string, unknown>));
    // The app may have been opened by tapping an SOS while it was closed.
    Notifications.getLastNotificationResponseAsync().then((r) => {
        if (r) openFromNotification(r.notification.request.content.data as Record<string, unknown>);
    });
    return () => {
        received.remove();
        tapped.remove();
    };
}

/* ------------------------------------------------------------------------------------------------
 * Alarm health — "can an alarm actually reach this phone?"
 *
 * Everything an SOS depends on sits outside our code: a permission, a notification channel the user
 * can turn down, the OS deciding we may wake the phone, and the token reaching the server. The
 * Alarm check screen (Figma page "Android · 09") reads each one, and Home links to it when
 * something is off.
 * ---------------------------------------------------------------------------------------------- */

export type CheckState = 'ok' | 'bad' | 'warn' | 'unknown';

export type AlarmCheck = {
    id: string;
    title: string;
    detail: string;
    state: CheckState;
    fix?: { label: string; run: () => Promise<unknown> };
};

const packageName = () => Constants.expoConfig?.android?.package ?? '';

/** Opens an Android settings screen, falling back to this app's settings page. */
async function openAndroidSettings(action: string, extras: { key: string; value: string }[] = []) {
    try {
        await Linking.sendIntent(action, extras);
    } catch {
        await Linking.openSettings();
    }
}

export const openChannelSettings = () => {
    const pkg = packageName();
    if (!pkg) return Linking.openSettings();
    return openAndroidSettings('android.settings.CHANNEL_NOTIFICATION_SETTINGS', [
        {key: 'android.provider.extra.APP_PACKAGE', value: pkg},
        {key: 'android.provider.extra.CHANNEL_ID', value: SOS_CHANNEL},
    ]);
};

export const openBatterySettings = () =>
    openAndroidSettings('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');

/**
 * A test alarm on the real SOS channel, a few seconds from now, so the phone can be locked and put
 * in a pocket before it fires. `kind: 'test'` keeps it out of the alarm screen router.
 */
export async function sendTestAlarm(seconds = 5) {
    return Notifications.scheduleNotificationAsync({
        content: {
            title: 'Test alarm',
            body: 'This is how a neighbour’s SOS will sound. No one was alerted.',
            data: {kind: 'test'},
            sound: 'alarm.mp3',
            vibrate: [0, 600, 200, 600, 200, 600],
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds,
            channelId: SOS_CHANNEL,
        },
    });
}

/**
 * `withServer: false` keeps this off the network, for the Home screen's quick look. The full screen
 * also re-sends the push token, which is the only way to know the server really has this phone.
 */
export async function runAlarmChecks({withServer = true} = {}): Promise<AlarmCheck[]> {
    const checks: AlarmCheck[] = [];
    const perms = await Notifications.getPermissionsAsync();

    checks.push(perms.granted ? {
        id: 'permission',
        title: 'Notifications are allowed',
        detail: 'NeighbourGuard may show an alert on this phone.',
        state: 'ok',
    } : {
        id: 'permission',
        title: 'Notifications are blocked',
        detail: 'Without this, an SOS from a neighbour never appears and never rings.',
        state: 'bad',
        fix: perms.canAskAgain
            ? {label: 'Allow notifications', run: askForNotifications}
            : {label: 'Open settings', run: () => Linking.openSettings()},
    });

    if (Platform.OS === 'android') {
        const channel = await Notifications.getNotificationChannelAsync(SOS_CHANNEL);
        if (!channel) {
            checks.push({
                id: 'channel',
                title: 'The SOS alarm channel is missing',
                detail: 'It is created when the app starts. Recreating it should fix this.',
                state: 'bad',
                fix: {label: 'Create it', run: setupNotificationChannels},
            });
        } else {
            const loud = channel.importance === Notifications.AndroidImportance.MAX;
            checks.push({
                id: 'channel',
                title: loud ? 'The SOS channel is set to urgent' : 'The SOS channel was turned down',
                detail: loud
                    ? 'Android will show it over whatever is on screen.'
                    : 'Android keeps your choice for a channel, so only you can raise it again in settings.',
                state: loud ? 'ok' : 'bad',
                ...(loud ? {} : {fix: {label: 'Open channel settings', run: openChannelSettings}}),
            });

            const custom = channel.sound === 'custom';
            checks.push({
                id: 'sound',
                title: custom ? 'The alarm sound is in place' : 'The alarm sound is not being used',
                detail: custom
                    ? 'An SOS uses the alarm sound, not the normal notification tone.'
                    : `The channel is set to "${channel.sound ?? 'silent'}". An SOS would sound like any other message.`,
                state: custom ? 'ok' : 'bad',
                ...(custom ? {} : {fix: {label: 'Open channel settings', run: openChannelSettings}}),
            });

            checks.push({
                id: 'dnd',
                title: channel.bypassDnd ? 'Rings through Do Not Disturb' : 'Do Not Disturb will silence it',
                detail: channel.bypassDnd
                    ? 'An SOS is heard even when the phone is on Do Not Disturb.'
                    : 'Android only grants this with your permission. Allow it, or keep Do Not Disturb off.',
                state: channel.bypassDnd ? 'ok' : 'warn',
                ...(channel.bypassDnd ? {} : {fix: {label: 'Open channel settings', run: openChannelSettings}}),
            });
        }

        // No API can read this, and the manufacturer skins differ. Say so instead of guessing.
        checks.push({
            id: 'battery',
            title: 'Battery optimisation',
            detail: 'Cannot be read from inside the app. Open the list, find NeighbourGuard and choose '
                + '"Don’t optimise" or "Unrestricted", or the phone may hold back alarms while it sleeps.',
            state: 'unknown',
            fix: {label: 'Open battery settings', run: openBatterySettings},
        });
    }

    if (Platform.OS === 'ios') {
        const critical = perms.ios?.allowsCriticalAlerts === true;
        checks.push({
            id: 'silent',
            title: critical ? 'Rings on silent' : 'The silent switch will mute the alarm',
            detail: critical
                ? 'Critical Alerts are approved for this build.'
                : 'Ringing on silent needs Apple’s Critical Alerts entitlement, which is not approved yet. '
                    + 'Until then an SOS passes Focus modes but not the silent switch.',
            state: critical ? 'ok' : 'warn',
        });
    }

    if (!withServer) return checks;

    const token = await savePushToken();
    const tokenCopy: Record<TokenResult, { title: string; detail: string; state: CheckState }> = {
        ok: {
            title: 'This phone is registered with the server',
            detail: 'The server knows where to send an SOS for this phone.',
            state: 'ok',
        },
        'not-a-device': {
            title: 'Simulators cannot receive alarms',
            detail: 'Push notifications only work on a real phone. Test on the handset.',
            state: 'warn',
        },
        refused: {
            title: 'Not registered: notifications are blocked',
            detail: 'Allow notifications above, then check again.',
            state: 'bad',
        },
        'no-token': {
            title: 'This phone could not get a push token',
            detail: 'Google Play services or the build’s project id may be missing. An SOS cannot arrive.',
            state: 'bad',
        },
        server: {
            title: 'The server did not take this phone’s token',
            detail: 'The phone is ready but the server has not stored it. Check the connection and try again.',
            state: 'bad',
        },
    };
    checks.push({
        id: 'token',
        ...tokenCopy[token],
        ...(token === 'ok' || token === 'not-a-device'
            ? {}
            : {fix: {label: 'Try again', run: savePushToken}}),
    });

    return checks;
}

/**
 * True when something on this phone would stop an alarm getting through. Home shows a warning when
 * it is. Deliberately network-free: it runs every time Home comes into focus.
 */
export async function alarmsAreAtRisk(): Promise<boolean> {
    try {
        return (await runAlarmChecks({withServer: false})).some((c) => c.state === 'bad');
    } catch {
        return false;
    }
}
