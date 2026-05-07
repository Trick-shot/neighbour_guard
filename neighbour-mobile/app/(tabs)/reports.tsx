import AppBottomSheet from "@/components/AppBottomSheet";
import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import ImageSlider from "@/components/ImageSlider";
import IssuesCard from "@/components/IssuesCard";
import colors from "@/Utilis/config";
import {useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {useState, useRef, useMemo, useEffect, useCallback,} from "react";
import {ScrollView, StyleSheet, TouchableOpacity, View, Button, Text, TextInput} from "react-native";
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import Calendar from '@/assets/icons/Calendar.svg'
import Filter from '@/assets/icons/Filter.svg'
import {GestureHandlerRootView} from "react-native-gesture-handler";
import MapView, {PROVIDER_GOOGLE} from "react-native-maps";
import {SafeAreaView} from "react-native-safe-area-context";
import PlusIcon from '@/assets/icons/Plus.svg'
import BottomSheet, {BottomSheetView} from "@gorhom/bottom-sheet";
import {useBottomSheet} from "../../context/BottomSheetContext";


const Reports = () => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const router = useRouter()
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["50%"], []);
    const {isOpen, openSheet, closeSheet} = useBottomSheet();
    const bottomSheetRef = useRef<BottomSheet>(null);


    useEffect(() => {
        if (isOpen) {
            sheetRef.current?.expand();
        } else {
            sheetRef.current?.close();
        }
    }, [isOpen]);

    return (
        <AppScreen style={styles.screen}>
            <StatusBar barStyle="dark-content"/>
            <View style={{
                flexDirection: "row",
                position: "relative"
            }}>
                <AppText styles={{
                    textAlign: "center",
                    fontWeight: "500",
                    fontSize: 17,
                    width: "100%"
                }}>
                    Issues
                </AppText>
                <TouchableOpacity onPress={openSheet} style={{
                    position: "absolute",
                    alignSelf: "center",
                    right: 0
                }}>
                    <PlusIcon/>
                </TouchableOpacity>
            </View>
            <SegmentedControl
                style={{
                    marginTop: 20
                }}
                values={['Community', 'Neighbours']}
                selectedIndex={selectedIndex}
                onChange={(event) => {
                    setSelectedIndex(event.nativeEvent.selectedSegmentIndex);
                }}
            />
            <View style={{
                marginTop: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between"
            }}>
                <View style={{
                    flexDirection: "row",
                    padding: 5,
                    backgroundColor: "#E9E9E9",
                    borderRadius: 9,
                    gap: 10,
                    width: 81,

                }}>
                    <Calendar/>
                    <AppText styles={{
                        fontSize: 10
                    }}>Tues, 23</AppText>
                </View>
                <TouchableOpacity>
                    <Filter/>
                </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIn10dicator={false}>
                <View style={{
                    flex: 1,
                    height: "100%",
                    marginTop: 32,
                    gap: 15,
                    paddingBottom: 10
                }}>
                    <IssuesCard onPress={() => router.navigate('/reports/issueDetails')}/>
                    <IssuesCard/>
                    <IssuesCard/>
                </View>
            </ScrollView>
            <AppBottomSheet/>
            {
                isOpen ? <BottomSheet
                    ref={bottomSheetRef}
                    enablePanDownToClose
                    snapPoints={['95%']}
                    index={1}
                    onClose={closeSheet}
                >
                    <BottomSheetView style={{
                        height: "100%",
                        paddingTop: 10,
                    }}>
                        <AppText styles={{
                            fontSize: 16,
                            textAlign: "center"
                        }}>Add Issue</AppText>
                        <ScrollView>
                            <View style={{
                                paddingBottom: 100
                            }}>
                                <View style={{
                                    alignItems: "flex-start",
                                    paddingHorizontal: 14,
                                    gap: 24,

                                }}>
                                    <View style={{
                                        width: "100%",
                                        gap: 16
                                    }}>
                                        <AppText styles={{
                                            textAlign: "left",
                                            fontSize: 14
                                        }}>Title</AppText>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Supcious activites"
                                            placeholderTextColor={colors.TGrey60}
                                        />
                                    </View>
                                    <View style={{
                                        width: "100%",
                                        gap: 16
                                    }}>
                                        <AppText styles={{
                                            textAlign: "left",
                                            fontSize: 14
                                        }}>Description</AppText>
                                        <TextInput
                                            style={[styles.formInput, {
                                                height: 130,
                                                paddingTop: 24
                                            }]}
                                            placeholder="Supcious activites"
                                            placeholderTextColor={colors.TGrey60}
                                            multiline
                                        />
                                    </View>
                                    <View style={{
                                        width: "100%",
                                        gap: 24
                                    }}>
                                        <AppText styles={{
                                            textAlign: "left",
                                            fontSize: 14
                                        }}>Set Location</AppText>
                                        <TouchableOpacity>
                                            <MapView provider={PROVIDER_GOOGLE} mapType="satellite" initialRegion={{
                                                latitude: -6.7924,
                                                longitude: 39.2083,
                                                latitudeDelta: 0.05,
                                                longitudeDelta: 0.05,
                                            }} style={{
                                                width: "100%",
                                                height: 120,
                                                borderRadius: 24
                                            }}/>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={{
                                    width: "100%",
                                    gap: 16,
                                    paddingLeft: 16,
                                    marginTop: 32
                                }}>
                                    <AppText styles={{
                                        textAlign: "left",
                                        fontSize: 14
                                    }}>Media</AppText>
                                    <ImageSlider/>
                                </View>
                                <View style={{
                                    width: "100%",
                                    paddingHorizontal: 16,
                                    marginTop: 24
                                }}>
                                    <AppButton>Add Issue</AppButton>
                                </View>
                            </View>
                        </ScrollView>
                    </BottomSheetView>
                </BottomSheet> : null
            }
        </AppScreen>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        paddingBottom: -25,
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    formInput: {
        width: "100%",
        height: 63,
        borderColor: "#D9D9D9",
        borderStyle: "solid",
        borderWidth: 1,
        paddingLeft: 18,
        borderRadius: 15
    }
})
export default Reports;