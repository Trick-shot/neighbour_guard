import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import {Platform} from 'react-native';
import alertsApi from '@/api/alerts';

// ✅ Handle notifications when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        const data = notification.request.content.data;
        const isAlert = data?.alert_type !== undefined;

        return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            priority: isAlert
                ? Notifications.AndroidNotificationPriority.MAX
                : Notifications.AndroidNotificationPriority.DEFAULT,
        };
    },
});

export const registerPushToken = async () => {
    if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return;
    }

    const {status: existingStatus} = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const {status} = await Notifications.requestPermissionsAsync({
            ios: {
                allowAlert: true,
                allowSound: true,
                allowCriticalAlerts: true,  // ← bypasses silent mode on iOS
            }
        });
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    console.log("Expo push token:", token);

    const res = await alertsApi.savePushToken(token);
    if (res.ok) {
        console.log("Push token saved to backend ✅");
    } else {
        console.log("Failed to save push token:", res.problem);
    }

    // ✅ Android alarm channel - loud, bypasses DND
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('alerts', {
            name: 'Neighbour Alerts',
            importance: Notifications.AndroidImportance.MAX,
            sound: 'alarm.mp3',                           // ← custom alarm sound
            vibrationPattern: [0, 500, 200, 500, 200, 500], // ← aggressive vibration
            lightColor: '#FF0000',
            bypassDnd: true,                              // ← bypasses Do Not Disturb
        });

        // separate channel for messages
        await Notifications.setNotificationChannelAsync('messages', {
            name: 'Messages',
            importance: Notifications.AndroidImportance.DEFAULT,
            sound: 'default',
            vibrationPattern: [0, 250],
        });
    }

    return token;
};