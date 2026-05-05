import {ReactNode} from "react";
import {Text, StyleSheet, StyleProp, TextStyle} from "react-native";

const AppText = ({children, styles}: { children: ReactNode, styles?: StyleProp<TextStyle> }) => {
    return (
        <Text style={[style.appText, styles]}>
            {children}
        </Text>
    )
}

const style = StyleSheet.create(
    {
        appText: {
            fontSize: 20,
        }
    }
)

export default AppText;