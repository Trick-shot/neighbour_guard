import AppText from "@/components/AppText";
import {ResidenceTypes} from "@/types/ResidenceTypes";
import {Image} from "expo-image";
import {View} from "react-native";

interface UserComponentProps {
    user: {
        userProfile: string;
        userFullName: string;
    };
    residence: ResidenceTypes
}

const UserComponent = ({user, residence}: UserComponentProps) => {
    return (
        <View style={{flexDirection: "row", alignItems: "center", gap: 24}}>
            <Image
                style={{width: 100, height: 100, borderRadius: 50, backgroundColor: "green"}}
                source={user?.userProfile}
                contentFit="cover"
                transition={1000}
            />
            <View style={{alignItems: "flex-start", flex: 1, height: "100%", justifyContent: "space-evenly"}}>
                <AppText styles={{fontSize: 14, fontWeight: "bold"}}>
                    # {residence?.residence_name}
                </AppText>
                <AppText styles={{fontSize: 14}}>Full name: {user?.userFullName}</AppText>
                <AppText styles={{fontSize: 14}}>Street: {residence?.street_name}</AppText>
                <AppText styles={{fontSize: 14}}>House no: {residence?.house_number}</AppText>
            </View>
        </View>
    );
};

export default UserComponent;