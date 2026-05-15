import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import LoadingScreen from "@/components/LoadingScreen";
import {ProfileType} from "@/types/ProfileType";
import colors from "@/utils/config";
import SettingIcon from "@/assets/icons/settingIcon.svg"
import BackIcon from "@/assets/icons/backIcon.svg"
import profileApi from "@/api/profile";
import {useLocalSearchParams, useRouter} from "expo-router";
import {useState} from "react";
import {Alert, StyleSheet, TextInput, TouchableOpacity, View, Pressable} from "react-native";
import {Image} from 'expo-image';
import * as ImagePicker from 'expo-image-picker';


const PersonalInformation = () => {
    const router = useRouter()
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false)


    const {profileData} = useLocalSearchParams()
    const parsedProfile: ProfileType = JSON.parse(profileData as string)

    const uploadPhoto = async (uri: string) => {
        try {
            setLoading(true)
            const formData = new FormData();
            formData.append('email', parsedProfile.user.email);
            formData.append('profile_pic', {
                uri,
                name: 'profile.jpg',
                type: 'image/jpeg',
            } as any);

            await profileApi.updateProfile(formData);

        } catch (e: any) {
            console.log(e?.response?.data)
            Alert.alert('Error', 'Failed to upload photo. Try again.')
        } finally {
            setLoading(false)
        }
    }

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Permission required', 'Permission to access the media library is required.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri
            setImage(uri)
            await uploadPhoto(uri)
        }
    }

    if (loading) return <LoadingScreen/>

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
                <Pressable onPress={pickImage}>
                    <Image
                        style={{
                            width: 100,
                            height: 100,
                            borderRadius: 50,
                            backgroundColor: colors.TGrey20
                        }}
                        source={image ?? parsedProfile.profile_pic}
                        contentFit="cover"
                        transition={1000}
                    />
                </Pressable>
                <View style={{
                    alignItems: "center",
                    gap: 5,
                    marginTop: 16
                }}>
                    <AppText styles={{
                        fontSize: 16,
                        fontWeight: "bold"
                    }}>{parsedProfile.user.full_name}</AppText>
                    <AppText styles={{
                        fontSize: 12
                    }}>{parsedProfile.user.email}</AppText>
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
                        placeholder={parsedProfile.user.email}
                        placeholderTextColor={colors.TGrey60}
                        editable={false}
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
                        placeholder={parsedProfile.user.full_name}
                        placeholderTextColor={colors.TGrey60}
                        editable={false}
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
                        placeholder={parsedProfile.phone_number}
                        placeholderTextColor={colors.TGrey60}
                        editable={false}
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
                        placeholder="*******"
                        placeholderTextColor={colors.TGrey60}
                        editable={false}

                    />
                    <TouchableOpacity style={{
                        width: "100%",
                        marginTop: 48
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