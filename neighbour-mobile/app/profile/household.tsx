import {useCallback, useEffect, useState} from 'react';
import {KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import {Checkbox} from '@/components/ui/Choice';
import Footer from '@/components/ui/Footer';
import Icon from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Segmented from '@/components/ui/Segmented';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {placesApi, profileApi} from '@/lib/endpoints';
import {HouseholdPerson, MyResidence} from '@/lib/types';
import {useColors} from '@/theme';

/**
 * Figma "My household" (1637:5288).
 *
 * Two kinds of people: members with the app (they can send SOS from this home) and people without
 * it, listed only so responders know who is inside. The list is shown to responders of a live
 * alert from this home and to nobody else; names of people without the app never reach the map.
 */
type Age = HouseholdPerson['age_group'];
const AGE_LABEL: Record<Age, string> = {child: 'Child', adult: 'Adult', elderly: 'Elderly'};

export default function Household() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [home, setHome] = useState<MyResidence | null>(null);
    const [people, setPeople] = useState<HouseholdPerson[]>([]);
    const [myId, setMyId] = useState<number | null>(null);
    const [adding, setAdding] = useState(false);
    const [menu, setMenu] = useState<HouseholdPerson | null>(null);

    const load = useCallback(async () => {
        setHome(await placesApi.me().catch(() => null));
        setPeople(await placesApi.household().catch(() => []));
    }, []);
    useEffect(() => { load(); profileApi.me().then((m) => setMyId(m.id)).catch(() => undefined); }, [load]);

    const toggleHelp = async (p: HouseholdPerson) => {
        setMenu(null);
        setPeople((l) => l.map((x) => (x.id === p.id ? {...x, needs_help: !x.needs_help} : x)));
        await placesApi.updateHousehold(p.id, {needs_help: !p.needs_help}).catch(load);
    };
    const remove = async (p: HouseholdPerson) => {
        setMenu(null);
        setPeople((l) => l.filter((x) => x.id !== p.id));
        await placesApi.removeFromHousehold(p.id).catch(load);
    };

    const members = home?.members ?? [];
    // What a responder reads before they arrive. Members with the app count as adults.
    const adults = members.length + people.filter((p) => p.age_group === 'adult' && !p.needs_help).length;
    const children = people.filter((p) => p.age_group === 'child').length;
    const elderly = people.filter((p) => p.age_group === 'elderly' && !p.needs_help).length;
    const needHelp = people.filter((p) => p.needs_help && p.age_group !== 'child').length;
    const parts = [
        adults && `${adults} adult${adults === 1 ? '' : 's'}`,
        children && `${children} child${children === 1 ? '' : 'ren'}`,
        elderly && `${elderly} elderly`,
        needHelp && `${needHelp} ${needHelp === 1 ? 'person' : 'people'} who need${needHelp === 1 ? 's' : ''} help moving`,
    ].filter(Boolean) as string[];
    const summary = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0] ?? 'Nobody listed yet';

    const Badge = ({label, danger}: { label: string; danger?: boolean }) => (
        <View style={[styles.badge, {backgroundColor: danger ? c.feedback.errorBg : c.bg.brandSubtle}]}>
            <Text variant="caption1" color={danger ? c.feedback.error : c.text.brand}>{label}</Text>
        </View>
    );

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="My household"/>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="body" color={c.text.secondary}>
                    Members with the app can send SOS from your home. Members without it are listed so responders know who is inside.
                </Text>
                <View style={[styles.card, {borderColor: c.border.default}]}>
                    {members.map((m, i) => (
                        <View key={`m${m.user_id}`} style={[styles.row, i > 0 && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border.default}]}>
                            <Avatar name={m.full_name} size={44}/>
                            <View style={styles.flex}>
                                <Text variant="headline" numberOfLines={1}>{m.full_name}</Text>
                                <Text variant="footnote" color={c.text.secondary}>{m.user_id === myId ? 'You' : 'Member'} · has the app</Text>
                            </View>
                            {m.role === 'owner' && <Badge label="Owner"/>}
                        </View>
                    ))}
                    {people.map((p) => (
                        <View key={`p${p.id}`} style={[styles.row, {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border.default}]}>
                            <Avatar name={p.name} size={44}/>
                            <View style={styles.flex}>
                                <Text variant="headline" numberOfLines={1}>{p.name}</Text>
                                <Text variant="footnote" color={c.text.secondary}>{[p.relation || AGE_LABEL[p.age_group], 'no app'].join(' · ')}</Text>
                            </View>
                            {p.needs_help ? <Badge label="Needs help" danger/> : p.age_group === 'child' ? <Badge label="Child"/> : null}
                            <Pressable accessibilityLabel={`Options for ${p.name}`} hitSlop={10} onPress={() => setMenu(p)}>
                                <Icon name="more-horizontal" size={20} color={c.icon.muted}/>
                            </Pressable>
                        </View>
                    ))}
                    <Pressable onPress={() => setAdding(true)} style={[styles.row, {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border.default}]}>
                        <View style={[styles.plus, {backgroundColor: c.bg.brandSubtle}]}><Icon name="plus" size={22} color={c.icon.brand}/></View>
                        <Text variant="headline" color={c.text.brand}>Add a household member</Text>
                    </Pressable>
                </View>

                <View style={[styles.summary, {backgroundColor: c.bg.brandSubtle}]}>
                    <Text variant="caption1" color={c.text.muted}>RESPONDERS WILL SEE</Text>
                    <Text variant="headline">{summary}</Text>
                </View>
                <View style={[styles.note, {backgroundColor: c.bg.subtle}]}>
                    <Icon name="lock" size={18} color={c.icon.brand}/>
                    <Text variant="footnote" color={c.text.secondary} style={styles.flex}>Names of people without the app are never shown on the map.</Text>
                </View>
            </ScrollView>
            <Footer>
                <Button title="Invite a member to the app" onPress={() => Share.share({
                    message: `I've added our home on NeighbourGuard. Install it and join House ${home?.house_number ?? ''}, ${home?.street ?? ''} so you can send an SOS from home too.`,
                }).catch(() => undefined)}/>
            </Footer>

            <AddPersonSheet visible={adding} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); load(); }}/>

            <Modal visible={!!menu} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
                <Pressable style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.3)'}]} onPress={() => setMenu(null)}/>
                <View style={[styles.sheet, {backgroundColor: c.bg.surface, paddingBottom: Math.max(insets.bottom, 34)}]}>
                    <View style={[styles.grabber, {backgroundColor: c.border.default}]}/>
                    <Text variant="title3">{menu?.name}</Text>
                    <Button title={menu?.needs_help ? 'Doesn’t need help moving' : 'Needs help moving'} variant="outline" onPress={() => menu && toggleHelp(menu)}/>
                    <Button title="Remove from household" variant="outline" onPress={() => menu && remove(menu)}/>
                    <Button title="Cancel" variant="text" onPress={() => setMenu(null)}/>
                </View>
            </Modal>
        </View>
    );
}

