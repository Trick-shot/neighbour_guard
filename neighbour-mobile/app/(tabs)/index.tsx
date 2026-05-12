import HomeIndicator from "@/components/home/HomeIndicator";
import UserComponent from "@/components/home/UserComponent";
import {ResidenceTypes} from "@/types/ResidenceTypes";
import {ProfileType} from "@/types/ProfileType";
import {useCallback, useEffect, useRef, useState} from "react";
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import BottomSheet, {BottomSheetView} from '@gorhom/bottom-sheet';
import {StatusBar} from "expo-status-bar";
import {View, StyleSheet, Pressable} from "react-native";
import MapView, {PROVIDER_GOOGLE, Marker} from 'react-native-maps';
import AlertIcon from "@/assets/icons/alertIcon.svg";
import BellIcon from "@/assets/icons/bellFill.svg";
import MapLocation from "@/assets/icons/mapLocation.svg";
import LoadingScreen from "@/components/LoadingScreen";
import profileApi from "@/api/profile"
import residenceApi from "@/api/residence"
import * as Location from 'expo-location'
import HomeIcon from "@/assets/icons/homeIcon.svg";


const users = [
    {id: 1, name: 'Alice', coords: {latitude: 37.78825, longitude: -122.4324}},
    {id: 2, name: 'Bob', coords: {latitude: 37.78925, longitude: -122.4334}},
];

const Index = () => {
    const [isLoading, setIsLoading] = useState(true)
    const [userData, setUserData] = useState<ProfileType | null>(null)
    const [residenceData, setResidenceData] = useState<ResidenceTypes | null>(null)
    const bottomSheetRef = useRef<BottomSheet>(null)
    const mapRef = useRef<MapView | null>(null)
    const delta = 0.00027

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

    const goToCurrentLocation = async () => {
        // 1. Get current position
        let {coords} = await Location.getCurrentPositionAsync();

        // 2. Animate map to those coordinates
        mapRef.current?.animateToRegion({
            latitude: residenceData?.location.latitude,
            longitude: residenceData?.location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        }, 1000); // 1000ms duration
    };

    // useEffect(() => {
    //     if (mapRef.current && userLocation) {
    //         // Define the NW and SE corners of your 30m box
    //         const northEast = {
    //             latitude: userLocation.latitude + delta,
    //             longitude: userLocation.longitude + delta,
    //         };
    //         const southWest = {
    //             latitude: userLocation.latitude - delta,
    //             longitude: userLocation.longitude - delta,
    //         };
    //
    //         // Locks the user inside this specific area
    //         mapRef.current.setMapBoundaries(northEast, southWest);
    //     }
    // }, [userLocation]);

    return (
        <View style={{flex: 1}}>
            <StatusBar style="light" animated/>
            <MapView
                provider={PROVIDER_GOOGLE}
                ref={mapRef}
                mapType="satellite"
                zoomEnabled
                followsUserLocation={true}
                minZoomLevel={18.5}
                initialRegion={{
                    latitude: residenceData?.latitude ?? -6.7924,
                    longitude: residenceData?.longitude ?? 39.2083,
                    latitudeDelta: residenceData?.latitude_delta ?? 0.05,
                    longitudeDelta: residenceData?.longitude_delta ?? 0.05,
                }}
                style={{width: "100%", height: "100%"}}
            >
                <Marker
                    coordinate={{
                        latitude: residenceData?.location.latitude,
                        longitude: residenceData?.location.longitude,
                    }}
                    draggable
                    onDragEnd={(e) => {
                        const {latitude, longitude} = e.nativeEvent.coordinate;
                        setLocation((prev) => ({...prev, latitude, longitude}));
                    }}
                    title="Your Home"
                >
                    <View style={styles.markerContainer}>
                        <HomeIndicator/>
                        <View style={styles.markerDot}/>
                    </View>
                </Marker>

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
                            <Pressable onPress={goToCurrentLocation}>
                                <MapLocation/>
                            </Pressable>
                        </View>
                    </View>
                    <View>

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

const styles = StyleSheet.create({
    markerContainer: {
        alignItems: "center",
    },
    markerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#FF5A5F",
        marginTop: 2,
    },
})

export default Index;