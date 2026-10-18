import {Linking, Pressable, StyleSheet, View} from 'react-native';

import {useColors} from '@/theme';
import {AlertResponse} from '@/lib/types';

import Avatar from './Avatar';
import Icon from './Icon';
import Text from './Text';

/** Figma "Responder row" (1613:227): who saw the alert, who is coming, who arrived. */
export function responseLabel(r: AlertResponse) {
    switch (r.state) {
        case 'coming':
            return r.eta_min != null ? `On the way · ${r.eta_min} min` : 'On the way';
        case 'arrived':
            return 'Arrived';
        case 'cant':
            return "Can't help right now";
        default:
            return 'Saw the alert';
    }
}

export default function ResponderRow({response}: { response: AlertResponse }) {
    const c = useColors();
    const active = response.state === 'coming' || response.state === 'arrived';
    return (
        <View style={[styles.row, {backgroundColor: c.bg.surface}]}>
            <Avatar name={response.name}/>
            <View style={styles.text}>
                <Text variant="bodyEmphasis" numberOfLines={1}>{response.name}</Text>
                <Text variant="footnote" color={active ? c.text.secondary : c.text.muted}>{responseLabel(response)}</Text>
            </View>
            {response.phone ? (
                <Pressable
                    accessibilityLabel={`Call ${response.name}`}
                    onPress={() => Linking.openURL(`tel:${response.phone}`)}
                    style={[styles.call, {backgroundColor: c.bg.brandSubtle}]}>
                    <Icon name="phone" size={18} color={c.icon.brand}/>
                </Pressable>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16},
    text: {flex: 1, minWidth: 0, gap: 2},
    call: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
});
