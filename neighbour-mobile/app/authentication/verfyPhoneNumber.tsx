import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import LoadingScreen from "@/components/LoadingScreen";
import {useAuth} from "@/context/AuthContext";
import colors from "@/Utilis/config";
import {ApiResponse} from "apisauce";
import {useLocalSearchParams, useRouter} from "expo-router";
import {useState, useEffect, useRef} from "react";
import {StyleSheet, View, Text, Platform, TouchableOpacity} from "react-native";
import type {TextInputProps} from 'react-native';
import {CodeField, Cursor, useBlurOnFulfill, useClearByFocusCell} from 'react-native-confirmation-code-field';
import authApi from "../../api/auth";

const CELL_COUNT = 6;
const RESEND_TIMER = 60;

const autoComplete = Platform.select<TextInputProps['autoComplete']>({
    android: 'sms-otp',
    default: 'one-time-code',
});

const VerifyPhoneNumber = () => {
    const [value, setValue] = useState('');
    const [timer, setTimer] = useState(RESEND_TIMER);
    const [canResend, setCanResend] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const ref = useBlurOnFulfill({value, cellCount: CELL_COUNT});
    const [props, getCellOnLayoutHandler] = useClearByFocusCell({value, setValue});
    const router = useRouter();
    const {phoneNumber} = useLocalSearchParams<{ phoneNumber: string, email: string }>();
    const {email} = useAuth();


    useEffect(() => {
        startTimer();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const startTimer = () => {
        setTimer(RESEND_TIMER);
        setCanResend(false);
        intervalRef.current = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current!)
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }

    const handleResend = async () => {
        if (!canResend) return;
        try {
            await authApi.requestOtpCodes(email, phoneNumber);
            setValue('');
            setError('');
            startTimer();
        } catch (e) {
            setError('Failed to resend OTP. Try again.');
        }
    }

    const handleVerify = async () => {
        if (value.length !== CELL_COUNT) return;
        setLoading(true);
        setError('');
        try {
            const res: ApiResponse<any> = await authApi.verifyOtp(phoneNumber, value);

            if (res.ok)
                router.navigate({
                    pathname: '/authentication/allDone',
                    params: {email}
                });
            return
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Invalid OTP. Try again.');
            setValue('');
        } finally {
            setLoading(false);
        }
    }

    return (
        <AppScreen screenStyle={styles.screen}>
            {loading && <LoadingScreen/>}
            <View>
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
                    <AppText styles={{fontSize: 14, color: '#A5A5A5'}}>3/3</AppText>
                </View>

                <AppText styles={{fontSize: 24, marginTop: 24}}>OTP Verification</AppText>

                <AppText styles={{fontSize: 14, marginTop: 16, color: "#A5A5A5"}}>
                    Enter the 6-digit code sent to {phoneNumber}
                </AppText>

                <View style={{marginTop: 16}}>
                    <CodeField
                        ref={ref}
                        {...props}
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

                {error ? (
                    <AppText styles={{color: 'red', textAlign: 'center', marginTop: 12, fontSize: 13}}>
                        {error}
                    </AppText>
                ) : null}

                <TouchableOpacity onPress={handleResend} disabled={!canResend}>
                    <AppText styles={{
                        textAlign: "center",
                        fontSize: 14,
                        marginTop: 24,
                        textDecorationLine: canResend ? "underline" : "none",
                        color: canResend ? colors.primary : "#A5A5A5"
                    }}>
                        {canResend ? 'Send Again' : `Resend code in ${timer}s`}
                    </AppText>
                </TouchableOpacity>
            </View>

            <AppButton
                onPress={handleVerify}
                buttonStyles={{
                    backgroundColor: value.length === CELL_COUNT ? colors.primary : "#D9D9D9",
                    width: "100%"
                }}
                disabled={value.length !== CELL_COUNT || loading}
            >
                {loading ? 'Verifying...' : 'Verify'}
            </AppButton>
        </AppScreen>
    )
}

const styles = StyleSheet.create({
    screen: {justifyContent: "space-between"},
    codeFieldRoot: {marginTop: 20},
    cell: {
        width: 50,
        height: 58,
        borderRadius: 15,
        lineHeight: 55,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#D9D9D9',
        textAlign: 'center',
        color: '#000',
    },
    focusCell: {
        borderColor: '#000',
    },
})

export default VerifyPhoneNumber;