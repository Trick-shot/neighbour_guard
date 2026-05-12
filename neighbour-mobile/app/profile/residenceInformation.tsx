import BackIcon from "@/assets/icons/backIcon.svg";
import SettingIcon from "@/assets/icons/settingIcon.svg";
import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import colors from "@/Utilis/config";
import {Image} from "expo-image";
import {useRouter} from "expo-router";
import {StyleSheet, TextInput, TouchableOpacity, View} from "react-native";
import HomeIcon from "@/assets/icons/homeIcon.svg"


const ResidenceInformation = () => {
    const router = useRouter()
    return (
        <AppScreen>
            <View style={{
                flexDirection: "row",
                justifyContent: "space-between"
            }}>
                <TouchableOpacity onPress={() => router.back()}><BackIcon/></TouchableOpacity>
                <TouchableOpacity>
                    <SettingIcon/>
                </TouchableOpacity>
            </View>
            <View style={{
                alignItems: "center",
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
                    <HomeIcon width={37} height={34}/>
                </View>
                <View style={{
                    alignItems: "center",
                    gap: 5,
                    marginTop: 16
                }}>
                    <AppText styles={{
                        fontSize: 16,
                        fontWeight: "bold"
                    }}>Erick Luoga</AppText>
                </View>
            </View>
            <View style={{
                gap: 20,
                marginTop: 32

            }}>
                <View style={{
                    gap: 10
                }}>
                    <AppText styles={{
                        fontSize: 14
                    }}>House Number</AppText>
                    <TextInput
                        style={styles.formInput}
                        placeholder="Password"
                        placeholderTextColor={colors.TGrey40}
                    />
                </View>
                <View style={{
                    gap: 10
                }}>
                    <AppText styles={{
                        fontSize: 14
                    }}>Street Name</AppText>
                    <TextInput
                        style={styles.formInput}
                        placeholder="Password"
                        placeholderTextColor={colors.TGrey40}
                    />
                </View>
                <View style={{
                    gap: 10
                }}>
                    <AppText styles={{
                        fontSize: 14
                    }}>District</AppText>
                    <TextInput
                        style={styles.formInput}
                        placeholder="+25574375852"
                        placeholderTextColor={colors.TGrey40}

                    />
                </View>
                <View style={{
                    gap: 10
                }}>
                    <AppText styles={{
                        fontSize: 14
                    }}>Residence Name</AppText>
                    <TextInput
                        style={styles.formInput}
                        placeholder="****"
                        placeholderTextColor={colors.TGrey40}

                    />
                    <AppButton onPress={() => router.push('/profile/updateResidenceLocation')} buttonStyles={{
                        marginTop: 32
                    }}>Set residence location</AppButton>
                </View>
            </View>
        </AppScreen>
    )
}
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        paddingVertical: 24
    },
    formInput: {
        width: "100%",
        height: 59,
        borderColor: "#D9D9D9",
        borderStyle: "solid",
        borderWidth: 1,
        paddingLeft: 18,
        borderRadius: 15
    }
});
export default ResidenceInformation;