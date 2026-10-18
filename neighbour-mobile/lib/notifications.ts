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
import {Platform} from 'react-native';

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

/** Ask permission, get the Expo push token and give it to the server. Returns false if refused. */
export async function registerForSos(): Promise<boolean> {
    if (!Device.isDevice) return false;
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted) {
        const asked = await Notifications.requestPermissionsAsync({
            ios: {allowAlert: true, allowSound: true, allowBadge: true, allowCriticalAlerts: true},
        });
        granted = asked.granted;
    }
    if (!granted) return false;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const {data} = await Notifications.getExpoPushTokenAsync({projectId});
    await alertsApi.savePushToken(data).catch(() => undefined);
    return true;
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
