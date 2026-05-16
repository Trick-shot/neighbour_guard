import AppText from "@/components/AppText";
import chatApi from "@/api/chat";
import residenceApi from "@/api/residence";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, Modal, TextInput, TouchableOpacity, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import colors from "@/utils/config";

interface Props {
    visible: boolean;
    onClose: () => void;
}

const NewChatModal = ({ visible, onClose }: Props) => {
    const router = useRouter();
    const [neighbours, setNeighbours] = useState<any[]>([]);
    const [groupName, setGroupName] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isGroup, setIsGroup] = useState(false);

    useEffect(() => {
        if (visible) loadNeighbours();
    }, [visible]);

    const loadNeighbours = async () => {
        const res = await residenceApi.getNeighbours();
        const members = res.data?.flatMap((r: any) => r.residence_members) ?? [];
        setNeighbours(members);
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleCreate = async () => {
        if (selectedIds.length === 0) return Alert.alert('Error', 'Select at least one neighbour');
        if (isGroup && !groupName) return Alert.alert('Error', 'Enter a group name');

        const res = await chatApi.createConversation({
            participant_ids: selectedIds,
            conversation_type: isGroup ? 'group' : 'direct',
            name: isGroup ? groupName : undefined
        });

        if (res.ok) {
            onClose();
            router.push({ pathname: '/chat/[id]', params: { id: res.data.id } });
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <AppText styles={{ color: 'red' }}>Cancel</AppText>
                    </TouchableOpacity>
                    <AppText styles={{ fontWeight: 'bold', fontSize: 16 }}>New Message</AppText>
                    <TouchableOpacity onPress={handleCreate}>
                        <AppText styles={{ color: '#1CED7F', fontWeight: 'bold' }}>Create</AppText>
                    </TouchableOpacity>
                </View>
                <View style={styles.toggleRow}>
                    <TouchableOpacity
                        onPress={() => setIsGroup(false)}
                        style={[styles.toggle, !isGroup && styles.toggleActive]}>
                        <AppText styles={{ color: !isGroup ? 'black' : 'white' }}>Direct</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setIsGroup(true)}
                        style={[styles.toggle, isGroup && styles.toggleActive]}>
                        <AppText styles={{ color: isGroup ? 'black' : 'white' }}>Group</AppText>
                    </TouchableOpacity>
                </View>
                {isGroup && (
                    <TextInput
                        style={styles.input}
                        placeholder="Group name"
                        value={groupName}
                        onChangeText={setGroupName}
                        placeholderTextColor={colors.TGrey60}
                    />
                )}
                <FlatList
                    data={neighbours}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => {
                        const selected = selectedIds.includes(item.id);
                        return (
                            <TouchableOpacity
                                onPress={() => !isGroup ? toggleSelect(item.id) : toggleSelect(item.id)}
                                style={[styles.neighbourRow, selected && styles.selectedRow]}>
                                <Image
                                    source={item.profile_pic ?? 'https://picsum.photos/seed/avatar/200'}
                                    style={{ width: 40, height: 40, borderRadius: 20 }}
                                />
                                <AppText styles={{ marginLeft: 12 }}>{item.full_name}</AppText>
                                {selected && <AppText styles={{ marginLeft: 'auto', color: '#1CED7F' }}>✓</AppText>}
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e', padding: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    toggle: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', backgroundColor: 'rgba(233,233,233,0.1)' },
    toggleActive: { backgroundColor: '#1CED7F' },
    input: { borderWidth: 1, borderColor: '#D9D9D9', borderRadius: 15, padding: 14, color: 'white', marginBottom: 16 },
    neighbourRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12 },
    selectedRow: { backgroundColor: 'rgba(28,237,127,0.1)' },
});

export default NewChatModal;