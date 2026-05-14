// components/home/AlertModal.tsx
import AppButton from "@/components/AppButton";
import AppText from "@/components/AppText";
import {useState} from "react";
import {Modal, Pressable, StyleSheet, View} from "react-native";

const ALERT_TYPES = [
    {key: "emergency", label: "🚨 Emergency", color: "#FF3B30"},
    {key: "fire", label: "🔥 Fire", color: "#FF6B00"},
    {key: "suspicious", label: "👁 Suspicious Activity", color: "#FF9500"},
    {key: "medical", label: "🏥 Medical", color: "#34C759"},
    {key: "other", label: "⚠️ Other", color: "#8E8E93"},
];

interface AlertModalProps {
    visible: boolean;
    onClose: () => void;
    onSend: (type: string, message: string) => void;
    isSending: boolean;
}

const AlertModal = ({visible, onClose, onSend, isSending}: AlertModalProps) => {
    const [selectedType, setSelectedType] = useState("emergency");

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.container}>

                    <AppText styles={{fontSize: 18, fontWeight: "bold", marginBottom: 4}}>
                        🚨 Send Alert
                    </AppText>
                    <AppText styles={{fontSize: 13, color: "#8E8E93", marginBottom: 16}}>
                        This will notify all neighbours within 30m
                    </AppText>

                    {ALERT_TYPES.map((type) => (
                        <Pressable
                            key={type.key}
                            onPress={() => setSelectedType(type.key)}
                            style={[
                                styles.typeButton,
                                selectedType === type.key && {
                                    borderColor: type.color,
                                    backgroundColor: type.color + "15",
                                }
                            ]}
                        >
                            <AppText styles={{
                                fontSize: 15,
                                fontWeight: selectedType === type.key ? "bold" : "normal",
                                color: selectedType === type.key ? type.color : "#000",
                            }}>
                                {type.label}
                            </AppText>
                        </Pressable>
                    ))}

                    <View style={{flexDirection: "row", gap: 12, marginTop: 20}}>
                        <AppButton
                            onPress={onClose}
                            buttonStyles={{flex: 1}}
                        >
                            Cancel
                        </AppButton>
                        <AppButton
                            onPress={() => onSend(selectedType, "")}
                            disabled={isSending}
                            buttonStyles={{flex: 1}}
                        >
                            {isSending ? "Sending..." : "Send Alert"}
                        </AppButton>
                    </View>

                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    container: {
        backgroundColor: "white",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 44,
    },
    typeButton: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#E0E0E0",
        marginBottom: 8,
    },
});

export default AlertModal;