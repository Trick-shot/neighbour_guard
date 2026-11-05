import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Small, non-secret settings that belong to this phone. Tokens never go here (SecureStore only).
 * Every read falls back to a default, so a failed read can never block start-up.
 */
export type Language = 'en' | 'sw';

const LANGUAGE = 'pref.language';
const ALARM_TESTED = 'pref.alarmTested';
const CHECKLIST_SEEN = 'pref.checklistSeen';
const SILENT_SOS = 'pref.silentSos';
const VIBRATE = 'pref.vibrate';
const OFFLINE_HOME = 'pref.offlineHome';

export const prefs = {
    async language(): Promise<Language | null> {
        try { return (await AsyncStorage.getItem(LANGUAGE)) as Language | null; } catch { return null; }
    },
    async setLanguage(lang: Language) {
        try { await AsyncStorage.setItem(LANGUAGE, lang); } catch { /* a default is fine */ }
    },
    // "Test your alarm" on the safety checklist: this phone has rung a test alarm at least once.
    async alarmTested() {
        try { return (await AsyncStorage.getItem(ALARM_TESTED)) === '1'; } catch { return false; }
    },
    async setAlarmTested() {
        try { await AsyncStorage.setItem(ALARM_TESTED, '1'); } catch { /* best effort */ }
    },
    // "Silent SOS": my own phone stays quiet (no countdown ticks) while I send. Default on.
    async silentSos() {
        try { return (await AsyncStorage.getItem(SILENT_SOS)) !== '0'; } catch { return true; }
    },
    async setSilentSos(on: boolean) {
        try { await AsyncStorage.setItem(SILENT_SOS, on ? '1' : '0'); } catch { /* best effort */ }
    },
    // "Vibrate" on the neighbour alarm screen, on top of the sound. Default on.
    async vibrate() {
        try { return (await AsyncStorage.getItem(VIBRATE)) !== '0'; } catch { return true; }
    },
    async setVibrate(on: boolean) {
        try { await AsyncStorage.setItem(VIBRATE, on ? '1' : '0'); } catch { /* best effort */ }
    },
    // What the SMS fallback needs when there is no network: my house and street, and how many
    // emergency contacts the server will text. Not secret: it is my own address, on my own phone.
    async offlineHome(): Promise<{ house_number: string; street: string; contacts?: number } | null> {
        try { return JSON.parse((await AsyncStorage.getItem(OFFLINE_HOME)) ?? 'null'); } catch { return null; }
    },
    async setOfflineHome(h: Partial<{ house_number: string; street: string; contacts: number }>) {
        try {
            const old = JSON.parse((await AsyncStorage.getItem(OFFLINE_HOME)) ?? '{}');
            await AsyncStorage.setItem(OFFLINE_HOME, JSON.stringify({...old, ...h}));
        } catch { /* best effort */ }
    },
    async checklistSeen() {
        try { return (await AsyncStorage.getItem(CHECKLIST_SEEN)) === '1'; } catch { return true; }
    },
    async setChecklistSeen() {
        try { await AsyncStorage.setItem(CHECKLIST_SEEN, '1'); } catch { /* best effort */ }
    },
};
