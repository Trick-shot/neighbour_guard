import AppText from "@/components/AppText";
import {Image} from "expo-image";
import {View, StyleSheet} from "react-native";
import colors from "@/Utilis/config"

const MessageChat = () => {
    return (
        <View style={style.card}>
            <Image
                style={{
                    width: 49,
                    height: 49,
                    borderRadius: 47.5,
                    backgroundColor: "green",
                    borderWidth: 2
                }}
                source="https://picsum.photos/seed/696/3000/2000"
                contentFit="cover"
                transition={1000}
            />
            <View style={{
                flexDirection: "row",
                justifyContent: "space-between",
                flex: 1,
                paddingVertical: 5
            }}>
                <View style={{
                    justifyContent: "space-between"
                }}>
                    <AppText styles={{
                        fontSize: 14,
                        fontWeight: "bold"
                    }}>Joseph Alex</AppText>
                    <AppText styles={{
                        fontSize: 12
                    }}>Habari jirani</AppText>
                </View>
                <View style={{
                    alignItems: "center",
                    justifyContent: "space-between"
                }}>
                    <AppText styles={{
                        fontSize: 12
                    }}>10:20am</AppText>
                    <AppText styles={{
                        fontSize: 8,
                        backgroundColor: colors.primaryLight,
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        textAlign: "center",
                        padding: 6,
                        color: colors.TWhite
                    }}>1</AppText>
                </View>
            </View>
        </View>
    )
}
const style = StyleSheet.create({
    card: {
        width: "100%",
        flexDirection: "row",
        padding: 10,
        gap: 10,
    }
})
export default MessageChat;