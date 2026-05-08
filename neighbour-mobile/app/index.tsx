import Onboarding from "@/app/authentication/onboarding";
import AddPhoto from "@/app/authentication/addPhoto";
import LoadingScreen from "@/components/LoadingScreen";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {router} from "expo-router";
import {useEffect, useState} from "react";


SplashScreen.preventAutoHideAsync();

export default function Index() {
    const [isLoading, setIsLoading] = useState(true);
    const [hasUser, setHasUser] = useState(false);

    useEffect(() => {
        checkUser()
    }, [])

    const checkUser = async () => {
        try {
            const user = await AsyncStorage.getItem("user");
            if (user) {
                setHasUser(true);
                router.replace("/(tabs)");
            }
        } catch (error) {
            console.error("Failed to load user:", error);
        } finally {
            setIsLoading(false);
            await SplashScreen.hideAsync();
        }
    };
    if (isLoading) {
        return (
            <LoadingScreen/>
        );
    }

    if (hasUser) return null;
    return <Onboarding/>;
}
