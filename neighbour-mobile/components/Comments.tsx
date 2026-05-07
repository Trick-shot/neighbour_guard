import AppText from "@/components/AppText";
import {Image} from "expo-image";
import {TouchableOpacity, View} from "react-native";
import LikeIcon from "@/assets/icons/Like.svg"

const Comments = () => {
    return (
        <View style={{
            flexDirection: "row",
            padding: 1,
            alignItems: "center",
            justifyContent: "space-between",
            width: '100%'
        }}>
            <View style={{
                flexDirection: "row", gap: 10, width: "80%"
            }}>
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
                    justifyContent: "space-evenly"
                }}>
                    <View style={{
                        flexDirection: "row",
                        gap: 8,
                    }}>
                        <AppText styles={{
                            fontSize: 8
                        }}>Erick</AppText>
                        <AppText styles={{
                            fontSize: 8
                        }}>1W</AppText>
                    </View>
                    <AppText styles={{
                        fontSize: 10,
                        width: "80%"
                    }}>Highly agreed this is very risky for out health in genera an the kids</AppText>
                    <AppText styles={{
                        fontSize: 10
                    }}>Reply</AppText>
                </View>
            </View>
            <View style={{
                alignItems: "center",
                gap: 10
            }}>
                <TouchableOpacity>
                    <LikeIcon/>
                </TouchableOpacity>
                <AppText styles={{
                    fontSize: 8
                }}>Like</AppText>
            </View>
        </View>
    )
}

export default Comments;