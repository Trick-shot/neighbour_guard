import {useRouter} from "expo-router";
import {TextInput, View} from "react-native";
import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import colors from "@/Utilis/config";
import {Formik} from "formik";
import * as Yup from "yup";

const validationSchema = Yup.object().shape({
    phone: Yup.string().required().label('phone number').max(15).min(10),
});


const EnterPhoneNumber = () => {
    const router = useRouter();

    const onSubmit = async ({phone}) => {
        router.push({
            pathname: "/authentication/verfyPhoneNumber",
            params: {phone}
        });
    }

    return (
        <AppScreen screenStyle={{
            justifyContent: "space-between",
            paddingBottom: 20
        }}>
            <Formik initialValues={{
                phone: ""
            }} onSubmit={onSubmit}>
                {() => {
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
                                <AppText styles={{
                                    fontSize: 14,
                                    color: '#A5A5A5'
                                }}>2 / 3
                                </AppText>
                            </View>
                            <AppText styles={{
                                fontSize: 24,
                                marginTop: 24
                            }}>Enter your phone number</AppText>
                            <AppText styles={{
                                fontSize: 14,
                                marginTop: 16,
                                color: "#A5A5A5"
                            }}>We will send you the 4 digit verification code</AppText>
                            <TextInput
                                style={{
                                    width: "100%",
                                    height: 63,
                                    borderColor: "#D9D9D9",
                                    borderStyle: "solid",
                                    borderWidth: 1,
                                    paddingLeft: 18,
                                    borderRadius: 15,
                                    marginTop: 32
                                }}
                                placeholder="Phone Number"
                                placeholderTextColor={colors.black}
                            />
                        </View>
                        <AppButton onPress={() => router('./verfyPhoneNumber')} buttonStyles={{
                            marginTop: "70%",
                            backgroundColor: colors.primary
                        }}>Continue</AppButton>
                    </>
                }}
            </Formik>
        </AppScreen>
    )
}

export default EnterPhoneNumber;