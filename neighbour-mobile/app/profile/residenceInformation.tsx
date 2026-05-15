import profileApi from "@/api/profile";
import residenceApi from "@/api/residence";
import BackIcon from "@/assets/icons/backIcon.svg";
import SettingIcon from "@/assets/icons/settingIcon.svg";
import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import LoadingScreen from "@/components/LoadingScreen";
import {ResidenceTypes} from "@/types/ResidenceTypes";
import colors from "@/utils/config";
import {ApiResponse} from "apisauce";
import {useRouter} from "expo-router";
import {useEffect, useState} from "react";
import {StyleSheet, TextInput, TouchableOpacity, View} from "react-native";
import HomeIcon from "@/assets/icons/homeIcon.svg"


const ResidenceInformation = () => {
    const router = useRouter()
    const [residenceData, setResidenceData] = useState<ResidenceTypes | null>(null)
    const [loading, setLoading] = useState(false)

    const getData = async () => {
        try {
            const residenceRes: ApiResponse<any> = await residenceApi.userResidence()
            setResidenceData(residenceRes.data)
        } catch (e) {
            console.log('Error fetching home data:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        getData()
    }, [])

    if (loading) return <LoadingScreen/>

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
                    }}>{residenceData?.residence_name}</AppText>
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
                        placeholder={residenceData?.house_number?.toString() ?? 'Enter house number'}
                        placeholderTextColor={colors.TGrey60}
                        editable={false}
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
                        placeholder={residenceData?.street_name}
                        placeholderTextColor={colors.TGrey60}
                        editable={false}
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
                        placeholder={residenceData?.district}
                        placeholderTextColor={colors.TGrey60}
                        editable={false}
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
                        placeholder={residenceData?.residence_name}
                        placeholderTextColor={colors.TGrey60}
                        editable={false}
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