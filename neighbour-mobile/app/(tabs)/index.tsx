import AlarmModal from "@/components/home/AlarmModal";
import AlertModal from "@/components/home/AlertModal";
import HomeIndicator from "@/components/home/HomeIndicator";
import UserComponent from "@/components/home/UserComponent";
import LoadingScreen from "@/components/LoadingScreen";
import {ProfileType} from "@/types/ProfileType";
import {ResidenceTypes} from "@/types/ResidenceTypes";
import {startAlarmWithInterval, stopAlarm} from "@/utils/alarmNotification";
import {getRandomColor} from '@/utils/randomColor';
import {registerPushToken} from "@/utils/registerPushToken";
import {ApiResponse} from "apisauce";
import * as Notifications from 'expo-notifications';
import {useFocusEffect} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {useCallback, useEffect, useRef, useState} from "react";
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Pressable, StyleSheet, View} from "react-native";
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import BottomSheet, {BottomSheetView} from '@gorhom/bottom-sheet';
import AlertIcon from "@/assets/icons/alertIcon.svg";
import BellIcon from "@/assets/icons/bellFill.svg";
import MapLocation from "@/assets/icons/mapLocation.svg";
import alertsApi from "@/api/alerts";
import profileApi from "@/api/profile";
import residenceApi from "@/api/residence";


const Index = () => {
    // ── State ────────────────────────────────────────────────────────────────
    const [isLoading, setIsLoading] = useState(true);
    const [userData, setUserData] = useState<ProfileType | null>(null);
    const [residenceData, setResidenceData] = useState<ResidenceTypes | null>(null);
    const [neighbours, setNeighbours] = useState<(ResidenceTypes & { color: string })[]>([]);
    const [selectedResidence, setSelectedResidence] = useState<ResidenceTypes | null>(null);
    const [location, setLocation] = useState(null);

    // Alert modal
    const [alertModalVisible, setAlertModalVisible] = useState(false);
    const [isSendingAlert, setIsSendingAlert] = useState(false);

    // Alarm
    const [alarmVisible, setAlarmVisible] = useState(false);
    const [activeAlert, setActiveAlert] = useState<any>(null);

    // ── Refs ─────────────────────────────────────────────────────────────────
    const bottomSheetRef = useRef<BottomSheet>(null);
    const mapRef = useRef<MapView | null>(null);

    // ── Handlers ─────────────────────────────────────────────────────────────
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

    const handleDismissAlarm = async () => {
        await stopAlarm();
        setAlarmVisible(false);
        setActiveAlert(null);
    };

    const handleSendAlert = async (alert_type: string, message: string) => {
        try {
            setIsSendingAlert(true);
            const res: ApiResponse<any> = await alertsApi.sendAlert(alert_type, message);
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

    const goToCurrentLocation = () => {
        mapRef.current?.animateToRegion({
            latitude: residenceData?.location?.latitude ?? 0,
            longitude: residenceData?.location?.longitude ?? 0,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
        }, 1000);
    };

    // ── Data fetching ─────────────────────────────────────────────────────────
    const getHomeData = async () => {
        try {
            const [userProfile, residenceRes] = await Promise.all([
                profileApi.userProfile(),
                residenceApi.userResidence(),
            ]);
            setUserData(userProfile.data ?? null);
            setResidenceData(residenceRes.data ?? null);
        } catch (e) {
            console.log('Error fetching home data:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchNeighbours = async () => {
        try {
            const res: ApiResponse<any> = await residenceApi.getNeighbours();
            if (res.ok) {
                const withColors = res.data.map((n: ResidenceTypes) => ({
                    ...n,
                    color: getRandomColor(),
                }));
                setNeighbours(withColors);
            }
        } catch (e) {
            console.log("Error fetching neighbours:", e);
        }
    };

    // ── Effects ───────────────────────────────────────────────────────────────
    useFocusEffect(
        useCallback(() => {
            getHomeData();
            fetchNeighbours();
            registerPushToken();
        }, [])
    );

    useEffect(() => {
        const subscription = Notifications.addNotificationReceivedListener(async notification => {
            console.log("🚨 Alert received:", notification);
            const data: any = notification.request.content.data;

            if (data?.alert_type) {
                setActiveAlert({...data, body: notification.request.content.body});
                setAlarmVisible(true);
                await startAlarmWithInterval(
                    data.alert_type,
                    notification.request.content.body ?? '',
                    30
                );
            }
            fetchNeighbours();
        });
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener(async response => {
            const data: any = response.notification.request.content.data;
            console.log("Notification tapped:", data);
            await stopAlarm();
            setAlarmVisible(false);
            if (data.latitude && data.longitude) {
                mapRef.current?.animateToRegion({
                    latitude: data.latitude,
                    longitude: data.longitude,
                    latitudeDelta: 0.001,
                    longitudeDelta: 0.001,
                }, 1000);
            }
        });
        return () => subscription.remove();
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────
    if (isLoading) return <LoadingScreen/>;

    return (
        <View style={{flex: 1}}>
            <StatusBar style="light" animated/>

            {/* Map */}
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
                {/* Own marker */}
                <Marker
                    onPress={handleOwnMarkerPress}
                    coordinate={{
                        latitude: residenceData?.location?.latitude ?? 0,
                        longitude: residenceData?.location?.longitude ?? 0,
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

                {/* Neighbour markers */}
                {neighbours.map((neighbour) => (
                    <Marker
                        key={neighbour.id}
                        onPress={() => handleNeighbourPress(neighbour)}
                        coordinate={{
                            latitude: neighbour?.location?.latitude ?? 0,
                            longitude: neighbour?.location?.longitude ?? 0,
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

                {/* Map overlay controls */}
                <View style={{flex: 1, paddingTop: 48, paddingHorizontal: 16}}>
                    <View style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        width: "100%",
                    }}>
                        <Pressable onPress={() => setAlertModalVisible(true)}>
                            <AlertIcon/>
                        </Pressable>
                        <View style={{alignItems: "center", gap: 40}}>
                            <Pressable style={styles.bellButton}>
                                <BellIcon/>
                            </Pressable>
                            <Pressable onPress={goToCurrentLocation}>
                                <MapLocation/>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </MapView>

            {/* Bottom sheet + modals */}
            <GestureHandlerRootView style={{flex: 1, ...StyleSheet.absoluteFillObject}}>
                <BottomSheet
                    ref={bottomSheetRef}
                    onChange={handleSheetChanges}
                    snapPoints={['22%']}
                    index={1}
                >
                    <BottomSheetView style={styles.bottomSheetContent}>
                        {selectedResidence ? (
                            <UserComponent
                                residence={selectedResidence}
                                user={selectedResidence.residence_members[0]}
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

                <AlarmModal
                    visible={alarmVisible}
                    alert={activeAlert}
                    onDismiss={handleDismissAlarm}
                />
            </GestureHandlerRootView>
        </View>
    );
};

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
    bellButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(120,120,128,1.6)",
    },
    bottomSheetContent: {
        height: "20%",
        padding: 36,
        paddingTop: 14,
        paddingHorizontal: 24,
        alignItems: 'flex-start',
    },
});

export default Index;