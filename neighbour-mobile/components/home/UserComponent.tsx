import AppText from "@/components/AppText";
import {ProfileType} from "@/types/ProfileType";
import {ResidenceTypes} from "@/types/ResidenceTypes";
import {Image} from "expo-image";
import {View} from "react-native";

interface UserComponentProps {
    user: ProfileType;
    residence: ResidenceTypes
}

const UserComponent = ({user, residence}: UserComponentProps) => {
    return (
        <View style={{flexDirection: "row", alignItems: "center", gap: 24}}>
            <Image
                style={{width: 100, height: 100, borderRadius: 50, backgroundColor: "green"}}
                source={user.profile_pic}
                contentFit="cover"
                transition={1000}
            />
            <View style={{alignItems: "flex-start", flex: 1, height: "100%", justifyContent: "space-evenly"}}>
                <AppText styles={{fontSize: 14, fontWeight: "bold"}}>
                    # {residence?.residence_name}
                </AppText>
                <AppText styles={{fontSize: 14}}>Full name: {user?.user.full_name}</AppText>
                <AppText styles={{fontSize: 14}}>Street: {residence?.street_name}</AppText>
                <AppText styles={{fontSize: 14}}>House no: {residence?.house_number}</AppText>
            </View>
        </View>
    );
};

export default UserComponent;