function AddPersonSheet({visible, onClose, onAdded}: { visible: boolean; onClose: () => void; onAdded: () => void }) {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [relation, setRelation] = useState('');
    const [age, setAge] = useState<Age>('adult');
    const [help, setHelp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const add = async () => {
        if (!name.trim()) return setError('A first name is enough.');
        setBusy(true);
        setError(null);
        try {
            await placesApi.addToHousehold({name: name.trim(), relation: relation.trim(), age_group: age, needs_help: help});
            setName(''); setRelation(''); setAge('adult'); setHelp(false);
            onAdded();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.3)'}]} onPress={onClose}/>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap} pointerEvents="box-none">
                <View style={[styles.sheet, styles.inFlow, {backgroundColor: c.bg.surface, paddingBottom: Math.max(insets.bottom, 34)}]}>
                    <View style={[styles.grabber, {backgroundColor: c.border.default}]}/>
                    <Text variant="title3">Add a household member</Text>
                    <TextField label="First name" value={name} onChangeText={setName} placeholder="Baraka"/>
                    <TextField label="Relation (optional)" value={relation} onChangeText={setRelation} placeholder="Son, grandfather…"/>
                    <Segmented options={[{key: 'child', label: 'Child'}, {key: 'adult', label: 'Adult'}, {key: 'elderly', label: 'Elderly'}]} value={age} onChange={setAge}/>
                    <Pressable onPress={() => setHelp((h) => !h)} style={styles.check} accessibilityRole="checkbox" accessibilityState={{checked: help}}>
                        <Checkbox on={help}/>
                        <Text variant="body">Would need help getting out</Text>
                    </Pressable>
                    {error && <Text variant="footnote" color={c.feedback.error}>{error}</Text>}
                    <Button title="Add to household" onPress={add} loading={busy}/>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1, gap: 2},
    content: {padding: 16, gap: 16},
    card: {borderWidth: 1, borderRadius: 16, overflow: 'hidden'},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 69},
    plus: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
    badge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999},
    summary: {padding: 16, borderRadius: 16, gap: 6},
    note: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12},
    check: {flexDirection: 'row', alignItems: 'center', gap: 10},
    wrap: {flex: 1, justifyContent: 'flex-end'},
    sheet: {position: 'absolute', left: 0, right: 0, bottom: 0, gap: 14, paddingTop: 8, paddingHorizontal: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24},
    inFlow: {position: 'relative'},
    grabber: {width: 36, height: 5, borderRadius: 3, alignSelf: 'center'},
});
