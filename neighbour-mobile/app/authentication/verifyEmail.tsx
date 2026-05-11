import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import LoadingScreen from "@/components/LoadingScreen";

import {useAuth} from "@/context/AuthContext";
import colors from "@/Utilis/config";
import {useRouter, useLocalSearchParams} from "expo-router";
import {useState, useEffect, useRef} from "react";
import {StyleSheet, View, Alert} from "react-native";
import VerifyIllustration from '@/assets/illustrations/verifyEmail.svg'
import authApi from '../../api/auth'

const VerifyEmail = () => {
    const router = useRouter();
    const {password} = useLocalSearchParams<{ email: string, password: string }>();
    const [isLoading, setIsLoading] = useState(false)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const {email} = useAuth();


    useEffect(() => {
        const checkVerified = async () => {
            try {
                const result = await authApi.login(email, password)
                if (result.status === 200) {
                    if (intervalRef.current) clearInterval(intervalRef.current)
                    router.navigate({
                        pathname: '/authentication/enterPhoneNumber',
                    })
                }
            } catch (e: any) {
                if (e?.response?.status !== 401) {
                    if (intervalRef.current) clearInterval(intervalRef.current)
                }
            }
        }

        intervalRef.current = setInterval(checkVerified, 5000)

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [])

    const handleResend = async () => {
        try {
            setIsLoading(true)
            await authApi.resendActivation(email)
            Alert.alert('Success', 'Activation email resent successfully')
        } catch (e) {
            Alert.alert('Error', 'Failed to resend email. Try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AppScreen screenStyle={styles.screen}>
            {isLoading && <LoadingScreen/>}
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
                <AppText styles={{fontSize: 14, color: '#A5A5A5'}}>
                    1 / 3
                </AppText>
            </View>

            <AppText styles={{
                fontSize: 24,
                marginTop: 24,
                textAlign: "center",
                width: "100%"
            }}>
                Verify your email
            </AppText>

            <AppText styles={{
                fontSize: 15,
                marginTop: 16,
                color: "#434343",
                textAlign: "center",
                lineHeight: 20
            }}>
                We&#39;ve sent an email to {email}. Click the link to verify your email.
            </AppText>

            <View style={{
                marginTop: 26,
                width: "100%",
                alignItems: "center"
            }}>
                <VerifyIllustration width={233} height={233}/>
            </View>

            <AppButton
                onPress={handleResend}
                buttonStyles={{
                    marginTop: "70%",
                    backgroundColor: colors.primary
                }}
            >
                Resend Link
            </AppButton>
        </AppScreen>
    )
}

const styles = StyleSheet.create({
    screen: {
        alignItems: "center"
    }
})

export default VerifyEmail;