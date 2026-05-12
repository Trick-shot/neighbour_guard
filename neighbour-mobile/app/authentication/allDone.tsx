import animationData from "@/assets/animation/done.json";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import {useRouter} from "expo-router";
import LottieView from "lottie-react-native";
import {View} from "react-native";

const AllDone = () => {
    const router = useRouter()
    return (
        <AppScreen screenStyle={{
            justifyContent: "flex-start",
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
                    3 / 3
                </AppText>
            </View>
            <View style={{
                justifyContent: "flex-start",
                alignItems: 'center',
            }}>
                <LottieView
                    source={animationData}
                    loop={false}
                    style={{width: 100, height: 100}}
                    onAnimationFinish={() => setTimeout(() => {
                        router.navigate("/authentication/homeRegistration")
                    }, 2000)}
                />
                <View style={{
                    alignItems: "center", marginTop: 48
                }}>
                    <AppText styles={{
                        fontWeight: "bold"
                    }}>
                        All Done
                    </AppText>
                    <AppText styles={{textAlign: "center", fontSize: 14, marginTop: 16, color: "#A5A5A5"}}>
                        You have successfully created an account
                    </AppText>
                </View>
            </View>
        </AppScreen>
    )
}

export default AllDone;