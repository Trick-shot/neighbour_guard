import HomeIndicator from "@/components/home/HomeIndicator";
import UserComponent from "@/components/home/UserComponent";
import LoadingScreen from "@/components/LoadingScreen";
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
import {getRandomColor} from '../../utils/randomColor'
import * as Notifications from 'expo-notifications';
import alertsApi from "@/api/alerts";
import AlertModal from "@/components/home/AlertModal";
import {registerPushToken} from "@/utils/registerPushToken";


const Index = () => {
    const [isLoading, setIsLoading] = useState(true)
    const [userData, setUserData] = useState<ProfileType | null>(null)
    const [residenceData, setResidenceData] = useState<ResidenceTypes | null>(null)
    const bottomSheetRef = useRef<BottomSheet>(null)
    const [neighbours, setNeighbours] = useState<(ResidenceTypes & { color: string })[]>([]);
    const mapRef = useRef<MapView | null>(null)
    const [selectedResidence, setSelectedResidence] = useState<ResidenceTypes | null>(null)
    const [location, setLocation] = useState(null)

    const handleSheetChanges = useCallback((index: number) => {
        console.log('handleSheetChanges', index);
    }, []);

    const handleNeighbourPress = (neighbour: ResidenceTypes) => {
        setSelectedResidence(neighbour);
        bottomSheetRef.current?.expand();
    };

    const handleOwnMarkerPress = () => {
        setSelectedResidence(null);
        bottomSheetRef.current?.expand();
    };


    const fetchNeighbours = async () => {
        try {
            const res: ApiResponse<any> = await residenceApi.getNeighbours();
            console.log("Neighbours response:", res.status, res.data);
            if (res.ok) {
                const withColors = res.data.map((n: ResidenceTypes) => ({
                    ...n,
                    color: getRandomColor(),
                }));
                setNeighbours(withColors);
            } else {
                console.log("Failed to fetch neighbours:", res.problem);
            }
        } catch (e) {
            console.log("Error fetching neighbours:", e); // ✅ catch silent crashes
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
        }, 1000);
    };

    const [alertModalVisible, setAlertModalVisible] = useState(false);
    const [isSendingAlert, setIsSendingAlert] = useState(false);

    useEffect(() => {
        getHomeData();
        fetchNeighbours();
        registerPushToken();
    }, []);

    useEffect(() => {
        const subscription = Notifications.addNotificationReceivedListener(notification => {
            console.log("🚨 Alert received:", notification);
            fetchNeighbours(); // refresh map
        });
        return () => subscription.remove();
    }, []);

    // ✅ handle notification tap
    useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            console.log("Notification tapped:", data);
            if (data.latitude && data.longitude) {
                mapRef.current?.animateToRegion({
                    latitude: data.latitude,
                    longitude: data.longitude,
                    latitudeDelta: 0.001,
                    longitudeDelta: 0.001,
                } as Region, 1000);
            }
        });
        return () => subscription.remove();
    }, []);

    const handleSendAlert = async (alert_type: string, message: string) => {
        try {
            setIsSendingAlert(true);
            const res = await alertsApi.sendAlert(alert_type, message);
            if (res.ok) {
                setAlertModalVisible(false);
                console.log(`✅ Alert sent, notified ${res.data.notified_count} neighbours`);
            } else {
                console.log("Failed to send alert:", res.problem);
            }
        } catch (e) {
            console.log("Error sending alert:", e);
        } finally {
            setIsSendingAlert(false);
        }
    };

    console.log("residence", selectedResidence?.residence_members[0])

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
                    onPress={() => setSelectedResidence(null)}
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
                        <HomeIndicator color="#1CED7F"/>
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
                        <View style={styles.markerContainer}>
                            <HomeIndicator color={neighbour.color}/>
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
                        <Pressable onPress={() => setAlertModalVisible(true)}>
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
                                user={selectedResidence.residence_members}
                            />
                        ) : (
                            <UserComponent
                                residence={residenceData}
                                user={userData}
                            />
                        )}
                    </BottomSheetView>
                </BottomSheet>
                <AlertModal
                    visible={alertModalVisible}
                    onClose={() => setAlertModalVisible(false)}
                    onSend={handleSendAlert}
                    isSending={isSendingAlert}
                />
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