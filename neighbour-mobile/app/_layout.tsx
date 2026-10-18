import {router, Stack} from 'expo-router';
import {useEffect} from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {KeyboardProvider} from 'react-native-keyboard-controller';

import AppBottomSheet from '@/components/AppBottomSheet';
import {AuthProvider, useAuth} from '@/context/AuthContext';
import {BottomSheetProvider} from '@/context/BottomSheetContext';
import {setOnLoggedOut} from '@/lib/api';
import {listenForSos, registerForSos, setupNotificationChannels} from '@/lib/notifications';

setupNotificationChannels();

function SessionEffects() {
    const {isAuthenticated, logout} = useAuth();
    useEffect(() => {
        setOnLoggedOut(() => {
            logout();
            router.replace('/authentication/login');
        });
    }, [logout]);
    useEffect(() => {
        if (!isAuthenticated) return;
        registerForSos();
        return listenForSos();
    }, [isAuthenticated]);
    return null;
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{flex: 1}}>
            <AuthProvider>
                <SessionEffects/>
                <BottomSheetProvider>
                    <KeyboardProvider>
                        <Stack screenOptions={{headerShown: false}}>
                            <Stack.Screen name="sos/hold" options={{presentation: 'transparentModal', animation: 'fade'}}/>
                            <Stack.Screen name="sos/countdown" options={{presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade'}}/>
                            <Stack.Screen name="sos/live" options={{gestureEnabled: false}}/>
                            <Stack.Screen name="sos/sms-fallback" options={{presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade'}}/>
                            <Stack.Screen name="alert/[id]" options={{presentation: 'fullScreenModal', animation: 'fade'}}/>
                            <Stack.Screen name="alert/on-the-way" options={{gestureEnabled: false}}/>
                        </Stack>
                        <AppBottomSheet/>
                    </KeyboardProvider>
                </BottomSheetProvider>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}
