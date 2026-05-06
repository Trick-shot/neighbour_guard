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
import Logout from "@/assets/icons/Logout.svg"


const PersonalInformation = () => {
    const menuRef = useRef<MenuComponentRef>(null);
    const router = useRouter()


    return (
        <AppScreen screenStyle={styles.screen}>
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
                gap: 20,
                marginTop: 12

            }}>
                <View style={{
                    gap: 10
                }}>
                    <AppText styles={{
                        fontSize: 14
                    }}>Email</AppText>
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
                    }}>Full Name</AppText>
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
                    }}>Phone No.</AppText>
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
                    }}>Password</AppText>
                    <TextInput
                        style={styles.formInput}
                        placeholder="****"
                        placeholderTextColor={colors.TGrey40}

                    />
                    <TouchableOpacity style={{
                        width: "100%",
                        marginTop: 16
                    }}>
                        <AppText styles={{
                            textAlign: "center",
                            color: 'red',
                            fontSize: 14
                        }}>Delete Account</AppText>
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
export default PersonalInformation;