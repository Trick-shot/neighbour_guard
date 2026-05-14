import AppText from "@/components/AppText";
import {useEffect, useState} from "react";
import {Pressable, StyleSheet} from "react-native";
import colors from "@/utils/config";

const FilterButton = ({active, onPress, buttonText}: { buttonText: string, active: boolean, onPress: () => void }) => {
    return (
        <Pressable style={active ? styles.activeButton : styles.button} onPress={onPress}>
            <AppText styles={active ? styles.activeButtonText : styles.buttonText}>{buttonText}</AppText>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    activeButton: {
        padding: 10,
        backgroundColor: colors.UIGrey40,
        paddingHorizontal: 20,
        borderRadius: 20
    },
    button: {
        padding: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1
    },
    activeButtonText: {
        fontSize: 10,
        color: colors.TWhite
    },
    buttonText: {
        fontSize: 10,
        color: colors.TGrey100
    }
})

export default FilterButton;