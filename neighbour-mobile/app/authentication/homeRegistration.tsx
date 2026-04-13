import AppButton from "@/components/AppButton";
import AppText from "@/components/AppText";
import {useRouter} from "expo-router";
import {TextInput, View, KeyboardAvoidingView, Platform} from "react-native";

import LocationIcon from "@/assets/icons/location.svg"
import colors from "@/Utilis/config"
import {KeyboardAwareScrollView, KeyboardToolbar} from "react-native-keyboard-controller";


const HomeRegistration = () => {
    const router = useRouter()
    return (
        <View style={{
            flex: 1,
            paddingBottom: 100,
            paddingHorizontal: 16,
            paddingTop: 64
        }}>
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
                            <LocationIcon width={37} height={34}/>
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
                            }}>Register the house for other neighbour to identify with.</AppText>
                        </View>
                        <View style={{
                            width: "100%",
                            marginTop: 64,
                            gap: 24
                        }}>
                            <TextInput
                                style={{
                                    width: "100%",
                                    height: 63,
                                    borderColor: "#D9D9D9",
                                    borderStyle: "solid",
                                    borderWidth: 1,
                                    paddingLeft: 18,
                                    borderRadius: 15
                                }}
                                placeholder="Password"
                                placeholderTextColor={colors.black}

                            />
                            <TextInput
                                style={{
                                    width: "100%",
                                    height: 63,
                                    borderColor: "#D9D9D9",
                                    borderStyle: "solid",
                                    borderWidth: 1,
                                    paddingLeft: 18,
                                    borderRadius: 15
                                }}
                                placeholder="Password"
                                placeholderTextColor={colors.black}

                            />
                            <TextInput
                                style={{
                                    width: "100%",
                                    height: 63,
                                    borderColor: "#D9D9D9",
                                    borderStyle: "solid",
                                    borderWidth: 1,
                                    paddingLeft: 18,
                                    borderRadius: 15
                                }}
                                placeholder="Password"
                                placeholderTextColor={colors.black}

                            /><TextInput
                            style={{
                                width: "100%",
                                height: 63,
                                borderColor: "#D9D9D9",
                                borderStyle: "solid",
                                borderWidth: 1,
                                paddingLeft: 18,
                                borderRadius: 15
                            }}
                            placeholder="Password"
                            placeholderTextColor={colors.black}

                        />
                        </View>
                    </View>
                </KeyboardAwareScrollView>
                <KeyboardToolbar/>
            </KeyboardAvoidingView>
            <AppButton onPress={() => router.push('/authentication/allowLocation')} buttonStyles={{
                backgroundColor: colors.primary
            }}>Register Your Residence</AppButton>
        </View>

    )
}
export default HomeRegistration;