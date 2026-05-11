import {StyleSheet, View} from "react-native";
import {ApiResponse} from "apisauce";
import {useLocalSearchParams, useRouter} from "expo-router";
import LottieView from 'lottie-react-native';
import {useCallback, useEffect, useRef, useState} from "react";
import MapView, {PROVIDER_GOOGLE, Marker} from "react-native-maps";
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import BottomSheet, {BottomSheetView} from '@gorhom/bottom-sheet';

import authApi from '../../api/auth'
import animationData from '@/assets/animation/location.json';

import {LocationType} from "@/types/ResidenceTypes";

import LoadingScreen from "@/components/LoadingScreen";
import AppButton from "@/components/AppButton";
import AppText from "@/components/AppText";

const SetHomeLocation = () => {
    const [ready, setReady] = useState(false);
    const [location, setLocation] = useState<LocationType>({
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0,
        longitudeDelta: 0
    });

    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const [errorMessage, setErrorMessage] = useState("")
    const {houseId} = useLocalSearchParams<{ houseId: string }>();
    const numericHouseId = Number(houseId);


    const setOnLocation = async () => {
        try {
            setIsLoading(true)
            const results: ApiResponse<any> = await authApi.setLocation(numericHouseId, location);
            if (!results.ok) {
                setIsLoading(false)
            }
            router.push("../authentication/addPhoto");
        } catch (error) {
            console.log("ERROR:", error);
        } finally {
            setIsLoading(false)
        }

    }

    // ref
    const bottomSheetRef = useRef<BottomSheet>(null);

    // callbacks
    const handleSheetChanges = useCallback((index: number) => {
        console.log('handleSheetChanges', index);
    }, []);

    const {latitude, longitude} = useLocalSearchParams<{
        latitude: string;
        longitude: string;
    }>();

    const lat = Number(latitude);
    const lng = Number(longitude);

    const mapRef = useRef<MapView | null>(null);

    useEffect(() => {
        if (ready && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.0006,
                longitudeDelta: 0.0006,
            }, 1000);
        }
        setLocation({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.0006,
            longitudeDelta: 0.0006,
        })
    }, [ready]);

    if (!lat || !lng) return null;

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
                initialRegion={{
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.003,
                    longitudeDelta: 0.003,
                }}
                style={{width: "100%", height: "100%"}}
            >
                <Marker
                    coordinate={{
                        latitude: lat,
                        longitude: lng,
                    }}
                    draggable
                    onDragEnd={(e) => {
                        const {latitude, longitude} = e.nativeEvent.coordinate;
                        console.log("New location:", latitude, longitude);
                    }}
                    title="Your Location"
                />
                <BottomSheet
                    ref={bottomSheetRef}
                    onChange={handleSheetChanges}
                    index={0}
                    enableHandlePanningGesture={false}
                    enableContentPanningGesture={false}
                    enablePanDownToClose={false}
                    enableDynamicSizing={false}
                    handleComponent={null}
                    snapPoints={['35%']}
                >
                    <BottomSheetView style={styles.contentContainer}>
                        <View style={{
                            width: "100%",
                            flexDirection: "row",
                            justifyContent: "center"
                        }}>
                            <LottieView
                                source={animationData}
                                autoPlay
                                loop
                                style={{width: 116, height: 100}}
                            />
                        </View>
                        <AppText styles={{
                            fontSize: 14,
                            textAlign: "center",
                        }}>Set Home residence by Draging the icon</AppText>
                        <AppButton onPress={() => setOnLocation()}>Set Location</AppButton>
                    </BottomSheetView>
                </BottomSheet>
            </MapView>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        height: "100%",
        padding: 26,
        paddingTop: 10,
        justifyContent: "space-evenly",
        paddingBottom: 20, gap: 20
    },
});

export default SetHomeLocation;