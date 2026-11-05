import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Small, non-secret settings that belong to this phone. Tokens never go here (SecureStore only).
 * Every read falls back to a default, so a failed read can never block start-up.
 */
export type Language = 'en' | 'sw';

const LANGUAGE = 'pref.language';

export const prefs = {
    async language(): Promise<Language | null> {
        try { return (await AsyncStorage.getItem(LANGUAGE)) as Language | null; } catch { return null; }
    },
    async setLanguage(lang: Language) {
        try { await AsyncStorage.setItem(LANGUAGE, lang); } catch { /* a default is fine */ }
    },
};
