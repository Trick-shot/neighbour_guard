import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import LoadingScreen from "@/components/LoadingScreen";
import {useAuth} from "@/context/AuthContext";
import {Image} from "expo-image";
import {useRouter} from "expo-router";
import {navigate} from "expo-router/build/global-state/routing";
import {useState} from "react";
import {ActivityIndicator, Alert, Pressable, View} from "react-native";
import colors from "@/Utilis/config"
import Profile from "@/assets/images/Profile.svg"
import * as ImagePicker from 'expo-image-picker';
import CameraIcon from '@/assets/icons/Camera.svg'
import authApi from "@/api/auth"


const AddPhoto = () => {
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const {email} = useAuth();


    const uploadPhoto = async () => {
        if (!image) {
            router.replace('/(tabs)');
            return;
        }
        try {
            setLoading(true)
            const formData = new FormData();
            formData.append('email', email);
            formData.append('profile_image', {
                uri: image,
                name: 'profile.jpg',
                type: 'image/jpeg',
            } as any);

            await authApi.profileUpdate(formData);
            router.replace('/authentication/login');

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

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images',],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        console.log(result);

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    }
    return (
        <AppScreen screenStyle={{
            flex: 1,
            justifyContent: "space-between",
            paddingBottom: 32
        }}>
            {loading && <LoadingScreen/>}
            <View style={{
                alignItems: "center"
            }}><View style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%"
            }}>
                <AppText styles={{
                    fontSize: 24,
                    fontWeight: "semibold"
                }}>
                    Add Photo
                </AppText>
                <Pressable onPress={() => navigate("/(tabs)")}>
                    <AppText styles={{
                        fontSize: 16
                    }}> skip</AppText>
                </Pressable>
            </View>
                <AppText styles={{
                    marginTop: 24,
                    fontSize: 16,
                    fontWeight: 300
                }}>
                    Personalize your account with a photo. you can always change later
                </AppText>
                <View style={{
                    marginTop: 24
                }}>
                    {
                        image ? <Image
                            style={{
                                width: 120,
                                height: 120,
                                borderRadius: 60,
                            }}
                            source={image}
                            contentFit="cover"
                            transition={1000}
                        /> : <Profile width={120}/>

                    }
                </View>
            </View>
            <View style={{
                width: "100%",
                alignItems: "center",
                gap: 32
            }}>
                <Pressable onPress={pickImage} style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 15
                }}>
                    <CameraIcon/>
                    <AppText styles={{
                        fontSize: 16,
                        fontWeight: "semibold"
                    }}>
                        Add photo
                    </AppText>
                </Pressable>
                <AppButton onPress={uploadPhoto} buttonStyles={{
                    backgroundColor: colors.primary,
                    height: 50,
                }}> {loading
                    ? <ActivityIndicator color="white"/>
                    : 'Done'
                }</AppButton>
            </View>
        </AppScreen>
    )
}

export default AddPhoto;