import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import {navigate} from "expo-router/build/global-state/routing";
import {TouchableOpacity, View} from "react-native";
import colors from "@/Utilis/config"
import Profile from "@/assets/images/Profile.svg"

const addPhoto = () => {
    return (
        <AppScreen screenStyle={{
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 24
        }}>
            <View style={{
                alignItems: "center"
            }}>
                <AppText styles={{
                    width: "100%",
                    backgroundColor: "green",
                    fontSize: 16
                }}>
                    Add Photo
                </AppText>
                <AppText styles={{
                    marginTop: 24,
                    fontSize: 16
                }}>
                    Personalize your account with a photo. you can always change later
                </AppText>
                <View style={{
                    marginTop: 24
                }}>
                    <Profile/>
                </View>
            </View>
            <View style={{
                width: "100%",
                alignItems: "center",
                gap: 20
            }}>
                <AppButton buttonStyles={{
                    backgroundColor: colors.primary,
                    height: 50,
                }}>Set Up Profile Pic</AppButton>
                <TouchableOpacity onPress={() => navigate("/(tabs)/home")}>
                    <AppText styles={{
                        fontSize: 16
                    }}>
                        Skip
                    </AppText>
                </TouchableOpacity>
            </View>
        </AppScreen>
    )
}

export default addPhoto;