import ChevironRight from "@/assets/icons/chevron-right.svg";
import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import colors from "@/Utilis/config";
import {useRouter} from "expo-router";
import {useState} from "react";
import {StyleSheet, View, Text, Platform, TouchableOpacity} from "react-native";
import type {TextInputProps} from 'react-native';
import {CodeField, Cursor, useBlurOnFulfill, useClearByFocusCell} from 'react-native-confirmation-code-field';

const CELL_COUNT = 4;
const autoComplete = Platform.select<TextInputProps['autoComplete']>({
    android: 'sms-otp',
    default: 'one-time-code',
});

const verifyPhoneNumber = () => {
    const [value, setValue] = useState('');
    const ref = useBlurOnFulfill({value, cellCount: CELL_COUNT});
    const [props, getCellOnLayoutHandler] = useClearByFocusCell({
        value,
        setValue,
    });
    const router = useRouter();


    return (
        <AppScreen screenStyle={styles.screen}>
            <View style={{
                borderWidth: 1,
                width: 57,
                height: 31,
                borderRadius: 20,
                justifyContent: "center",
                alignItems: "center",
                alignSelf: "flex-end",
                borderColor: "#A5A5A5"
            }}>
                <AppText styles={{
                    fontSize: 14,
                    color: '#A5A5A5'
                }}>
                    1/3
                </AppText>
            </View>
            <AppText styles={{
                fontSize: 24,
                marginTop: 24
            }}>Verify your email</AppText>
            <AppText styles={{
                fontSize: 14,
                marginTop: 16,
                color: "#A5A5A5"
            }}>Please enter the 6-digit code sent to erickluoga@1722.com</AppText>
            <View style={{
                marginTop: 16,

            }}>
                <CodeField
                    ref={ref}
                    value={value}
                    onChangeText={setValue}
                    cellCount={CELL_COUNT}
                    rootStyle={styles.codeFieldRoot}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoFocus={true}
                    autoComplete={autoComplete}
                    testID="my-code-input"
                    renderCell={({index, symbol, isFocused}) => (
                        <Text
                            key={index}
                            style={[styles.cell, isFocused && styles.focusCell]}
                            onLayout={getCellOnLayoutHandler(index)}>
                            {symbol || (isFocused && <Cursor/>)}
                        </Text>
                    )}
                />
            </View>
            <TouchableOpacity>
                <AppText styles={{
                    textAlign: "center",
                    fontSize: 14,
                    marginTop: 24,
                    textDecorationLine: "underline"

                }}>
                    Send Again
                </AppText>
            </TouchableOpacity>
            <AppButton onPress={() => router.push("/authentication/login")} buttonStyles={{
                backgroundColor: colors.primary,
                marginTop: 59,
                width: 51,
                height: 51,
                borderRadius: 25,
                alignSelf: "flex-end"
            }}><ChevironRight width={24} height={24}/></AppButton>
        </AppScreen>
    )
}

const styles = StyleSheet.create({
    screen: {},
    root: {
        flex: 1,
        padding: 20
    },
    title: {textAlign: 'center', fontSize: 30},
    codeFieldRoot: {marginTop: 20},
    cell: {
        width: 81,
        height: 58,
        borderRadius: 15,
        lineHeight: 55,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#D9D9D9',
        textAlign: 'center',
        color: '#000', // text color
    },
    focusCell: {
        borderColor: '#000',
    },


})

export default verifyPhoneNumber;