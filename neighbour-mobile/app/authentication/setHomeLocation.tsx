import AppButton from "@/components/AppButton";
import AppText from "@/components/AppText";
import {useLocalSearchParams} from "expo-router";
import {useCallback, useEffect, useRef, useState} from "react";
import {View, StyleSheet, Text} from "react-native";
import MapView, {PROVIDER_GOOGLE, Marker} from "react-native-maps";
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import BottomSheet, {BottomSheetView} from '@gorhom/bottom-sheet';

const SetHomeLocation = () => {
    const [ready, setReady] = useState(false);

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
    }, [ready]);

    if (!lat || !lng) return null;

    return (
        <GestureHandlerRootView style={styles.container}>
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
                    snapPoints={['30%']}
                >
                    <BottomSheetView style={styles.contentContainer}>
                        <AppText styles={{
                            fontSize: 14
                        }}>Set Home Residence By Draging the icon</AppText>
                        <AppButton>Set location</AppButton>
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
        padding: 8,
        alignItems: 'center',
        justifyContent: "space-between",
        paddingBottom: 68
    },
});

export default SetHomeLocation;