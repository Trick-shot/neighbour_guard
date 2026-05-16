import AppText from "@/components/AppText";
import colors from "@/utils/config";
import dayjs from "dayjs";
import {TouchableOpacity, View} from "react-native";
import {Image} from "expo-image";

interface Props {
    conversation: any;
    currentUserId: number;
    onPress: () => void;
}

const ConversationItem = ({conversation, currentUserId, onPress}: Props) => {
    const isGroup = conversation.conversation_type === 'group';
    const otherParticipant = conversation.participants?.find((p: any) => p.id !== currentUserId);
    const name = isGroup ? conversation.name : otherParticipant?.full_name ?? 'Unknown';
    const pic = isGroup ? null : otherParticipant?.profile_pic;

    return (
        <TouchableOpacity onPress={onPress} style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            gap: 12,
        }}>
            <View>
                <Image
                    source={pic ?? 'https://picsum.photos/seed/avatar/200'}
                    style={{width: 50, height: 50, borderRadius: 25}}
                    contentFit="cover"
                />
                {!isGroup && otherParticipant?.is_online && (
                    <View style={{
                        width: 12, height: 12,
                        borderRadius: 6,
                        backgroundColor: '#1CED7F',
                        position: 'absolute',
                        bottom: 0, right: 0,
                        borderWidth: 2,
                        borderColor: 'white'
                    }}/>
                )}
            </View>
            <View style={{flex: 1}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <AppText styles={{fontSize: 16, fontWeight: 'bold'}}>{name}</AppText>
                    <AppText styles={{fontSize: 11, color: colors.TGrey60}}>
                        {conversation.last_message
                            ? dayjs(conversation.last_message.created_at).format('HH:mm')
                            : ''}
                    </AppText>
                </View>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 4}}>
                    <AppText styles={{fontSize: 13, color: colors.TGrey60}} numberOfLines={1}>
                        {conversation.last_message?.content ?? 'No messages yet'}
                    </AppText>
                    {conversation.unread_count > 0 && (
                        <View style={{
                            backgroundColor: '#1CED7F',
                            borderRadius: 10,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            minWidth: 20,
                            alignItems: 'center'
                        }}>
                            <AppText styles={{fontSize: 11, color: 'white', fontWeight: 'bold'}}>
                                {conversation.unread_count}
                            </AppText>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default ConversationItem;