import AppText from "@/components/AppText";
import {Image} from "expo-image";
import {View, StyleSheet} from "react-native"


interface UserComponentInterface {
    residenceName: string,
    userProfile: string | null,
    userFullName: string,
    residenceStreet: string,
    residenceHouseNumber: string,
}

const UserComponent = ({
                           residenceName,
                           residenceHouseNumber,
                           userProfile,
                           userFullName,
                           residenceStreet
                       }: UserComponentInterface) => {
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
                source={userProfile}
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
                }}># {residenceName}</AppText>
                <AppText styles={{
                    fontSize: 14,
                }}>Full name : {userFullName}</AppText>
                <AppText styles={{
                    fontSize: 14,
                }}>Street: {residenceStreet}</AppText>
                <AppText styles={{
                    fontSize: 14,
                }}>House no: {residenceHouseNumber}</AppText>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({})

export default UserComponent;