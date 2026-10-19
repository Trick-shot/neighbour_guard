import Constants from 'expo-constants';

/**
 * Is a Google Maps key actually in this build?
 *
 * It matters because a Google `MapView` without one does not degrade — it throws
 * `IllegalStateException: API key not found` on a native thread and kills the process. A missing
 * key would otherwise crash the Home map, the pin-home step of onboarding and the profile map,
 * which is to say most of the app, with no clue why.
 *
 * `app.config.js` injects the key from the environment at build time, so this reads what the build
 * really has rather than what someone meant to set.
 */
export const hasMapsKey = (() => {
    const android = (Constants.expoConfig as any)?.android?.config?.googleMaps?.apiKey;
    const ios = (Constants.expoConfig as any)?.ios?.config?.googleMapsApiKey;
    return Boolean(android || ios);
})();
