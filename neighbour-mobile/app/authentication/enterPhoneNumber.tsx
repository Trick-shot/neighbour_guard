import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import {View} from "react-native";

const enterPhoneNumber = () => {
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
        </AppScreen>
    )
}

export default enterPhoneNumber;