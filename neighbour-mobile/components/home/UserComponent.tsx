import AppText from "@/components/AppText";
import {ProfileType} from "@/types/ProfileType";
import {ResidenceTypes} from "@/types/ResidenceTypes";
import chatApi from "@/api/chat";
import {Image} from "expo-image";
import {useRouter} from "expo-router";
import {Alert, TouchableOpacity, View} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {useState} from "react";

interface UserComponentProps {
    user: any;
    residence: ResidenceTypes
}

const UserComponent = ({user, residence}: UserComponentProps) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const startChat = async () => {
        if (!user?.id) return Alert.alert('Error', 'User not found');
        try {
            setLoading(true);
            const res = await chatApi.createConversation({
                participant_ids: [user.id],
                conversation_type: 'direct'
            });
            if (res.ok) {
                router.push({
                    pathname: '/chat/[id]',
                    params: {
                        id: res.data.id,
                        name: user?.full_name ?? residence?.residence_name
                    }
                });
            } else {
                Alert.alert('Error', 'Could not start chat');
            }
        } catch (e) {
            console.log('Chat error:', e);
            Alert.alert('Error', 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{flexDirection: "row", alignItems: "center", gap: 24}}>
            <Image
                style={{width: 100, height: 100, borderRadius: 50, backgroundColor: "green"}}
                source={user?.profile_pic}
                contentFit="cover"
                transition={1000}
            />
            <View style={{alignItems: "flex-start", flex: 1, height: "100%", justifyContent: "space-evenly"}}>
                <AppText styles={{fontSize: 14, fontWeight: "bold"}}>
                    # {residence?.residence_name}
                </AppText>
                <AppText styles={{fontSize: 14}}>Full name: {user?.full_name ?? user?.user?.full_name}</AppText>
                <AppText styles={{fontSize: 14}}>Street: {residence?.street_name}</AppText>
                <AppText styles={{fontSize: 14}}>House no: {residence?.house_number}</AppText>

                {/* Message Button */}
                <TouchableOpacity
                    onPress={startChat}
                    disabled={loading}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: '#1CED7F',
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderRadius: 20,
                        marginTop: 8,
                        opacity: loading ? 0.6 : 1
                    }}>
                    <MaterialIcons name="message" size={14} color="black"/>
                    <AppText styles={{fontSize: 12, color: 'black', fontWeight: 'bold'}}>
                        {loading ? 'Opening...' : 'Message'}
                    </AppText>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default UserComponent;