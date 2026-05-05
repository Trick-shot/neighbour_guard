import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import {View} from "react-native";

const allDone = () => {
    return (
        <AppScreen screenStyle={{
            justifyContent: "center",
            alignItems: 'center',
        }}>
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
            <View style={{
                justifyContent: "center",
                alignItems: 'center',
                top: 200,
            }}>
                <AppText>
                    All Done
                </AppText>
                <AppText styles={{textAlign: "center", fontSize: 14, marginTop: 16}}>
                    You have successfully created an account
                </AppText>
            </View>
        </AppScreen>
    )
}

export default allDone;