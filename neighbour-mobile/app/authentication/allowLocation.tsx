import {useLocalSearchParams, useRouter} from "expo-router";
import {navigate} from "expo-router/build/global-state/routing";
import {useEffect, useState} from "react";
import {View} from "react-native";
import * as Location from 'expo-location';

import LocationIcon from "@/assets/icons/location.svg";
import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import colors from "@/Utilis/config";


const AllowLocation = () => {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const router = useRouter()
    const {houseId} = useLocalSearchParams<{ houseId: string }>();
    const numericHouseId = Number(houseId);


    const getlocation = async () => {
        let {status} = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
            setErrorMsg('Permission to access location was denied');
            return;
        }
        let location = await Location.getCurrentPositionAsync();
        router.navigate({
            pathname: '/authentication/setHomeLocation',
            params: {
                houseId: numericHouseId,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            }
        })
    }

    return (
        <AppScreen screenStyle={{
            justifyContent: "space-between",
            alignItems: "center",
            height: "90%"
        }}>
            <View style={{
                alignItems: "center"
            }}>
                <View style={{
                    width: 82,
                    height: 82,
                    borderRadius: 50,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#D9D9D9"
                }}>
                    <LocationIcon width={37} height={34}/>
                </View>
                <View>
                    <AppText styles={{
                        textAlign: "center",
                        marginTop: 24
                    }}>Allow Location</AppText>
                    <AppText styles={{
                        textAlign: "center",
                        fontSize: 14,
                        color: "#A5A5A5",
                        marginTop: 16
                    }}>Allow access to your location to find your residence.</AppText>
                </View>
            </View>
            <AppButton onPress={() => getlocation()} buttonStyles={{
                backgroundColor: colors.primary
            }}>All location</AppButton>
        </AppScreen>
    )
}

export default AllowLocation;