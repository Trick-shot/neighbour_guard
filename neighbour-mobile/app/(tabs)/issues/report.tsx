import * as Location from 'expo-location';
import {router} from 'expo-router';
import {useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, StyleSheet, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import {CATEGORY_META, SEVERITY_LABEL} from '@/components/ui/IssueCard';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {issuesApi} from '@/lib/endpoints';
import {IssueCategory, IssueSeverity, IssueVisibility} from '@/lib/types';
import {radius, useColors} from '@/theme';

/**
 * Figma page "Android · 06" / "Report an issue".
 *
 * The neighbourhood is never asked for: the server takes it from the reporter's own home. The one
 * choice that needs explaining is visibility, so it gets a sentence each rather than two words.
 */
const CATEGORIES = Object.keys(CATEGORY_META) as IssueCategory[];
const SEVERITIES = Object.keys(SEVERITY_LABEL) as IssueSeverity[];

export default function ReportIssue() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<IssueCategory>('security');
    const [severity, setSeverity] = useState<IssueSeverity>('moderate');
    const [visibility, setVisibility] = useState<IssueVisibility>('neighbourhood');
    const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const attachLocation = async () => {
        const {status} = await Location.getForegroundPermissionsAsync();
        const granted = status === 'granted'
            || (await Location.requestForegroundPermissionsAsync()).status === 'granted';
        if (!granted) return setError('Location is off, so this issue will have no pin.');
        const fix = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
        setHere({lat: fix.coords.latitude, lng: fix.coords.longitude});
    };

    const submit = async () => {
        if (title.trim().length < 5) return setError('A few more words, so neighbours know what this is.');
        setBusy(true);
        setError(null);
        try {
            const issue = await issuesApi.report({
                title: title.trim(), description: description.trim(), category, severity, visibility,
                ...(here ? {lat: here.lat, lng: here.lng} : {}),
            });
            router.replace(`/(tabs)/issues/${issue.id}`);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const Chip = ({on, label, onPress}: { on: boolean; label: string; onPress: () => void }) => (
        <Pressable accessibilityRole="button" accessibilityState={{selected: on}} onPress={onPress}
                   style={[styles.chip, {
                       backgroundColor: on ? c.bg.brand : c.bg.subtle,
                       borderColor: on ? c.bg.brand : c.border.default,
                   }]}>
            <Text variant="subhead" color={on ? c.text.onBrand : c.text.secondary}>{label}</Text>
        </Pressable>
    );

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Report an issue"/>
            <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled"
                                     showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <TextField label="What is wrong?" value={title} autoCapitalize="sentences" error={error}
                           placeholder="Street light out on the corner"
                           onChangeText={(v) => { setTitle(v); setError(null); }}/>
                <TextField label="Any detail" value={description} multiline
                           placeholder="Dark since Friday. The whole corner by the shop."
                           helper="Optional." onChangeText={setDescription}/>

                <View style={styles.group}>
                    <Text variant="label">Category</Text>
                    <View style={styles.chips}>
                        {CATEGORIES.map((key) => (
                            <Chip key={key} on={category === key} label={CATEGORY_META[key].label}
                                  onPress={() => setCategory(key)}/>
                        ))}
                    </View>
                </View>

                <View style={styles.group}>
                    <Text variant="label">How bad is it?</Text>
                    <View style={styles.chips}>
                        {SEVERITIES.map((key) => (
                            <Chip key={key} on={severity === key} label={SEVERITY_LABEL[key]}
                                  onPress={() => setSeverity(key)}/>
                        ))}
                    </View>
                </View>

                <View style={styles.group}>
                    <Text variant="label">Who can see it?</Text>
                    {([
                        ['neighbourhood', 'My neighbourhood', 'Only people with a home in your area.'],
                        ['public', 'Anyone nearby', 'Also visible to areas within 5 km. They can support it but not comment.'],
                    ] as [IssueVisibility, string, string][]).map(([key, label, why]) => {
                        const on = visibility === key;
                        return (
                            <Pressable key={key} accessibilityRole="radio" accessibilityState={{selected: on}}
                                       onPress={() => setVisibility(key)}
                                       style={[styles.option, {
                                           borderColor: on ? c.border.brand : c.border.default,
                                           backgroundColor: on ? c.bg.brandSubtle : c.bg.surface,
                                       }]}>
                                <Icon name={on ? 'check' : 'eye'} size={20}
                                      color={on ? c.icon.brand : c.icon.muted}/>
                                <View style={styles.flex}>
                                    <Text variant="label">{label}</Text>
                                    <Text variant="footnote" color={c.text.secondary}>{why}</Text>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>

                <Pressable accessibilityRole="button" onPress={attachLocation}
                           style={[styles.option, {borderColor: c.border.default}]}>
                    <Icon name="map-pin" size={20} color={here ? c.icon.brand : c.icon.muted}/>
                    <View style={styles.flex}>
                        <Text variant="label">{here ? 'Location attached' : 'Attach where it is'}</Text>
                        <Text variant="footnote" color={c.text.secondary}>
                            {here ? 'Tap again to update it.' : 'Optional. Where the problem is, not where you live.'}
                        </Text>
                    </View>
                </Pressable>
            </KeyboardAwareScrollView>
            <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 16)}]}>
                <Button title="Report it" onPress={submit} loading={busy}/>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 18},
    group: {gap: 8},
    chips: {flexDirection: 'row', gap: 8, flexWrap: 'wrap'},
    chip: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1},
    option: {flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: radius.md,
        borderWidth: 1},
    flex: {flex: 1, gap: 2},
    footer: {paddingHorizontal: 16},
});
