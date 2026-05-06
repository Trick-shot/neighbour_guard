import AppButton from "@/components/AppButton";
import AppText from "@/components/AppText";
import LoadingScreen from "@/components/LoadingScreen";
import {HomeTypes} from "@/types/AuthTypes";
import {useRouter} from "expo-router";
import {Formik} from "formik";
import {useState} from "react";
import {TextInput, View, KeyboardAvoidingView, Platform, StyleSheet} from "react-native";

import HomeIcon from "@/assets/icons/homeIcon.svg"
import colors from "@/Utilis/config"
import {KeyboardAwareScrollView} from "react-native-keyboard-controller";
import * as Yup from "yup";

import authApi from '../../api/auth'


const validationSchema = Yup.object().shape({
    houseNumber: Yup.string().required().label('House number').required(),
    streetName: Yup.string().required().label('Street Name').required(),
    district: Yup.string().required().label('District').required(),
    residenceName: Yup.string().required().label('Residence Name').required(),
});

const HomeRegistration = () => {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [registerFailed, setRegisterFailed] = useState(false)


    const onSubmit = async (values: HomeTypes) => {
        setIsLoading(true)
        try {
            const results = await authApi.registerHome(values);
            console.log("RESULT:", results);


            router.navigate({
                path: "/authentication/allowLocation",
                params: {email: values.email}
            });
        } catch (error) {
            console.log("ERROR:", error);
            setRegisterFailed(true);
        } finally {
            setIsLoading(false);
        }

    }
    return (
        <View style={{
            flex: 1,
            paddingBottom: 100,
            paddingHorizontal: 16,
            paddingTop: 64
        }}>
            {isLoading && <LoadingScreen/>}
            <Formik initialValues={{
                houseNumber: "",
                streetName: "",
                district: "",
                residenceName: "",
            }} onSubmit={onSubmit} validationSchema={validationSchema}>
                {({handleSubmit, handleChange, errors, values, handleBlur, touched}) => (
                    <>
                        <KeyboardAvoidingView
                            style={{
                                flex: 1,
                            }}
                            behavior={Platform.OS === "ios" ? "padding" : "height"}
                        >
                            <KeyboardAwareScrollView bottomOffset={62} keyboardShouldPersistTaps="handled"
                                                     showsVerticalScrollIndicator={false}
                                                     extraKeyboardSpace={30}
                                                     enabled
                                                     overScrollMode="never"
                                                     contentContainerStyle={{
                                                         flexGrow: 1,
                                                         justifyContent: "space-between",
                                                         alignItems: "center",
                                                         paddingBottom: 20
                                                     }}>
                                <View style={{
                                    width: "100%",
                                    alignItems: "center"
                                }}>
                                    <View style={{
                                        width: 82,
                                        height: 82,
                                        borderRadius: 50,
                                        justifyContent: "center",
                                        alignItems: "center",
                                        borderWidth: 1,
                                        borderColor: "#D9D9D9"
                                    }}>
                                        <HomeIcon width={37} height={34}/>
                                    </View>
                                    <View>
                                        <AppText styles={{
                                            textAlign: "center",
                                            marginTop: 24
                                        }}>Home Registration</AppText>
                                        <AppText styles={{
                                            textAlign: "center",
                                            fontSize: 14,
                                            color: "#A5A5A5",
                                            marginTop: 16
                                        }}>Register your house for other neighbours to identify you with.</AppText>
                                    </View>
                                    <View style={{
                                        width: "100%",
                                        marginTop: 64,
                                        gap: 24
                                    }}>
                                        <TextInput
                                            style={[style.formInput, {
                                                borderColor: errors.houseNumber ? "red" : colors.TGrey60
                                            }]}
                                            placeholder="House Number"
                                            placeholderTextColor={errors.houseNumber ? "red" : colors.UIGrey40}
                                            onChangeText={handleChange('houseNumber')}
                                            value={values.houseNumber}
                                            onBlur={handleBlur('houseNumber')}
                                        />
                                        <TextInput
                                            style={[style.formInput, {
                                                borderColor: errors.streetName ? "red" : colors.TGrey60
                                            }]}
                                            placeholder="Street Name"
                                            placeholderTextColor={errors.streetName ? "red" : colors.UIGrey40}
                                            onChangeText={handleChange('streetName')}
                                            value={values.streetName}
                                            onBlur={handleBlur('streetName')}
                                        />
                                        <TextInput
                                            style={[style.formInput, {
                                                borderColor: errors.district ? "red" : colors.TGrey60
                                            }]}
                                            placeholder="District"
                                            placeholderTextColor={errors.district ? "red" : colors.UIGrey40}
                                            onChangeText={handleChange('district')}
                                            value={values.district}
                                            onBlur={handleBlur('district')}
                                        />

                                        <TextInput
                                            style={[style.formInput, {
                                                borderColor: errors.district ? "red" : colors.TGrey60
                                            }]} placeholder="Residence Name"
                                            placeholderTextColor={errors.district ? "red" : colors.UIGrey40}
                                            onChangeText={handleChange('residenceName')}
                                            value={values.residenceName}
                                            onBlur={handleBlur('residenceName')}
                                        />
                                    </View>
                                </View>
                            </KeyboardAwareScrollView>
                        </KeyboardAvoidingView>
                        <AppButton onPress={handleSubmit} buttonStyles={{
                            backgroundColor: colors.primary,
                        }}>Register Your Residence</AppButton>
                    </>)}
            </Formik>
        </View>

    )
}


const style = StyleSheet.create({
    formInput: {
        width: "100%",
        height: 56,
        borderStyle: "solid",
        borderWidth: 0.5,
        paddingLeft: 18,
        borderRadius: 15
    },
    errorMessage: {
        fontSize: 9,
        color: "red"
    }
})

export default HomeRegistration;