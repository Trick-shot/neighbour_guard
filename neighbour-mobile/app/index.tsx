import {ApiResponse} from "apisauce";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from 'expo-secure-store';
import {router} from "expo-router";
import {useEffect, useState} from "react";
import {useAuth} from "@/context/AuthContext";
import authApi from "@/api/auth";
import LoadingScreen from "@/components/LoadingScreen";

export default function Index() {
    const [loading, setLoading] = useState(false)
    const {
        login,
        isAuthenticated,
        isReady,
    } = useAuth();
    console.log(isAuthenticated)

    useEffect(() => {
        checkUser()
    }, [])

    useEffect(() => {
        if (!isReady) return;
        if (isAuthenticated) {
            router.replace("/(tabs)");
        } else {
            router.replace(
                "/authentication/onboarding"
            );
        }
    }, [isAuthenticated, isReady]);

    const checkUser = async () => {
        try {
            const access = await SecureStore.getItemAsync('access')
            const refresh = await SecureStore.getItemAsync('refresh')

            if (!access || !refresh) return;

            try {
                await authApi.verifyToken(access)
                await login(access, refresh)
                router.replace('/(tabs)')
            } catch {
                try {
                    const res: ApiResponse<any> = await authApi.refreshToken(refresh)
                    await login(res.data.access, refresh)
                    router.replace('/(tabs)')
                } catch {
                    await SecureStore.deleteItemAsync('access')
                    await SecureStore.deleteItemAsync('refresh')
                }
            }
        } catch (error) {
            console.error("Failed to load user:", error);
        } finally {
            setLoading(false);
            await SplashScreen.hideAsync();
        }
    };

    if (loading) {
        return <LoadingScreen/>;
    }

    return null;
}