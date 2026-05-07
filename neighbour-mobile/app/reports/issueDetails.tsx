import BackIcon from "@/assets/icons/backIcon.svg";
import SettingIcon from "@/assets/icons/settingIcon.svg";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import Comments from "@/components/Comments";
import ImageSlider from "@/components/ImageSlider";
import {Image} from "expo-image";
import {useRouter} from "expo-router";
import {View, StyleSheet, TouchableOpacity, ScrollView} from "react-native";
import colors from "@/Utilis/config";
import LocationIcon from "@/assets/icons/LocationIcon.svg"
import ClockIcon from "@/assets/icons/Clock.svg"

const IssueDetails = () => {
    const router = useRouter()
    return (
        <AppScreen screenStyle={styles.screen}>
            <View style={{
                flexDirection: "row",
                alignItems: "center",
                gap: "35%"

            }}>
                <TouchableOpacity onPress={() => router.back()}><BackIcon/></TouchableOpacity>
                <AppText styles={{
                    fontSize: 16,
                    fontWeight: "bold"
                }}>
                    Issue Detail
                </AppText>
            </View>
            <View style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                width: 79,
                padding: 5,
                borderRadius: 5,
                backgroundColor: colors.UIGrey20,
                marginTop: 22
            }}>
                <AppText styles={{
                    fontSize: 10,
                    fontWeight: "bold",
                    color: "green"
                }}>moderate</AppText>
            </View>
            <AppText styles={{
                marginTop: 20,
                fontWeight: "500"
            }}>Poor waste disposal making our neighbourhood ugly</AppText>
            <View style={{
                marginTop: 28,
                flexDirection: "row",
                alignItems: "center",
                gap: 22
            }}>
                <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16
                }}>
                    <LocationIcon/>
                    <AppText styles={{
                        fontSize: 10,
                        color: colors.TGrey60
                    }}>Distance 2.9km</AppText>

                </View>
                <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16
                }}>
                    <ClockIcon/>
                    <AppText styles={{
                        fontSize: 10,
                        color: colors.TGrey60
                    }}>10:00AM</AppText>
                </View>
            </View>
            <View style={{
                gap: 16,
                marginTop: 21
            }}>
                <AppText styles={{
                    fontWeight: "500",
                    fontSize: 16
                }}>Description</AppText>
                <AppText styles={{
                    fontSize: 14,
                    fontWeight: "light",
                    color: colors.TGrey60,
                    lineHeight: 22,
                }}>Poor waste management has become an issue people are disposing waste anywhere this is a health
                    hazard to us and our children lets find a way to solve this</AppText>
            </View>
            <View style={{
                marginTop: 32,
                gap: 25
            }}>
                <View style={{
                    flexDirection: "row",
                    justifyContent: "space-between"
                }}>
                    <AppText styles={{
                        fontSize: 16,
                        fontWeight: "light",
                        color: colors.TGrey100,
                        lineHeight: 22,
                    }}>Media</AppText>
                    <TouchableOpacity>
                        <AppText styles={{
                            fontSize: 16,
                            fontWeight: "light",
                            color: colors.primaryLight,
                            lineHeight: 22,
                            textDecorationLine: "underline"
                        }}>see more</AppText>
                    </TouchableOpacity>
                </View>
                <ImageSlider/>
            </View>
            <View style={{
                marginTop: 32
            }}>
                <AppText styles={{
                    fontWeight: "500",
                    fontSize: 16
                }}>Comments</AppText>
                <ScrollView>
                    <View style={{
                        marginTop: 16
                    }}>
                        <Comments/>
                    </View>
                </ScrollView>
            </View>
        </AppScreen>
    )
}

const styles = StyleSheet.create({
    screen: {}
})

export default IssueDetails;