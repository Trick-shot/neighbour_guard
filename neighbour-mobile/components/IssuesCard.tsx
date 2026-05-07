import AppText from "@/components/AppText";
import {TouchableOpacity, View} from "react-native";

const IssuesCard = ({onPress}: { onPress: () => void }) => {
    return (
        <TouchableOpacity onPress={onPress} style={{
            width: "100%",
            flexDirection: "row",
            paddingHorizontal: 16,
            alignItems: "center",
            gap: 15,
            backgroundColor: "rgba(233,233,233,0.2)",
            borderRadius: 11
        }}>
            <AppText styles={{
                fontSize: 8
            }}>10:00 AM</AppText>
            <View style={{
                flexDirection: "row",
                gap: 15
            }}>
                <View style={{
                    height: 75,
                    backgroundColor: "green",
                    width: 3,
                    borderRadius: 6
                }}/>
                <View style={{
                    padding: 8,
                    justifyContent: "space-between"
                }}>
                    <AppText styles={{
                        fontSize: 10
                    }}>moderate</AppText>
                    <AppText styles={{
                        fontSize: 14,
                        fontWeight: "bold"
                    }}>Poor waste disposal</AppText>
                    <AppText styles={{
                        fontSize: 10
                    }}>Distance 2.9km</AppText>
                </View>
            </View>
        </TouchableOpacity>
    )
}

export default IssuesCard;