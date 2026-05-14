import HomeIndicator from "@/components/home/HomeIndicator";
import UserComponent from "@/components/home/UserComponent";
import {ResidenceTypes} from "@/types/ResidenceTypes";
import {ProfileType} from "@/types/ProfileType";
import {ApiResponse} from "apisauce";
import {useCallback, useEffect, useRef, useState} from "react";
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import BottomSheet, {BottomSheetView} from '@gorhom/bottom-sheet';
import {StatusBar} from "expo-status-bar";
import {View, StyleSheet, Pressable} from "react-native";
import MapView, {PROVIDER_GOOGLE, Marker} from 'react-native-maps';
import AlertIcon from "@/assets/icons/alertIcon.svg";
import BellIcon from "@/assets/icons/bellFill.svg";
import MapLocation from "@/assets/icons/mapLocation.svg";
import profileApi from "@/api/profile"
import residenceApi from "@/api/residence"
import * as Location from 'expo-location'


const users = [
    {id: 1, name: 'Alice', coords: {latitude: 37.78825, longitude: -122.4324}},
    {id: 2, name: 'Bob', coords: {latitude: 37.78925, longitude: -122.4334}},
];

const Index = () => {
    const [isLoading, setIsLoading] = useState(true)
    const [userData, setUserData] = useState<ProfileType | null>(null)
    const [residenceData, setResidenceData] = useState<ResidenceTypes | null>(null)
    const bottomSheetRef = useRef<BottomSheet>(null)
    const [neighbours, setNeighbours] = useState<ResidenceTypes[]>([]);
    const mapRef = useRef<MapView | null>(null)
    const [selectedResidence, setSelectedResidence] = useState<ResidenceTypes | null>(null)

    const handleSheetChanges = useCallback((index: number) => {
        console.log('handleSheetChanges', index);
    }, []);

    const handleNeighbourPress = (neighbour: ResidenceTypes) => {
        setSelectedResidence(neighbour);
        bottomSheetRef.current?.expand();
    };

    // ✅ when user presses their own marker, reset to own data
    const handleOwnMarkerPress = () => {
        setSelectedResidence(null);
        bottomSheetRef.current?.expand();
    };


    useEffect(() => {
        getHomeData()
        fetchNeighbours();

    }, [])

    const fetchNeighbours = async () => {
        const res: ApiResponse<any> = await residenceApi.getNeighbours();
        if (res.ok) {
            setNeighbours(res.data);
        }
    };


    const getHomeData = async () => {
        try {
            const userProfile = await profileApi.userProfile()
            const residenceRes = await residenceApi.userResidence()
            setUserData(userProfile.data ?? null)
            setResidenceData(residenceRes.data ?? null)
        } catch (e) {
            console.log('Error fetching home data:', e)
        } finally {
            setIsLoading(false)
        }
    }

    const goToCurrentLocation = async () => {
        mapRef.current?.animateToRegion({
            latitude: residenceData?.location?.latitude,
            longitude: residenceData?.location?.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
        }, 1000); // 1000ms duration
    };

    console.log(selectedResidence)
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
                    latitude: residenceData?.location?.latitude ?? -6.7924,
                    longitude: residenceData?.location?.longitude ?? 39.2083,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                style={{width: "100%", height: "100%"}}
            >
                <Marker
                    coordinate={{
                        latitude: residenceData?.location?.latitude,
                        longitude: residenceData?.location?.longitude,
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

                {neighbours.map((neighbour, index) => (
                    <Marker
                        onPress={() => handleNeighbourPress(neighbour)}
                        key={neighbour.id}
                        coordinate={{
                            latitude: neighbour.location?.latitude,
                            longitude: neighbour.location?.longitude,
                        }}
                        title={neighbour.residence_name}
                        description={neighbour.street_name}
                    >
                        {/* Different icon to distinguish neighbours */}
                        <View style={styles.markerContainer}>
                            <HomeIndicator/>
                            <View style={styles.markerDot}/>
                        </View>
                    </Marker>
                ))}

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
                        {selectedResidence ? (
                            <UserComponent
                                residence={selectedResidence}
                                user={null}
                            />
                        ) : (
                            <UserComponent
                                residence={residenceData}
                                user={userData}
                            />
                        )}
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