import {useLocalSearchParams, useRouter} from "expo-router";
import {TextInput, View, Alert} from "react-native";
import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import colors from "@/Utilis/config";
import {Formik} from "formik";
import * as Yup from "yup";
import authApi from "../../api/auth";

const validationSchema = Yup.object().shape({
    phoneNumber: Yup.string()
        .required()
        .label('Phone number')
        .matches(
            /^(\+255|255|0)[0-9]{9}$/,
            'Enter a valid Tanzanian phone number e.g. 0712345678'
        ),
});

const EnterPhoneNumber = () => {
    const router = useRouter();
    const {email} = useLocalSearchParams<{ email: string }>();

    const onSubmit = async (values: { phoneNumber: string }) => {
        try {
            const phoneNumber = values.phoneNumber.trim()
            await authApi.requestOtpCodes(email, phoneNumber)
            router.push({
                pathname: "/authentication/verfyPhoneNumber",
                params: {phoneNumber}
            });
        } catch (e: any) {
            console.log(e?.response?.data)
            Alert.alert(
                'Error',
                e?.response?.data?.error || 'Failed to send OTP. Try again.'
            )
        }
    }

    return (
        <AppScreen screenStyle={{
            justifyContent: "space-between",
            paddingBottom: 20
        }}>
            <Formik
                initialValues={{phoneNumber: ""}}
                onSubmit={onSubmit}
                validationSchema={validationSchema}
            >
                {({handleSubmit, handleChange, values, errors, touched, handleBlur}) => (
                    <>
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
                                <AppText styles={{fontSize: 14, color: '#A5A5A5'}}>
                                    2 / 3
                                </AppText>
                            </View>

                            <AppText styles={{fontSize: 24, marginTop: 24}}>
                                Enter your phone number
                            </AppText>

                            <AppText styles={{fontSize: 14, marginTop: 16, color: "#A5A5A5"}}>
                                We will send you a 6 digit verification code
                            </AppText>

                            <TextInput
                                style={{
                                    width: "100%",
                                    height: 63,
                                    borderColor: touched.phoneNumber && errors.phoneNumber
                                        ? "red"
                                        : "#D9D9D9",
                                    borderWidth: 1,
                                    paddingLeft: 18,
                                    borderRadius: 15,
                                    marginTop: 32
                                }}
                                placeholder="e.g. 0712345678"
                                placeholderTextColor={colors.TGrey60}
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={values.phoneNumber}
                                onChangeText={handleChange('phoneNumber')}
                                onBlur={handleBlur('phoneNumber')}
                            />

                            {touched.phoneNumber && errors.phoneNumber && (
                                <AppText styles={{color: 'red', marginTop: 8, fontSize: 12}}>
                                    {errors.phoneNumber}
                                </AppText>
                            )}
                        </View>

                        <AppButton
                            onPress={() => handleSubmit()}
                            buttonStyles={{backgroundColor: colors.primary}}
                        >
                            Continue
                        </AppButton>
                    </>
                )}
            </Formik>
        </AppScreen>
    )
}

export default EnterPhoneNumber;