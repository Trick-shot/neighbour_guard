import {ReactNode} from "react";
import {Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle} from "react-native";

const AppButton = ({onPress, buttonStyles, children}: {
    buttonStyles?: StyleProp<ViewStyle>,
    onPress?: () => void,
    children: ReactNode
}) => {
    return (
        <TouchableOpacity style={[styles.button, buttonStyles]} onPress={onPress}>
            <Text style={styles.buttonText}>{children}</Text>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    button: {
        width: "100%",
        backgroundColor: "#000",
        height: 50,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    buttonText: {
        fontSize: 14,
        color: "#fff",
    }
})

export default AppButton;