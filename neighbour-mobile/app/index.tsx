import Onboarding from "@/app/authentication/onboarding";
import LoadingScreen from "@/components/LoadingScreen";
import {ApiResponse} from "apisauce";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from 'expo-secure-store';
import {router} from "expo-router";
import {useEffect, useState} from "react";
import {useAuth} from "@/context/AuthContext";
import authApi from "@/api/auth";

SplashScreen.preventAutoHideAsync();

export default function Index() {
    const [isLoading, setIsLoading] = useState(true);
    const {login, isAuthenticated} = useAuth()

    useEffect(() => {
        checkUser()
    }, [])

    // react to auth state changes
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/authentication/login')
        }
    }, [isAuthenticated, isLoading])

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
            setIsLoading(false);
            await SplashScreen.hideAsync();
        }
    };

    if (isLoading) return <LoadingScreen/>;
    return <Onboarding/>;
}