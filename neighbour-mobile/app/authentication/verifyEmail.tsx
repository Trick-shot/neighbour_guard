import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import LoadingScreen from "@/components/LoadingScreen";
import colors from "@/Utilis/config";
import {useRouter, useLocalSearchParams} from "expo-router";
import {useState, useEffect} from "react";
import {StyleSheet, View} from "react-native";
import VerifyIllustration from '@/assets/illustrations/verifyEmail.svg'
import authApi from '../../api/auth'


const VerifyEmail = () => {
    const router = useRouter();
    const {email, password} = useLocalSearchParams();
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const checkVerified = async () => {
            const results = await authApi.login(email as string, password as string);
            if (results.ok) {
                setIsLoading(true)
                clearInterval(interval);
                setIsLoading(false)
                router.navigate('./enterPhoneNumber')
            }
        }

        const interval = setInterval(checkVerified, 5000)

        return () => clearInterval(interval)
    }, [])

    const handleResend = async () => {
        setIsLoading(true);
        await authApi.resendActivation(email as string);
        setIsLoading(false);
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
                <AppText styles={{
                    fontSize: 14,
                    color: '#A5A5A5'
                }}>
                    1 / 3
                </AppText>
            </View>
            <AppText styles={{
                fontSize: 24,
                marginTop: 24,
                textAlign: "center",
                width: "100%"
            }}>Verify your email</AppText>
            <AppText styles={{
                fontSize: 15,
                marginTop: 16,
                color: "#434343",
                textAlign: "center",
                lineHeight: 20
            }}>We’ve sent an email to {email} Click the link to verify email</AppText>
            <View style={{
                marginTop: 26,
                width: "100%",
                alignItems: "center"
            }}>
                <VerifyIllustration width={233} height={233}/>
            </View>
            <AppButton onPress={handleResend} buttonStyles={{
                marginTop: "70%",
                backgroundColor: colors.primary
            }}>Resend Link</AppButton>
        </AppScreen>
    )
}

const styles = StyleSheet.create({
    screen: {
        alignItems: "center"
    },
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
        color: '#000',
    },
    focusCell: {
        borderColor: '#000',
    },


})

export default VerifyEmail;