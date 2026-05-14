import {Stack} from "expo-router";
import {KeyboardProvider} from "react-native-keyboard-controller";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import * as Notifications from 'expo-notifications';
import {BottomSheetProvider} from "../context/BottomSheetContext";
import {AuthProvider} from "../context/AuthContext";

import AppBottomSheet from "../components/AppBottomSheet";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,   // ✅ add this
        shouldShowList: true,     // ✅ add this
    }),
});


export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{flex: 1}}>
            <AuthProvider>
                <BottomSheetProvider>
                    <KeyboardProvider>
                        <Stack screenOptions={{headerShown: false}}/>

                        <AppBottomSheet/>
                    </KeyboardProvider>
                </BottomSheetProvider>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}