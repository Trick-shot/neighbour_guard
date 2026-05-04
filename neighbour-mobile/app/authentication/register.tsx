import AppleIcon from "@/assets/icons/apple.svg";
import GoogleIcon from "@/assets/icons/google.svg";
import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import LoadingScreen from "@/components/LoadingScreen";
import colors from "@/Utilis/config";
import {ApiResponse} from "apisauce";
import {useRouter} from "expo-router";
import {Formik} from "formik";
import {useState} from "react";
import {StyleSheet, TextInput, TouchableOpacity, View} from "react-native";
import ChevironRight from "@/assets/icons/chevron-right.svg"
import * as Yup from "yup";
import authApi from '../../api/auth'

const validationSchema = Yup.object().shape({
    fullName: Yup.string().required().label('full name').max(30).min(3),
    email: Yup.string().email().required(),
    password: Yup.string().required().min(4),
    confirmPassword: Yup.string()
        .required('Confirm your password')
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .label('confirm password'),
});


const Register = () => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false)
    const [registerFailed, setRegisterFailed] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")


    const onSubmit = async ({fullName, email, password, confirmPassword}: {
        fullName: string,
        email: string,
        password: string,
        confirmPassword: string
    }) => {
        setIsLoading(true);
        setErrorMessage("");

        const results: ApiResponse<any> = await authApi.register(fullName, email, password, confirmPassword);
        console.log(results)
        setIsLoading(false);
        if (!results.ok) {
            setRegisterFailed(true);
            if (results.data?.email) {
                setErrorMessage(results.data.email);
            } else if (results.data?.non_field_errors) {
                setErrorMessage(results.data.non_field_errors);
            } else {
                setErrorMessage("An error occurred, please try again");
            }
            return;
        }

        router.navigate({
            pathname: "./verifyEmail",
            params: {email, password}
        });
    }

    return (
        <AppScreen>
            {isLoading && <LoadingScreen/>}
            <Formik initialValues={{
                fullName: "",
                email: "",
                password: "",
                confirmPassword: ""
            }} onSubmit={onSubmit}
                    validationSchema={validationSchema}>
                {({handleSubmit, handleChange, errors, values, handleBlur, touched}) => (
                    <>
                        <AppText styles={{
                            width: "100%",
                            textAlign: "center",
                            fontSize: 24
                        }}>Get started</AppText>

                        <View style={{
                            marginTop: 8,
                            justifyContent: "space-evenly",
                            height: 430,
                            position: "relative"
                        }}>
                            <View>
                                <TextInput
                                    style={style.formInput}
                                    placeholder="Full Name"
                                    placeholderTextColor={colors.black}
                                    onChangeText={handleChange('fullName')}
                                    value={values.fullName}
                                    onBlur={handleBlur('fullName')}
                                />
                                <View style={{
                                    top: 8
                                }}>
                                    {
                                        errors.fullName && touched.fullName &&
                                        <AppText styles={style.errorMessage}>{errors.fullName}</AppText>
                                    }
                                </View>
                            </View>
                            <View>
                                <TextInput
                                    style={style.formInput}
                                    placeholder="Email"
                                    placeholderTextColor={colors.black}
                                    onChangeText={handleChange('email')}
                                    value={values.email}
                                    onBlur={handleBlur('email')}
                                />
                                <View style={{
                                    top: 8
                                }}>
                                    {
                                        errors.email && touched.email &&
                                        <AppText styles={style.errorMessage}>{errors.email}</AppText>
                                    }
                                </View>
                            </View>
                            <View>
                                <TextInput
                                    style={style.formInput}
                                    placeholder="Password"
                                    placeholderTextColor={colors.black}
                                    onChangeText={handleChange('password')}
                                    value={values.password}
                                    onBlur={handleBlur('password')}
                                />
                                <View style={{
                                    top: 8
                                }}>
                                    {
                                        errors.password && touched.password &&
                                        <AppText styles={style.errorMessage}>{errors.password}</AppText>
                                    }
                                </View>
                            </View>
                            <View>
                                <TextInput
                                    style={style.formInput}
                                    placeholder="Confirmation Password"
                                    placeholderTextColor={colors.black}
                                    onChangeText={handleChange('confirmPassword')}
                                    onBlur={handleBlur('confirmPassword')}
                                />
                                <View style={{
                                    top: 8
                                }}>
                                    {
                                        errors.confirmPassword && touched.confirmPassword &&
                                        <AppText styles={style.errorMessage}>{errors.confirmPassword}</AppText>
                                    }
                                </View>
                            </View>
                            <AppText styles={{
                                width: "100%",
                                textAlign: "center",
                                marginTop: 20,
                                fontSize: 12
                            }}>{errorMessage}</AppText>
                        </View>
                        <View style={{
                            position: "absolute",
                            alignSelf: 'center',
                            top: 500,
                            width: "100%"
                        }}>
                            <AppButton onPress={handleSubmit} buttonStyles={{
                                backgroundColor: colors.primary,
                                marginTop: 59,
                                width: "100%"
                            }}>register</AppButton>
                            <AppText styles={{
                                fontSize: 14,
                                width: "100%",
                                textAlign: "center",
                                marginTop: 45
                            }}>Or continue with</AppText>
                            <View style={{
                                flexDirection: "row",
                                justifyContent: "center",
                                alignItems: "center",
                                marginTop: 30,
                                gap: 50
                            }}>
                                <TouchableOpacity>
                                    <GoogleIcon width={42} height={42}/>
                                </TouchableOpacity>
                                <TouchableOpacity>
                                    <AppleIcon width={55} height={55}/>
                                </TouchableOpacity>
                            </View>
                            <View style={{
                                justifyContent: "center",
                                flexDirection: "row",
                                gap: 5,
                                marginTop: 30
                            }}>
                                <AppText styles={{
                                    fontSize: 14
                                }}>Already have an account?</AppText>
                                <TouchableOpacity disabled={isLoading}
                                                  onPress={() => router.push('/authentication/login')}>
                                    <AppText styles={{
                                        fontSize: 14,
                                        color: colors.primary
                                    }}>sign in</AppText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                )}

            </Formik>
        </AppScreen>
    )
}
const style = StyleSheet.create({
    screenStyle: {
        flex: 1,
        backgroundColor: "#fff"
    },
    formInput: {
        width: "100%",
        height: 56,
        borderColor: "#D9D9D9",
        borderStyle: "solid",
        borderWidth: 1,
        paddingLeft: 18,
        borderRadius: 15
    },
    errorMessage: {
        fontSize: 9,
        color: "red",
        position: "absolute"
    }
})

export default Register;