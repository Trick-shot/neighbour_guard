import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import {TextInput, View, KeyboardAvoidingView, Platform} from "react-native";

import LocationIcon from "@/assets/icons/location.svg"
import colors from "@/Utilis/config"


const homeRegistration = () => {
    return (
        <AppScreen screenStyle={{
            justifyContent: "space-between",
            alignItems: "center",
            height: "90%"
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
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{
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
                </KeyboardAvoidingView>
            </View>
            <AppButton buttonStyles={{
                backgroundColor: colors.primary
            }}>Register Your Residence</AppButton>
        </AppScreen>
    )
}
export default homeRegistration;