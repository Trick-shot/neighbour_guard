import AppText from "@/components/AppText";
import chatApi from "@/api/chat";
import residenceApi from "@/api/residence";
import {ApiResponse} from "apisauce";
import {useRouter} from "expo-router";
import {useEffect, useState} from "react";
import {Alert, FlatList, Modal, TextInput, TouchableOpacity, View, StyleSheet, ActivityIndicator} from "react-native";
import {Image} from "expo-image";
import colors from "@/utils/config";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface Props {
    visible: boolean;
    onClose: () => void;
}

const NewChatModal = ({visible, onClose}: Props) => {
    const router = useRouter();
    const [neighbours, setNeighbours] = useState<any[]>([]);
    const [groupName, setGroupName] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isGroup, setIsGroup] = useState(false);
    const [loading, setLoading] = useState(false);
    const [creatingNeighbourhood, setCreatingNeighbourhood] = useState(false);

    useEffect(() => {
        if (visible) loadNeighbours();
    }, [visible]);

    const loadNeighbours = async () => {
        const res: ApiResponse<any> = await residenceApi.getNeighbours();
        const members = res.data?.flatMap((r: any) => r.residence_members) ?? [];
        setNeighbours(members);
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // ✅ Create neighbourhood group with all neighbours auto-added
    const handleCreateNeighbourhoodGroup = async () => {
        try {
            setCreatingNeighbourhood(true);
            const res: ApiResponse<any> = await chatApi.createNeighbourhoodGroup();
            if (res.ok) {
                onClose();
                router.push({
                    pathname: '/chat/[id]',
                    params: {
                        id: res.data.id,
                        name: res.data.name
                    }
                });
            } else {
                Alert.alert('Error', 'Could not create neighbourhood group');
            }
        } catch (e) {
            Alert.alert('Error', 'Something went wrong');
        } finally {
            setCreatingNeighbourhood(false);
        }
    };

    const handleCreate = async () => {
        if (selectedIds.length === 0) return Alert.alert('Error', 'Select at least one neighbour');
        if (isGroup && !groupName) return Alert.alert('Error', 'Enter a group name');
        try {
            setLoading(true);
            const res: ApiResponse<any> = await chatApi.createConversation({
                participant_ids: selectedIds,
                conversation_type: isGroup ? 'group' : 'direct',
                name: isGroup ? groupName : undefined
            });
            if (res.ok) {
                onClose();
                router.push({pathname: '/chat/[id]', params: {id: res.data.id, name: res.data.name ?? selectedIds[0]}});
            }
        } catch (e) {
            Alert.alert('Error', 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <AppText styles={{color: 'red'}}>Cancel</AppText>
                    </TouchableOpacity>
                    <AppText styles={{fontWeight: 'bold', fontSize: 16}}>New Message</AppText>
                    <TouchableOpacity onPress={handleCreate} disabled={loading}>
                        <AppText styles={{color: '#1CED7F', fontWeight: 'bold'}}>
                            {loading ? 'Creating...' : 'Create'}
                        </AppText>
                    </TouchableOpacity>
                </View>

      xq          {/* ✅ Neighbourhood Group Button */}
                <TouchableOpacity
                    onPress={handleCreateNeighbourhoodGroup}
                    disabled={creatingNeighbourhood}
                    style={styles.neighbourhoodButton}>
                    <View style={styles.neighbourhoodIconContainer}>
                        <MaterialIcons name="people" size={24} color="#1CED7F"/>
                    </View>
                    <View style={{flex: 1}}>
                        <AppText styles={{fontWeight: 'bold', fontSize: 15}}>
                            Neighbourhood Group
                        </AppText>
                        <AppText styles={{fontSize: 12, color: colors.TGrey60}}>
                            Add all your neighbours automatically
                        </AppText>
                    </View>
                    {creatingNeighbourhood
                        ? <ActivityIndicator size="small" color="#1CED7F"/>
                        : <MaterialIcons name="chevron-right" size={20} color="#1CED7F"/>
                    }
                </TouchableOpacity>

                <View style={styles.divider}>
                    <View style={styles.dividerLine}/>
                    <AppText styles={{fontSize: 12, color: colors.TGrey60, paddingHorizontal: 8}}>
                        or start a new chat
                    </AppText>
                    <View style={styles.dividerLine}/>
                </View>

                {/* Direct / Group toggle */}
                <View style={styles.toggleRow}>
                    <TouchableOpacity
                        onPress={() => setIsGroup(false)}
                        style={[styles.toggle, !isGroup && styles.toggleActive]}>
                        <AppText styles={{color: !isGroup ? 'black' : 'white'}}>Direct</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setIsGroup(true)}
                        style={[styles.toggle, isGroup && styles.toggleActive]}>
                        <AppText styles={{color: isGroup ? 'black' : 'white'}}>Group</AppText>
                    </TouchableOpacity>
                </View>

                {/* Group name input */}
                {isGroup && (
                    <TextInput
                        style={styles.input}
                        placeholder="Group name"
                        value={groupName}
                        onChangeText={setGroupName}
                        placeholderTextColor={colors.TGrey60}
                    />
                )}

                {/* Neighbours list */}
                <FlatList
                    data={neighbours}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({item}) => {
                        const selected = selectedIds.includes(item.id);
                        return (
                            <TouchableOpacity
                                onPress={() => toggleSelect(item.id)}
                                style={[styles.neighbourRow, selected && styles.selectedRow]}>
                                <Image
                                    source={item.profile_pic ?? 'https://picsum.photos/seed/avatar/200'}
                                    style={{width: 44, height: 44, borderRadius: 22}}
                                />
                                <View style={{flex: 1, marginLeft: 12}}>
                                    <AppText styles={{fontWeight: 'bold'}}>{item.full_name}</AppText>
                                    <AppText styles={{fontSize: 12, color: colors.TGrey60}}>{item.email}</AppText>
                                </View>
                                {selected && (
                                    <View style={styles.checkmark}>
                                        <MaterialIcons name="check" size={14} color="black"/>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {flex: 1, backgroundColor: '#1a1a2e', padding: 16},
    header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20},
    neighbourhoodButton: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: 'rgba(28,237,127,0.08)', borderRadius: 16,
        padding: 14, borderWidth: 1, borderColor: 'rgba(28,237,127,0.3)',
        marginBottom: 8,
    },
    neighbourhoodIconContainer: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(28,237,127,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },
    divider: {flexDirection: 'row', alignItems: 'center', marginVertical: 16},
    dividerLine: {flex: 1, height: 1, backgroundColor: 'rgba(233,233,233,0.1)'},
    toggleRow: {flexDirection: 'row', gap: 8, marginBottom: 16},
    toggle: {flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', backgroundColor: 'rgba(233,233,233,0.1)'},
    toggleActive: {backgroundColor: '#1CED7F'},
    input: {borderWidth: 1, borderColor: '#D9D9D9', borderRadius: 15, padding: 14, color: 'white', marginBottom: 16},
    neighbourRow: {flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12},
    selectedRow: {backgroundColor: 'rgba(28,237,127,0.1)'},
    checkmark: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: '#1CED7F',
        justifyContent: 'center', alignItems: 'center',
    },
});

export default NewChatModal;