import {useState} from "react";
import {TextInput, TouchableOpacity, View, StyleSheet} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import colors from "@/utils/config";

interface Props {
    onSend: (message: string) => void;
}

const ChatInput = ({onSend}: Props) => {
    const [text, setText] = useState('');

    const handleSend = () => {
        if (!text.trim()) return;
        onSend(text.trim());
        setText('');
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="Type a message..."
                placeholderTextColor={colors.TGrey60}
                multiline
            />
            <TouchableOpacity
                onPress={handleSend}
                style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
                disabled={!text.trim()}>
                <MaterialIcons name="send" size={20} color={text.trim() ? 'black' : 'grey'}/>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(233,233,233,0.1)',
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(233,233,233,0.1)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: 'white',
        maxHeight: 100,
        fontSize: 15,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1CED7F',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: 'rgba(233,233,233,0.1)',
    }
});

export default ChatInput;