import UserComponent from "@/components/home/UserComponent";
import {ResidenceTypes} from "@/types/ResidenceTypes";
import {ProfileType} from "@/types/ProfileType";
import {useCallback, useEffect, useRef, useState} from "react";
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import BottomSheet, {BottomSheetView} from '@gorhom/bottom-sheet';
import {StatusBar} from "expo-status-bar";
import {View, StyleSheet, Pressable} from "react-native";
import MapView, {PROVIDER_GOOGLE} from 'react-native-maps';
import AlertIcon from "@/assets/icons/alertIcon.svg";
import BellIcon from "@/assets/icons/bellFill.svg";
import MapLocation from "@/assets/icons/mapLocation.svg";
import LoadingScreen from "@/components/LoadingScreen";
import profileApi from "@/api/profile"
import residenceApi from "@/api/residence"

const Index = () => {
    const [isLoading, setIsLoading] = useState(true)
    const [userData, setUserData] = useState<ProfileType | null>(null)
    const [residenceData, setResidenceData] = useState<ResidenceTypes | null>(null)
    const bottomSheetRef = useRef<BottomSheet>(null)
    const mapRef = useRef<MapView | null>(null)

    const handleSheetChanges = useCallback((index: number) => {
        console.log('handleSheetChanges', index);
    }, []);

    useEffect(() => {
        getHomeData()
    }, [])

    const getHomeData = async () => {
        try {
            const userProfile = await profileApi.userProfile()
            const residenceRes = await residenceApi.userResidence()
            console.log('Profile:', userProfile.data)
            console.log('Residence:', residenceRes.data)
            setUserData(userProfile.data ?? null)
            setResidenceData(residenceRes.data ?? null)
        } catch (e) {
            console.log('Error fetching home data:', e)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) return <LoadingScreen/>

    return (
        <View style={{flex: 1}}>
            <StatusBar style="light" animated/>
            <MapView
                provider={PROVIDER_GOOGLE}
                ref={mapRef}
                mapType="satellite"
                zoomEnabled
                followsUserLocation={true}
                showsUserLocation={true}
                initialRegion={{
                    latitude: residenceData?.latitude ?? -6.7924,
                    longitude: residenceData?.longitude ?? 39.2083,
                    latitudeDelta: residenceData?.latitude_delta ?? 0.05,
                    longitudeDelta: residenceData?.longitude_delta ?? 0.05,
                }}
                style={{width: "100%", height: "100%"}}
            >
                <View style={{flex: 1, paddingTop: 48, paddingHorizontal: 16}}>
                    <View style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        width: "100%"
                    }}>
                        <Pressable>
                            <AlertIcon/>
                        </Pressable>
                        <View style={{alignItems: "center", gap: 40}}>
                            <Pressable style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: "rgba(120,120,128,1.6)"
                            }}>
                                <BellIcon/>
                            </Pressable>
                            <Pressable>
                                <MapLocation/>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </MapView>

            <GestureHandlerRootView style={{
                flex: 1,
                ...StyleSheet.absoluteFillObject
            }}>
                <BottomSheet
                    ref={bottomSheetRef}
                    onChange={handleSheetChanges}
                    snapPoints={['22%']}
                    index={1}
                >
                    <BottomSheetView style={{
                        height: "20%",
                        padding: 36,
                        paddingTop: 14,
                        paddingHorizontal: 24,
                        alignItems: 'flex-start',
                    }}>
                        <UserComponent
                            userProfile={userData?.profile_pic ?? null}
                            userFullName={userData?.user?.full_name ?? ''}
                            residenceHouseNumber={residenceData?.house_number ?? ''}
                            residenceStreet={residenceData?.street_name ?? ''}
                            residenceName={residenceData?.residence_name ?? ''}
                        />
                    </BottomSheetView>
                </BottomSheet>
            </GestureHandlerRootView>
        </View>
    );
}

export default Index;