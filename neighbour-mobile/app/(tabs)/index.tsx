import UserComponent from "@/components/home/UserComponent";
import {useCallback, useEffect, useRef, useState} from "react";
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import BottomSheet, {BottomSheetView} from '@gorhom/bottom-sheet';
import {StatusBar} from "expo-status-bar";
import {View, Text, StyleSheet, TouchableOpacity, Pressable} from "react-native";
import MapView, {PROVIDER_GOOGLE} from 'react-native-maps';
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {router} from "expo-router";
import AlertIcon from "@/assets/icons/alertIcon.svg";
import BellIcon from "@/assets/icons/bellFill.svg";
import MapLocation from "@/assets/icons/mapLocation.svg";
import LoadingScreen from "@/components/LoadingScreen";


SplashScreen.preventAutoHideAsync();

const Index = () => {
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
                router.replace("/(tabs)");
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
                height: "100%",
            }}>
                <View style={{
                    flex: 1,
                    paddingTop: 48,
                    paddingHorizontal: 16
                }}>
                    <View style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        width: "100%"
                    }}>
                        <Pressable>
                            <AlertIcon/>
                        </Pressable>
                        <View style={{
                            alignItems: "center",
                            gap: 40
                        }}>
                            <Pressable style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: "rgba(120,120,128,1.6)"
                            }}>
                                <BellIcon/>
                            </Pressable>
                            <Pressable>
                                <MapLocation/>
                            </Pressable>
                        </View>
                    </View>

                </View>
            </MapView>
            <GestureHandlerRootView style={{
                flex: 1,
                ...StyleSheet.absoluteFillObject
            }}>
                <BottomSheet
                    ref={bottomSheetRef}
                    onChange={handleSheetChanges}
                    snapPoints={['22%']}
                    index={1}
                >
                    <BottomSheetView style={{
                        height: "20%",
                        padding: 36,
                        paddingTop: 14,
                        paddingHorizontal: 24,
                        alignItems: 'flex-start',
                    }}>
                        <UserComponent/>
                    </BottomSheetView>
                </BottomSheet>
            </GestureHandlerRootView>

        </View>
    );
}

export default Index;