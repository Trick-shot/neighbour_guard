import Onboarding from "@/app/authentication/onboarding";
import LoadingScreen from "@/components/LoadingScreen";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from 'expo-secure-store';
import {router} from "expo-router";
import {useEffect, useState} from "react";

SplashScreen.preventAutoHideAsync();

export default function Index() {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkUser()
    }, [])

    const checkUser = async () => {
        try {
            const token = await SecureStore.getItemAsync('access');
            if (token) {
                router.replace('/(tabs)');
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