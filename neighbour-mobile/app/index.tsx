import {router} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {useEffect} from 'react';

import authStorage from '@/auth/storage';
import LoadingScreen from '@/components/LoadingScreen';
import {useAuth} from '@/context/AuthContext';

/**
 * Where the app decides whether you are signed in.
 *
 * It does not verify the token here. `lib/api` refreshes once on any 401 and signs you out only if
 * the refresh itself fails, so a stale access token sorts itself out on the first real request —
 * and the map opens immediately instead of waiting on the network at launch.
 */
export default function Index() {
    const {isAuthenticated, isReady, login} = useAuth();

    useEffect(() => {
        if (!isReady) return;
        (async () => {
            const access = await authStorage.getToken();
            const refresh = await authStorage.getRefreshToken();
            if (access && refresh) {
                if (!isAuthenticated) await login(access, refresh);
                router.replace('/(tabs)');
            } else {
                router.replace('/authentication/onboarding');
            }
            await SplashScreen.hideAsync().catch(() => undefined);
        })();
    }, [isReady, isAuthenticated, login]);

    return <LoadingScreen/>;
}
