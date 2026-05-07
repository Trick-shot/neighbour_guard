import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import colors from "@/Utilis/config";
import SettingIcon from "@/assets/icons/settingIcon.svg"
import BackIcon from "@/assets/icons/backIcon.svg"
import {useRouter} from "expo-router";
import {useRef} from "react";
import {StyleSheet, TextInput, TouchableOpacity, View, Platform} from "react-native";
import {Image} from 'expo-image';
import {MenuView, type MenuComponentRef} from '@react-native-menu/menu';
import LogoIcon from "@/assets/icons/logo.svg"
import Right from "@/assets/icons/right.svg"
import UserProfile from "@/assets/icons/UserProfile.svg"
import Logout from "@/assets/icons/Logout.svg"


const Profile = () => {
    const menuRef = useRef<MenuComponentRef>(null);
    const router = useRouter()

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
                        backgroundColor: "green"
                    }}
                    source="https://picsum.photos/seed/696/3000/2000"
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
                    }}>Erick Luoga</AppText>
                    <AppText styles={{
                        fontSize: 12
                    }}>erickluoga1722@gmail.com</AppText>
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
                    <TouchableOpacity onPress={() => router.push("/personalInformation")}
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
                    <TouchableOpacity style={{
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
                    <TouchableOpacity style={{
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