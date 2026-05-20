import AppText from "@/components/AppText";
import chatApi from "@/api/chat";
import {ResidenceTypes} from "@/types/ResidenceTypes";
import {ApiResponse} from "apisauce";
import {Image} from "expo-image";
import {useRouter} from "expo-router";
import {Alert, StyleSheet, TouchableOpacity, View} from "react-native";
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
            const res: ApiResponse<any> = await chatApi.createConversation({
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
        <View style={styles.container}>
            <Image
                style={styles.avatar}
                source={user?.profile_pic}
                contentFit="cover"
                transition={1000}
            />
            <View style={styles.info}>
                <AppText styles={styles.name}>
                    # {residence?.residence_name}
                </AppText>
                <AppText styles={styles.field}>
                    Full name: {user?.full_name ?? user?.user?.full_name}
                </AppText>
                <AppText styles={styles.field}>
                    Street: {residence?.street_name}
                </AppText>
                <AppText styles={styles.field}>
                    House no: {residence?.house_number}
                </AppText>

                {user?.id && (
                    <TouchableOpacity
                        onPress={startChat}
                        disabled={loading}
                        style={[styles.messageButton, loading && styles.messageButtonDisabled]}
                    >
                        <MaterialIcons name="message" size={14} color="black"/>
                        <AppText styles={styles.messageButtonText}>
                            {loading ? 'Opening...' : 'Message'}
                        </AppText>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 24,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "green",
    },
    info: {
        alignItems: "flex-start",
        flex: 1,
        height: "100%",
        justifyContent: "space-evenly",
    },
    name: {
        fontSize: 14,
        fontWeight: "bold",
    },
    field: {
        fontSize: 14,
    },
    messageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#1CED7F',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 8,
    },
    messageButtonDisabled: {
        opacity: 0.6,
    },
    messageButtonText: {
        fontSize: 12,
        color: 'black',
        fontWeight: 'bold',
    },
});

export default UserComponent;