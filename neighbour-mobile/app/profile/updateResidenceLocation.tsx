import authApi from "@/api/auth";
import residenceApi from "@/api/residence";
import animationData from "@/assets/animation/location.json";
import BackIcon from "@/assets/icons/backIcon.svg";
import AppButton from "@/components/AppButton";
import AppText from "@/components/AppText";
import HomeIndicator from "@/components/home/HomeIndicator";
import LoadingScreen from "@/components/LoadingScreen";
import {LocationType} from "@/types/ResidenceTypes";
import BottomSheet, {BottomSheetView} from "@gorhom/bottom-sheet";
import {ApiResponse} from "apisauce";
import * as Location from "expo-location";
import {useRouter} from "expo-router";
import LottieView from "lottie-react-native";
import {useCallback, useEffect, useRef, useState} from "react";
import {StyleSheet, TouchableOpacity, View} from "react-native";
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import MapView, {Marker, PROVIDER_GOOGLE} from "react-native-maps";


const UpdateResidenceLocation = () => {
    const [ready, setReady] = useState(false);
    const mapRef = useRef<MapView | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const [errorMessage, setErrorMessage] = useState("");
    const bottomSheetRef = useRef<BottomSheet>(null);

    const [location, setLocation] = useState<LocationType>({
        latitude: 0.0000,
        longitude: 0.0000,
    });

    const handleSheetChanges = useCallback((index: number) => {
        console.log("handleSheetChanges", index);
    }, []);

    const setOnLocation = async () => {
        try {
            setIsLoading(true);
            const residenceRes: ApiResponse<any> = await residenceApi.userResidence()
            const results: ApiResponse<any> = await authApi.setLocation(residenceRes.data.id, location);
            console.log(results)
            if (!results.ok) {
                setErrorMessage("Failed to set location");
                return;
            }
        } catch (error) {
            console.log("ERROR:", error);
        } finally {
            setIsLoading(false);
        }
    };


    const goToCurrentLocation = async () => {
        const {status} = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            setErrorMessage("Location permission denied");
            return;
        }

        const {coords} = await Location.getCurrentPositionAsync();

        setLocation((prev) => ({
            ...prev,
            latitude: coords.latitude,
            longitude: coords.longitude,
        }));

        mapRef.current?.animateToRegion(
            {
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.0006,
                longitudeDelta: 0.0006,
            },
            1000
        );
    }

    useEffect(() => {
        if (ready && mapRef.current) {
            goToCurrentLocation()
        }
    }, [ready]);

    if (isLoading) return <LoadingScreen/>

    return (
        <GestureHandlerRootView style={styles.container}>
            {isLoading && <LoadingScreen/>}
            <MapView
                onMapReady={() => setReady(true)}
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                mapType="satellite"
                zoomEnabled
                followsUserLocation={true}
                showsUserLocation={true}
                region={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                style={StyleSheet.absoluteFillObject}
            >
                <Marker
                    onPress={() => setOnLocation()}
                    coordinate={{
                        latitude: location?.latitude,
                        longitude: location?.longitude,
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

            </MapView>

            {/* ✅ Fix Bug 3: overlay sits outside MapView */}
            <View style={styles.headerOverlay}>
                <TouchableOpacity onPress={() => router.back()}>
                    <BackIcon/>
                </TouchableOpacity>
            </View>

            <BottomSheet
                ref={bottomSheetRef}
                onChange={handleSheetChanges}
                index={0}
                enableHandlePanningGesture={false}
                enableContentPanningGesture={false}
                enablePanDownToClose={false}
                enableDynamicSizing={false}
                handleComponent={null}
                snapPoints={["35%"]}
            >
                <BottomSheetView style={styles.contentContainer}>
                    <View style={{width: "100%", flexDirection: "row", justifyContent: "center"}}>
                        <LottieView
                            source={animationData}
                            autoPlay
                            loop
                            style={{width: 116, height: 100}}
                        />
                    </View>
                    <AppText styles={{fontSize: 14, textAlign: "center"}}>
                        Set Home residence by Dragging the icon
                    </AppText>
                    <AppButton onPress={setOnLocation}>Set Location</AppButton>
                </BottomSheetView>
            </BottomSheet>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {flex: 1},
    headerOverlay: {
        position: "absolute",
        top: 48,
        left: 16,
        right: 16,
        zIndex: 10,
    },
    contentContainer: {
        flex: 1,
        padding: 26,
        paddingTop: 10,
        paddingBottom: 20,
        justifyContent: "space-evenly",
        gap: 20,
    },
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
});

export default UpdateResidenceLocation