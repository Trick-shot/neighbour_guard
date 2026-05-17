import AppText from "@/components/AppText";
import {stopAlarm} from "@/utils/alarmNotification";
import {Modal, TouchableOpacity, View, StyleSheet, Vibration} from "react-native";
import {useEffect} from "react";

interface Props {
    visible: boolean;
    alert: any;
    onDismiss: () => void;
}

const AlarmModal = ({visible, alert, onDismiss}: Props) => {
    useEffect(() => {
        if (visible) {
            // aggressive vibration pattern while modal is visible
            Vibration.vibrate([500, 200, 500, 200, 500], true);
        } else {
            Vibration.cancel();
        }
        return () => Vibration.cancel();
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <AppText styles={styles.emoji}>
                        {getEmoji(alert?.alert_type)}
                    </AppText>
                    <AppText styles={styles.title}>
                        {getTitle(alert?.alert_type)}
                    </AppText>
                    <AppText styles={styles.message}>
                        {alert?.body ?? 'Your neighbour needs attention!'}
                    </AppText>
                    <AppText styles={styles.location}>
                        📍 Tap the map to see location
                    </AppText>
                    <TouchableOpacity
                        style={styles.dismissButton}
                        onPress={onDismiss}
                    >
                        <AppText styles={styles.dismissText}>
                            DISMISS ALARM
                        </AppText>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const getEmoji = (type: string) => {
    const map: Record<string, string> = {
        emergency: '🚨',
        fire: '🔥',
        medical: '🏥',
        suspicious: '👀',
        other: '⚠️',
    };
    return map[type] ?? '🚨';
};

const getTitle = (type: string) => {
    const map: Record<string, string> = {
        emergency: 'EMERGENCY!',
        fire: 'FIRE ALERT!',
        medical: 'MEDICAL EMERGENCY!',
        suspicious: 'SUSPICIOUS ACTIVITY!',
        other: 'NEIGHBOUR ALERT!',
    };
    return map[type] ?? 'ALERT!';
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(255,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 32,
        margin: 24,
        alignItems: 'center',
        gap: 12,
    },
    emoji: {
        fontSize: 64,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'red',
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        color: '#333',
    },
    location: {
        fontSize: 13,
        color: '#666',
    },
    dismissButton: {
        backgroundColor: 'red',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 30,
        marginTop: 8,
    },
    dismissText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default AlarmModal;