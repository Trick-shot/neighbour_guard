import {ApiResponse} from "apisauce";
import {Formik} from "formik";
import {useRouter} from "expo-router";
import {useState, useEffect} from "react";
import {View, StyleSheet, TextInput, TouchableOpacity, Alert} from "react-native";
import {Checkbox} from 'expo-checkbox';
import * as Yup from "yup";

import {TokenType} from "@/types/AuthTypes";
import colors from '@/utils/config';
import authApi from "@/api/auth"
import {useAuth} from "@/context/AuthContext";

import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import LoadingScreen from "@/components/LoadingScreen";

const validationSchema = Yup.object().shape({
    email: Yup.string().email().required(),
    password: Yup.string().required().min(4),
});


const Login = () => {
    const [isChecked, setChecked] = useState(false)
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState(null)
    const {login} = useAuth()

    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => {
                setErrorMessage(null)
            }, 3000)

            return () => clearTimeout(timer)
        }
    }, [errorMessage])

    const onSubmit = async ({email, password}: { email: string, password: string }) => {
        try {
            setLoading(true)
            const res = await authApi.login(email, password)
            setErrorMessage(null)
            // store tokens via context
            await login(res.data.access, res.data.refresh)

            // navigate to home
            router.replace('/(tabs)')

        } catch (e: any) {
            const detail = e?.response?.data?.detail
            setErrorMessage('Invalid email or password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AppScreen screenStyle={style.screenStyle}>
            {loading && <LoadingScreen/>}

            <Formik initialValues={{
                email: "",
                password: "",
            }} onSubmit={onSubmit}
                    validationSchema={validationSchema}>
                {({handleSubmit, handleChange, errors, values, handleBlur, touched}) => (
                    <>
                        <AppText styles={{
                            width: "100%",
                            textAlign: "center",
                            fontSize: 24
                        }}>Welcome Back</AppText>
                        <View style={{
                            gap: 31,
                            marginTop: 50
                        }}>
                            <View>
                                <TextInput
                                    style={style.formInput}
                                    placeholder="Email"
                                    placeholderTextColor={colors.black}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    value={values.email}
                                    onChangeText={handleChange('email')}
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
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    value={values.password}
                                    onChangeText={handleChange('password')}
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
                        </View>
                        <AppText styles={{
                            width: "100%",
                            textAlign: "center",
                            fontSize: 12,
                            color: "red", top: 50,
                        }}>{errorMessage}</AppText>
                        <View style={{marginTop: 95, flexDirection: "row", justifyContent: "space-between"}}>
                            <View style={{
                                flexDirection: "row",
                                gap: 8
                            }}>
                                <AppText styles={{
                                    fontSize: 14
                                }}>Remember Me</AppText>
                                <Checkbox color={isChecked ? colors.primary : undefined} value={isChecked}
                                          onValueChange={setChecked}
                                          style={{
                                              width: 20,
                                              height: 17,
                                              borderWidth: 0.1,
                                              backgroundColor: "#D9D9D9",
                                              borderRadius: 5,

                                          }}/>
                            </View>
                            <TouchableOpacity>
                                <AppText styles={{
                                    fontSize: 14,
                                    color: colors.primary
                                }}>Forgot Password ?</AppText>
                            </TouchableOpacity>
                        </View>
                        <AppButton onPress={handleSubmit}
                                   buttonStyles={{
                                       backgroundColor: colors.primary,
                                       marginTop: 59,
                                   }}>Login</AppButton>

                        <View style={{
                            justifyContent: "center",
                            flexDirection: "row",
                            gap: 5,
                            marginTop: "60%"
                        }}>
                            <AppText styles={{
                                fontSize: 14
                            }}>Don&#39;t have an account?</AppText>
                            <TouchableOpacity onPress={() => router.navigate('/authentication/register')}>
                                <AppText styles={{
                                    fontSize: 14,
                                    color: colors.primary
                                }}>Register</AppText>
                            </TouchableOpacity>
                        </View>
                    </>
                )}</Formik>
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
        height: 63,
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

export default Login;