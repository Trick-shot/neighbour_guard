import LoadingScreen from "@/components/LoadingScreen";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {router} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {useCallback, useEffect, useRef, useState} from "react";
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import BottomSheet, {BottomSheetView} from '@gorhom/bottom-sheet';
import {View, Text, StyleSheet} from "react-native";
import MapView, {PROVIDER_GOOGLE} from 'react-native-maps';


SplashScreen.preventAutoHideAsync();

const home = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [hasUser, setHasUser] = useState(false);

    const bottomSheetRef = useRef<BottomSheet>(null);

    // callbacks
    const handleSheetChanges = useCallback((index: number) => {
        console.log('handleSheetChanges', index);
    }, []);


    useEffect(() => {
        checkUser()
    }, [])

    const checkUser = async () => {
        try {
            const user = await AsyncStorage.getItem("user");
            if (user) {
                setHasUser(true);
                router.replace("/(tabs)/home"); // adjust to your issues route
            }
        } catch (error) {
            console.error("Failed to load user:", error);
        } finally {
            // setIsLoading(false);
            await SplashScreen.hideAsync();
        }
    };
    if (isLoading) {
        return (
            <LoadingScreen/>
        );
    }

    if (hasUser) return null;

    return (
        <View style={{
            flex: 1
        }}>
            <StatusBar style="light" animated/>
            <MapView provider={PROVIDER_GOOGLE} mapType="satellite" initialRegion={{
                latitude: -6.7924,
                longitude: 39.2083,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }} style={{
                width: "100%",
                height: "100%"
            }}/>
            <GestureHandlerRootView style={{
                flex: 1,
                ...StyleSheet.absoluteFillObject
            }}>
                <BottomSheet
                    ref={bottomSheetRef}
                    onChange={handleSheetChanges}
                    snapPoints={['100%']}
                    index={0}
                >
                    <BottomSheetView style={{
                        height: "20%",
                        padding: 36,
                        alignItems: 'center',
                    }}>
                        <Text>Awesome 🎉</Text>
                    </BottomSheetView>
                </BottomSheet>
            </GestureHandlerRootView>

        </View>
    );
}

export default home;