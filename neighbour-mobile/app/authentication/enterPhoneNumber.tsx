import {useRouter} from "expo-router";
import {TextInput, View} from "react-native";

import ChevironRight from "@/assets/icons/chevron-right.svg";
import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import colors from "@/Utilis/config";

const enterPhoneNumber = () => {
    const router = useRouter();
    return (
        <AppScreen>
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
                    1/3
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
            }}>Please enter the 6-digit code sent to erickluoga@1722.com</AppText>
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
            <AppButton onPress={() => router.push("/authentication/verfyPhoneNumber")} buttonStyles={{
                backgroundColor: colors.primary,
                marginTop: 59,
                width: 51,
                height: 51,
                borderRadius: 25,
                alignSelf: "flex-end"
            }}><ChevironRight width={24} height={24}/></AppButton>
        </AppScreen>
    )
}

export default enterPhoneNumber;