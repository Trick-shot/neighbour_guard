import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import {useRouter} from "expo-router";
import {useState} from "react";
import {View, StyleSheet, TextInput, TouchableOpacity} from "react-native";
import {Checkbox} from 'expo-checkbox';
import colors from '../../Utilis/config'


const Login = () => {
    const [isChecked, setChecked] = useState(false)
    const router = useRouter()

    return (
        <AppScreen screenStyle={style.screenStyle}>
            <AppText styles={{
                width: "100%",
                textAlign: "center",
                fontSize: 24
            }}>Welcome Back</AppText>
            <View style={{
                gap: 31,
                marginTop: 50
            }}>
                <TextInput
                    style={style.formInput}
                    placeholder="email"
                    placeholderTextColor={colors.black}

                />
                <TextInput
                    style={style.formInput}
                    placeholder="Password"
                    placeholderTextColor={colors.black}

                />
            </View>
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
            <AppButton onPress={() => router.navigate("/authentication/allDone")}
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
                <TouchableOpacity onPress={() => router.navigate('/authentication/homeRegistration')}>
                    <AppText styles={{
                        fontSize: 14,
                        color: colors.primary
                    }}>Register</AppText>
                </TouchableOpacity>
            </View>
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
    }
})

export default Login;