import {ReactNode} from "react";
import {View, StyleSheet, StyleProp, ViewStyle} from "react-native";

const AppForm = ({children, styles}: { children: ReactNode, styles?: StyleProp<ViewStyle> }) => {
    return (
        <View style={[formStyles.container, styles]}>
            {children}
        </View>
    )
}

const formStyles = StyleSheet.create({
    container: {
        width: "100%",
        height: 63
    }
})

export default AppForm;