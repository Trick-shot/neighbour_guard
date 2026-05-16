import ConversationItem from "@/components/message/ConversationItem";
import LoadingScreen from "@/components/LoadingScreen";
import chatApi from "@/api/chat";
import profileApi from "@/api/profile";
import {useFocusEffect, useRouter} from "expo-router";
import {useCallback, useState} from "react";
import {FlatList, View} from "react-native";
import AppText from "@/components/AppText";

const MessageChat = ({filterIndex}: { filterIndex: number }) => {
    const router = useRouter();
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const [convRes, profileRes] = await Promise.all([
                chatApi.getConversations(),
                profileApi.userProfile()
            ]);
            console.log('Conversations status:', convRes.status)
            console.log('Conversations data:', convRes.data)
            console.log('Conversations problem:', convRes.problem)
            setConversations(Array.isArray(convRes.data) ? convRes.data : []);
            setCurrentUserId(profileRes.data?.user?.id ?? null);
        } catch (e) {
            console.log('Error loading conversations:', e);
            setConversations([]);
        } finally {
            setLoading(false);
        }
    };

    const filtered = filterIndex === 1
        ? (conversations ?? []).filter(c => c.conversation_type === 'group')
        : (conversations ?? []);

    if (loading) return <LoadingScreen/>;

    return (
        <FlatList
            data={filtered}
            keyExtractor={(item, index) => (item?.id ?? index).toString()}
            renderItem={({item}) => (
                <ConversationItem
                    conversation={item}
                    currentUserId={currentUserId ?? 0}
                    onPress={() => router.push({
                        pathname: '/chat/[id]',
                        params: {
                            id: item.id,
                            name: item.conversation_type === 'group'
                                ? item.name
                                : item.participants?.find((p: any) => p.id !== currentUserId)?.full_name
                        }
                    })}
                />
            )}
            ItemSeparatorComponent={() => <View style={{height: 1, backgroundColor: 'rgba(233,233,233,0.1)'}}/>}
            contentContainerStyle={{paddingTop: 8}}
            ListEmptyComponent={
                <View style={{alignItems: 'center', marginTop: 48}}>
                    <AppText styles={{color: 'rgba(255,255,255,0.4)', fontSize: 14}}>
                        No conversations yet
                    </AppText>
                </View>
            }
        />
    );
};

export default MessageChat;