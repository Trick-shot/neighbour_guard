import LocationIcon from "@/assets/icons/location.svg";
import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import colors from "@/Utilis/config";
import {View} from "react-native";

const allowLocation = () => {
    return (
        <AppScreen screenStyle={{
            justifyContent: "space-between",
            alignItems: "center",
            height: "90%"
        }}>
            <View style={{
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
                    }}>Allow Location</AppText>
                    <AppText styles={{
                        textAlign: "center",
                        fontSize: 14,
                        color: "#A5A5A5",
                        marginTop: 16
                    }}>Allow access to your location to find your residence.</AppText>
                </View>
            </View>
            <AppButton buttonStyles={{
                backgroundColor: colors.primary
            }}>All location</AppButton>
        </AppScreen>
    )
}

export default allowLocation;