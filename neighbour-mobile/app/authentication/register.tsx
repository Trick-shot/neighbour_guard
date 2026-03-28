import AppleIcon from "@/assets/icons/apple.svg";
import GoogleIcon from "@/assets/icons/google.svg";
import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import colors from "@/Utilis/config";
import {useRouter} from "expo-router";
import {StyleSheet, TextInput, TouchableOpacity, View} from "react-native";
import ChevironRight from "../../assets/icons/chevron-right.svg"

const register = () => {
    const router = useRouter();
    return (
        <AppScreen>
            <AppText styles={{
                width: "100%",
                textAlign: "center",
                fontSize: 24
            }}>Get started</AppText>
            <View style={{
                gap: 21,
                marginTop: 50
            }}>
                <TextInput
                    style={style.formInput}
                    placeholder="Email"
                    placeholderTextColor={colors.black}
                />
                <TextInput
                    style={style.formInput}
                    placeholder="Password"
                    placeholderTextColor={colors.black}

                />
                <TextInput
                    style={style.formInput}
                    placeholder="Password"
                    placeholderTextColor={colors.black}

                />
                <TextInput
                    style={style.formInput}
                    placeholder="Password"
                    placeholderTextColor={colors.black}

                />
            </View>
            <AppButton buttonStyles={{
                backgroundColor: colors.primary,
                marginTop: 59,
                width: 51,
                height: 51,
                borderRadius: 25,
                alignSelf: "flex-end"
            }}><ChevironRight width={24} height={24}/></AppButton>
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
                marginTop: 41,
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
                marginTop: 49
            }}>
                <AppText styles={{
                    fontSize: 14
                }}>Already have an account?</AppText>
                <TouchableOpacity onPress={() => router.navigate('/authentication/login')}>
                    <AppText styles={{
                        fontSize: 14,
                        color: colors.primary
                    }}>sign in</AppText>
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

export default register;