/**
 * Expo config. The static part stays in `app.json`, which Expo reads first and hands to this
 * function as `config`. This file only adds what must never be committed: the Google Maps keys,
 * read from the environment.
 *
 * Set them in `.env` (gitignored; see `.env.example`):
 *   GOOGLE_MAPS_ANDROID_KEY=...
 *   GOOGLE_MAPS_IOS_KEY=...        # only while iOS screens pass PROVIDER_GOOGLE
 *
 * These are deliberately not `EXPO_PUBLIC_` variables: they are build-time native config, baked
 * into the Android manifest by `expo prebuild`, and they stay out of the public manifest the app
 * downloads. What actually protects the key is restricting it in the Google Cloud console to this
 * package name and signing certificate.
 */
module.exports = ({config}) => {
    const android = process.env.GOOGLE_MAPS_ANDROID_KEY;
    const ios = process.env.GOOGLE_MAPS_IOS_KEY;

    // A missing key does not fail the build. It fails the map, silently, and only on a device — so
    // say it here, where whoever is building can still see it.
    if (!android) {
        console.warn(
            '\n[neighbour-mobile] GOOGLE_MAPS_ANDROID_KEY is not set: the Android map will render blank.\n' +
            '  Add it to .env (see .env.example), then `npx expo prebuild --clean`.\n',
        );
    }

    return {
        ...config,
        android: {
            ...config.android,
            ...(android ? {config: {...config.android?.config, googleMaps: {apiKey: android}}} : {}),
        },
        ios: {
            ...config.ios,
            ...(ios ? {config: {...config.ios?.config, googleMapsApiKey: ios}} : {}),
        },
    };
};
