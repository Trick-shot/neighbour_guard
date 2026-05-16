import AppText from "@/components/AppText";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import LoadingScreen from "@/components/LoadingScreen";
import chatApi from "@/api/chat";
import profileApi from "@/api/profile";
import {useWebSocket} from "@/hooks/useWebSocket";
import {useLocalSearchParams, useRouter} from "expo-router";
import {useEffect, useRef, useState} from "react";
import {FlatList, TouchableOpacity, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const ChatRoom = () => {
    const {id, name} = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);

    const [pastMessages, setPastMessages] = useState<any[]>([]);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const conversationId = Number(id);
    const {
        messages: liveMessages,
        isConnected,
        onlineUsers,
        sendMessage,
        sendReadReceipt
    } = useWebSocket(conversationId);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (liveMessages.length > 0) {
            flatListRef.current?.scrollToEnd({animated: true});
            sendReadReceipt();
        }
    }, [liveMessages]);

    const loadInitialData = async () => {
        try {
            const [messagesRes, profileRes] = await Promise.all([
                chatApi.getMessages(conversationId),
                profileApi.userProfile()
            ]);
            setPastMessages(messagesRes.data ?? []);
            setCurrentUserId(profileRes.data?.user?.id ?? null);
        } catch (e) {
            console.log('Error loading chat:', e);
        } finally {
            setLoading(false);
        }
    };

    const allMessages = [
        ...pastMessages,
        ...liveMessages.filter(lm => !pastMessages.find((pm: any) => pm.id === lm.message_id))
    ];

    if (loading) return <LoadingScreen/>;

    return (
        <View style={{flex: 1, backgroundColor: '#1a1a2e', paddingTop: insets.top}}>
            {/* Header */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(233,233,233,0.1)',
                gap: 12,
            }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color="white"/>
                </TouchableOpacity>
                <View style={{flex: 1}}>
                    <AppText styles={{fontSize: 16, fontWeight: 'bold'}}>{name ?? 'Chat'}</AppText>
                    <AppText styles={{fontSize: 12, color: isConnected ? '#1CED7F' : 'grey'}}>
                        {isConnected ? 'Connected' : 'Connecting...'}
                    </AppText>
                </View>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={allMessages}
                keyExtractor={(item, index) => (item.id ?? item.message_id ?? index).toString()}
                renderItem={({item}) => (
                    <MessageBubble
                        message={item}
                        isOwn={(item.sender_id ?? item.sender) === currentUserId}
                    />
                )}
                contentContainerStyle={{paddingVertical: 16}}
                onLayout={() => flatListRef.current?.scrollToEnd({animated: false})}
            />

            {/* Input */}
            <ChatInput onSend={sendMessage}/>
        </View>
    );
};

export default ChatRoom;