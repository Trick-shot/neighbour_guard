import {Stack} from "expo-router";
import {KeyboardProvider} from "react-native-keyboard-controller";
import {GestureHandlerRootView} from "react-native-gesture-handler";

import {BottomSheetProvider} from "../context/BottomSheetContext";
import {AuthProvider} from "../context/AuthContext";

import AppBottomSheet from "../components/AppBottomSheet";

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