import authApi from "@/api/auth";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import LoadingScreen from "@/components/LoadingScreen";
import {ProfileType} from "@/types/ProfileType";
import {ApiResponse} from "apisauce";
import * as ImagePicker from "expo-image-picker";
import {useRouter,useFocusEffect} from "expo-router";
import {useEffect, useRef, useState,useCallback} from "react";
import {Alert, Pressable, StyleSheet, TouchableOpacity, View} from "react-native";
import {Image} from 'expo-image';
import LogoIcon from "@/assets/icons/logo.svg"
import Right from "@/assets/icons/right.svg"
import UserProfile from "@/assets/icons/UserProfile.svg"
import Logout from "@/assets/icons/Logout.svg"
import * as SecureStore from 'expo-secure-store';
import profileApi from "@/api/profile";


const Profile = () => {
    const router = useRouter()

    const [profileData, setProfileData] = useState<ProfileType | null>(null)

    const handleLogout = async () => {
        try {
            await SecureStore.deleteItemAsync('access')
            await SecureStore.deleteItemAsync('refresh')

            const check = await SecureStore.getItemAsync('access')
            console.log('Token check:', check) // should be null

            router.replace('/authentication/login')
        } catch (e) {
            console.error('Error:', e)
        }
    }

    const getUserProfile = async () => {
        try {
            const res: ApiResponse<ProfileType> = await profileApi.userProfile()
            setProfileData(res.data)

        } catch (e) {

        }
    }

    useFocusEffect(
        useCallback(() => {
            getUserProfile()
        }, [])
    )

    if (!profileData) return <LoadingScreen/>

    return (
        <AppScreen screenStyle={styles.screen}>
            <View style={{
                alignItems: "center",
            }}>
                <Image
                    style={{
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                    }}
                    source={profileData.profile_pic}
                    contentFit="cover"
                    transition={1000}
                />
                <View style={{
                    alignItems: "center",
                    gap: 5,
                    marginTop: 16
                }}>
                    <AppText styles={{
                        fontSize: 16,
                        fontWeight: "bold"
                    }}>{profileData.user.full_name}</AppText>
                    <AppText styles={{
                        fontSize: 12
                    }}>{profileData.user.email}</AppText>
                </View>
            </View>
            <View style={{
                marginTop: 48

            }}>
                <View style={{
                    justifyContent: "center"
                }}>
                    <AppText styles={{
                        fontSize: 16,
                        fontWeight: "bold",
                    }}>Residence Information</AppText>
                    <TouchableOpacity onPress={() => router.push("/profile/residenceInformation")}
                                      style={{
                                          padding: 20,
                                          backgroundColor: "rgba(233,233,233,0.2)",
                                          borderRadius: 20,
                                          flexDirection: "row",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          marginTop: 16

                                      }}>
                        <View style={{
                            gap: 20,
                            flexDirection: "row",
                            alignItems: "center"
                        }}>
                            <LogoIcon/>
                            <View>
                                <AppText styles={{
                                    fontSize: 16
                                }}>Residence Information</AppText>
                                <AppText styles={{
                                    fontSize: 10
                                }}>Residence Information</AppText>
                            </View>
                        </View>
                        <Right/>
                    </TouchableOpacity>
                </View>
                <View style={{
                    justifyContent: "center",
                    marginTop: 48
                }}>
                    <AppText styles={{
                        fontSize: 16,
                        fontWeight: "bold",
                    }}>General</AppText>
                    <TouchableOpacity onPress={() => router.navigate({
                        pathname: "/profile/personalInformation",
                        params: {profileData: JSON.stringify(profileData)}
                    })} style={{
                        padding: 20,
                        backgroundColor: "rgba(233,233,233,0.2)",
                        borderRadius: 20,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 16

                    }}>
                        <View style={{
                            gap: 20,
                            flexDirection: "row",
                            alignItems: "center"
                        }}>
                            <UserProfile/>
                            <View>
                                <AppText styles={{
                                    fontSize: 16
                                }}>Personal Information</AppText>
                                <AppText styles={{
                                    fontSize: 10
                                }}>Manage your account details</AppText>
                            </View>
                        </View>
                        <Right/>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout} style={{
                        padding: 20,
                        backgroundColor: "rgba(233,233,233,0.2)",
                        borderRadius: 20,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 16

                    }}>
                        <View style={{
                            gap: 20,
                            flexDirection: "row",
                            alignItems: "center"
                        }}>
                            <Logout/>
                            <View>
                                <AppText styles={{
                                    fontSize: 16
                                }}>Log out</AppText>
                                <AppText styles={{
                                    fontSize: 10
                                }}>Log out from the app</AppText>
                            </View>
                        </View>
                        <Right/>
                    </TouchableOpacity>
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
export default Profile;