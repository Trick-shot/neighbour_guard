import {ReactNode} from "react";
import {StyleProp, ViewStyle, StyleSheet} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";

const AppScreen = ({children, screenStyle}: { children?: ReactNode; screenStyle?: StyleProp<ViewStyle> }) => {
    return (
        <SafeAreaView style={[style.containerStyle, screenStyle]}>
            {children}
        </SafeAreaView>
    )
}

const style = StyleSheet.create({
    containerStyle: {
        flex: 1,
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 34
    }
})
export default AppScreen;