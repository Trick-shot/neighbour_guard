import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Small, non-secret settings that belong to this phone. Tokens never go here (SecureStore only).
 * Every read falls back to a default, so a failed read can never block start-up.
 */
export type Language = 'en' | 'sw';

const LANGUAGE = 'pref.language';
const ALARM_TESTED = 'pref.alarmTested';
const CHECKLIST_SEEN = 'pref.checklistSeen';

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
    async checklistSeen() {
        try { return (await AsyncStorage.getItem(CHECKLIST_SEEN)) === '1'; } catch { return true; }
    },
    async setChecklistSeen() {
        try { await AsyncStorage.setItem(CHECKLIST_SEEN, '1'); } catch { /* best effort */ }
    },
};
