import {useCallback, useEffect, useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {placesApi} from '@/lib/endpoints';
import {HouseholdPerson} from '@/lib/types';
import {radius, shadow, useColors} from '@/theme';

/**
 * Figma page "Android · 07" / "Who lives here".
 *
 * This list exists for one moment: a responder arriving at a burning or broken-into house needs to
 * know there is a child in there, or someone who cannot get out alone. It is shown to responders
 * during an alert from this home and to nobody else, ever.
 */
const AGE_GROUPS: { key: HouseholdPerson['age_group']; label: string }[] = [
    {key: 'child', label: 'Child'},
    {key: 'adult', label: 'Adult'},
    {key: 'elderly', label: 'Elderly'},
];

export default function Household() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [people, setPeople] = useState<HouseholdPerson[] | null>(null);
    const [name, setName] = useState('');
    const [ageGroup, setAgeGroup] = useState<HouseholdPerson['age_group']>('adult');
    const [needsHelp, setNeedsHelp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setPeople(await placesApi.household().catch(() => []));
    }, []);

    useEffect(() => { load(); }, [load]);

    const add = async () => {
        if (!name.trim()) return setError('A first name is enough.');
        setBusy(true);
        setError(null);
        try {
            await placesApi.addToHousehold({name: name.trim(), age_group: ageGroup, needs_help: needsHelp});
            setName('');
            setAgeGroup('adult');
            setNeedsHelp(false);
            await load();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const remove = async (person: HouseholdPerson) => {
        setPeople((list) => (list ?? []).filter((p) => p.id !== person.id));
        await placesApi.removeFromHousehold(person.id).catch(() => load());
    };

    const toggleHelp = async (person: HouseholdPerson) => {
        const next = !person.needs_help;
        setPeople((list) => (list ?? []).map((p) => (p.id === person.id ? {...p, needs_help: next} : p)));
        await placesApi.updateHousehold(person.id, {needs_help: next}).catch(() => load());
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.page}]}>
            <ScreenHeader title="Who lives here"/>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}>
                <View style={[styles.note, {backgroundColor: c.bg.brandSubtle}]}>
                    <Icon name="shield-check" size={20} color={c.icon.brand}/>
                    <Text variant="footnote" color={c.text.secondary} style={styles.flex}>
                        Shown only to neighbours responding to an alert from this home. First names are enough.
                    </Text>
                </View>

                {people === null ? (
                    <Text variant="subhead" color={c.text.muted}>Loading…</Text>
                ) : people.length === 0 ? (
                    <Text variant="subhead" color={c.text.muted}>
                        Nobody listed yet. Add anyone who would need help getting out.
                    </Text>
                ) : (
                    <View style={[styles.card, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                        {people.map((person, i) => (
                            <View key={person.id}
                                  style={[styles.person, i > 0 && {borderTopWidth: StyleSheet.hairlineWidth,
                                      borderTopColor: c.border.default}]}>
                                <View style={styles.flex}>
                                    <Text variant="body">{person.name}</Text>
                                    <Text variant="footnote" color={c.text.muted}>
                                        {AGE_GROUPS.find((g) => g.key === person.age_group)?.label}
                                        {person.needs_help ? ' · needs help to get out' : ''}
                                    </Text>
                                </View>
                                <Pressable accessibilityLabel={`Needs help: ${person.name}`}
                                           onPress={() => toggleHelp(person)} style={styles.iconButton}>
                                    <Icon name="heart-pulse" size={20}
                                          color={person.needs_help ? c.icon.danger : c.icon.muted}/>
                                </Pressable>
                                <Pressable accessibilityLabel={`Remove ${person.name}`}
                                           onPress={() => remove(person)} style={styles.iconButton}>
                                    <Icon name="x" size={20} color={c.icon.muted}/>
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}

                <Text variant="label" color={c.text.muted} style={styles.heading}>Add someone</Text>
                <View style={[styles.card, shadow.bubble, styles.form, {backgroundColor: c.bg.surface}]}>
                    <TextField label="First name" value={name} autoCapitalize="words" placeholder="Neema"
                               error={error} onChangeText={(v) => { setName(v); setError(null); }}/>
                    <View style={styles.chips}>
                        {AGE_GROUPS.map((group) => {
                            const on = ageGroup === group.key;
                            return (
                                <Pressable key={group.key} accessibilityRole="button"
                                           onPress={() => setAgeGroup(group.key)}
                                           style={[styles.chip, {
                                               backgroundColor: on ? c.bg.brand : c.bg.subtle,
                                               borderColor: on ? c.bg.brand : c.border.default,
                                           }]}>
                                    <Text variant="subhead" color={on ? c.text.onBrand : c.text.secondary}>
                                        {group.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                    <Pressable accessibilityRole="checkbox" accessibilityState={{checked: needsHelp}}
                               onPress={() => setNeedsHelp((v) => !v)} style={styles.check}>
                        <View style={[styles.box, {
                            backgroundColor: needsHelp ? c.bg.brand : 'transparent',
                            borderColor: needsHelp ? c.bg.brand : c.border.strong,
                        }]}>
                            {needsHelp && <Icon name="check" size={14} color={c.icon.onBrand}/>}
                        </View>
                        <Text variant="subhead" style={styles.flex}>Would need help getting out</Text>
                    </Pressable>
                    <Button title="Add" variant="outline" size="M" onPress={add} loading={busy}
                            style={styles.add}/>
                </View>
            </ScrollView>
            <View style={{height: Math.max(insets.bottom, 8)}}/>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 12},
    note: {flexDirection: 'row', gap: 12, padding: 16, borderRadius: radius.md, alignItems: 'flex-start'},
    flex: {flex: 1},
    card: {borderRadius: radius.lg},
    person: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 8, minHeight: 60},
    iconButton: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
    heading: {marginTop: 12, marginLeft: 4},
    form: {padding: 16, gap: 14},
    chips: {flexDirection: 'row', gap: 8},
    chip: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1},
    check: {flexDirection: 'row', alignItems: 'center', gap: 12},
    box: {width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center'},
    add: {alignSelf: 'flex-start'},
});
