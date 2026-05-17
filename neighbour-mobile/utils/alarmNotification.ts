import * as Notifications from 'expo-notifications';
import {Audio} from 'expo-av';

let sound: Audio.Sound | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let repeatCount = 0;
const MAX_REPEATS = 5; // repeat 5 times then stop

export const playAlarm = async () => {
    try {
        await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,  // ← plays even on silent mode
            staysActiveInBackground: true,
            shouldDuckAndroid: false,
        });

        const {sound: newSound} = await Audio.Sound.createAsync(
            require('../assets/sounds/alarm.mp3'),
            {shouldPlay: true, volume: 1.0}
        );
        sound = newSound;
        await sound.playAsync();
    } catch (e) {
        console.log('Alarm sound error:', e);
    }
};

export const stopAlarm = async () => {
    try {
        if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
            sound = null;
        }
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        repeatCount = 0;
    } catch (e) {
        console.log('Stop alarm error:', e);
    }
};

export const startAlarmWithInterval = async (
    alertType: string,
    message: string,
    intervalSeconds: number = 30
) => {
    // play immediately
    repeatCount = 0;
    await playAlarmNotification(alertType, message);

    // repeat every X seconds until MAX_REPEATS or dismissed
    intervalId = setInterval(async () => {
        repeatCount++;
        if (repeatCount >= MAX_REPEATS) {
            await stopAlarm();
            return;
        }
        await playAlarmNotification(alertType, message);
    }, intervalSeconds * 1000);
};

const playAlarmNotification = async (alertType: string, message: string) => {
    // play sound
    await playAlarm();

    // show notification
    await Notifications.scheduleNotificationAsync({
        content: {
            title: getAlarmTitle(alertType),
            body: message || 'Your neighbour needs attention!',
            sound: 'alarm.mp3',  // custom sound file
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 500, 200, 500, 200, 500],  // aggressive vibration
            color: '#FF0000',
        },
        trigger: null,  // show immediately
    });
};

const getAlarmTitle = (alertType: string) => {
    const titles: Record<string, string> = {
        emergency: '🚨 EMERGENCY ALERT!',
        fire: '🔥 FIRE ALERT!',
        medical: '🏥 MEDICAL EMERGENCY!',
        suspicious: '⚠️ SUSPICIOUS ACTIVITY!',
        other: '⚠️ NEIGHBOUR ALERT!',
    };
    return titles[alertType] ?? '🚨 ALERT!';
};