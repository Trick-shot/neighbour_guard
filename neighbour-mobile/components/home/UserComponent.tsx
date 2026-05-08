import AppText from "@/components/AppText";
import {Image} from "expo-image";
import {View, StyleSheet} from "react-native"

const UserComponent = () => {
    return (
        <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 24
        }}>
            <Image
                style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: "green"
                }}
                source="https://picsum.photos/seed/696/3000/2000"
                contentFit="cover"
                transition={1000}
            />
            <View style={{
                alignItems: "flex-start",
                flex: 1,
                height: "100%",
                justifyContent: "space-evenly"
            }}>
                <AppText styles={{
                    fontSize: 14,
                    fontWeight: "bold"
                }}>#Luoga Family</AppText>
                <AppText styles={{
                    fontSize: 14,
                }}>Full name : Erick Luoga</AppText>
                <AppText styles={{
                    fontSize: 14,
                }}>Street: masaki st</AppText>
                <AppText styles={{
                    fontSize: 14,
                }}>House no: 109</AppText>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({})

export default UserComponent;