import AppText from "@/components/AppText";
import dayjs from "dayjs";
import {View} from "react-native";

interface Props {
    message: any;
    isOwn: boolean;
}

const MessageBubble = ({message, isOwn}: Props) => {
    return (
        <View style={{
            alignSelf: isOwn ? 'flex-end' : 'flex-start',
            maxWidth: '75%',
            marginVertical: 4,
            marginHorizontal: 16,
        }}>
            {!isOwn && (
                <AppText styles={{fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2}}>
                    {message.sender_name}
                </AppText>
            )}
            <View style={{
                backgroundColor: isOwn ? '#1CED7F' : 'rgba(233,233,233,0.15)',
                borderRadius: 18,
                borderBottomRightRadius: isOwn ? 4 : 18,
                borderBottomLeftRadius: isOwn ? 18 : 4,
                paddingHorizontal: 14,
                paddingVertical: 10,
            }}>
                <AppText styles={{color: isOwn ? 'black' : 'white', fontSize: 15}}>
                    {message.content}
                </AppText>
            </View>
            <AppText styles={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.4)',
                alignSelf: isOwn ? 'flex-end' : 'flex-start',
                marginTop: 2
            }}>
                {dayjs(message.created_at).format('HH:mm')}
                {isOwn && (message.is_read ? '  ✓✓' : '  ✓')}
            </AppText>
        </View>
    );
};

export default MessageBubble;