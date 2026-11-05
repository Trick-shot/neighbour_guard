import {Modal, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {useColors} from '@/theme';

/**
 * Figma "Vouch request" (1633:2103). Two things must both be true before "Yes": you have met
 * them, and you know which house is theirs. Two vouches verify a home.
 */
type Props = { name: string | null; where: string; busy?: boolean; onYes: () => void; onNo: () => void };

export default function VouchSheet({name, where, busy, onYes, onNo}: Props) {
    const c = useColors();
    const insets = useSafeAreaInsets();
    return (
        <Modal visible={!!name} transparent animationType="slide" onRequestClose={onNo}>
            <Pressable style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.3)'}]} onPress={onNo}/>
            <View style={[styles.sheet, {backgroundColor: c.bg.surface, paddingBottom: Math.max(insets.bottom, 34)}]}>
                <View style={[styles.grabber, {backgroundColor: c.border.default}]}/>
                <View style={styles.centre}><Avatar name={name} size={64}/></View>
                <View style={{gap: 8}}>
                    <Text variant="title2" style={styles.text}>Do you know {name}?</Text>
                    <Text variant="subhead" color={c.text.secondary} style={styles.text}>
                        They say they live at {where}. Only confirm if both are true:
                    </Text>
                </View>
                <View style={{gap: 10}}>
                    {['You’ve met them in person', 'You know which house is theirs'].map((t) => (
                        <View key={t} style={styles.check}>
                            <View style={[styles.tick, {backgroundColor: c.feedback.successBg}]}><Icon name="check" size={12} color={c.feedback.success}/></View>
                            <Text variant="subhead">{t}</Text>
                        </View>
                    ))}
                </View>
                <Button title="Yes, I know them" onPress={onYes} loading={busy}/>
                <Pressable onPress={onNo} style={[styles.no, {backgroundColor: c.bg.brandSubtle}]}>
                    <Text variant="buttonL" color={c.text.brand}>I don’t know them</Text>
                </Pressable>
                <Text variant="caption1" color={c.text.muted} style={styles.text}>
                    Your answer is private. Vouching for someone you don’t know can lower your own trust.
                </Text>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    sheet: {position: 'absolute', left: 0, right: 0, bottom: 0, gap: 16, paddingTop: 10, paddingHorizontal: 16,
        borderTopLeftRadius: 28, borderTopRightRadius: 28},
    grabber: {width: 36, height: 5, borderRadius: 3, alignSelf: 'center'},
    centre: {alignItems: 'center'},
    text: {textAlign: 'center'},
    check: {flexDirection: 'row', alignItems: 'center', gap: 10},
    tick: {width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
    no: {height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center'},
});
