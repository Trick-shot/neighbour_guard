import AppButton from "@/components/AppButton";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import IssuesCard from "@/components/IssuesCard";
import {useBottomSheet} from "@/context/BottomSheetContext";
import colors from "@/utils/config";
import {ApiResponse} from "apisauce";
import {useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {useState, useRef, useMemo, useEffect} from "react";
import {StyleSheet, TouchableOpacity, View, TextInput, Alert, FlatList, Pressable} from "react-native";
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import Calendar from '@/assets/icons/Calendar.svg'
import Filter from '@/assets/icons/Filter.svg'
import PlusIcon from '@/assets/icons/Plus.svg'
import {GestureHandlerRootView} from "react-native-gesture-handler";
import MapView, {Marker, PROVIDER_GOOGLE} from "react-native-maps";
import BottomSheet, {BottomSheetScrollView} from "@gorhom/bottom-sheet";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {Image} from "expo-image";
import issuesApi from "@/api/issues";
import LoadingScreen from "@/components/LoadingScreen";
import residenceApi from "@/api/residence"  // ← add this import


const CATEGORIES = ['Community', 'Neighbours']
const SEVERITY_OPTIONS = ['low', 'moderate', 'high', 'critical']

const Reports = () => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [issues, setIssues] = useState([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const router = useRouter()

    // bottom sheet
    const sheetRef = useRef<BottomSheet>(null)
    const snapPoints = useMemo(() => ["100%"], [])

    // form state
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [severity, setSeverity] = useState('moderate')
    const [images, setImages] = useState<string[]>([])
    const [residenceData, setResidenceData] = useState<any>(null)
    const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null)

    useEffect(() => {
        fetchIssues()
        fetchResidence()
    }, [selectedIndex])

    const {openSheet, closeSheet} = useBottomSheet();


    const fetchIssues = async () => {
        try {
            setLoading(true)
            const category = CATEGORIES[selectedIndex].toLowerCase()
            const res: ApiResponse<any> = await issuesApi.getIssues(category)
            setIssues(res.data ?? [])
        } catch (e) {
            console.log(e)
        } finally {
            setLoading(false)
        }
    }

    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!permission.granted) {
            Alert.alert('Permission required', 'Please allow media library access')
            return
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
        })
        if (!result.canceled) {
            setImages(prev => [...prev, ...result.assets.map(a => a.uri)])
        }
    }

    const fetchResidence = async () => {
        try {
            const res = await residenceApi.userResidence()
            setResidenceData(res.data)
        } catch (e) {
            console.log('Error fetching residence:', e)
        }
    }

    const getCurrentLocation = async () => {
        const {status} = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow location access')
            return
        }
        const loc = await Location.getCurrentPositionAsync({})
        setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
        })
    }

    const handleSubmit = async () => {
        if (!title || !description) {
            Alert.alert('Error', 'Title and description are required')
            return
        }
        if (!residenceData?.id) {
            Alert.alert('Error', 'Residence not found')
            return
        }
        try {
            setSubmitting(true)
            const formData = new FormData()
            formData.append('title', title)
            formData.append('description', description)
            formData.append('severity', severity)
            formData.append('category', CATEGORIES[selectedIndex].toLowerCase())
            formData.append('residence', String(residenceData?.id))

            if (location) {
                formData.append('latitude', location.latitude.toString())
                formData.append('longitude', location.longitude.toString())
            }

            images.forEach((uri, index) => {
                formData.append('uploaded_images', {
                    uri,
                    name: `image_${index}.jpg`,
                    type: 'image/jpeg'
                } as any)
            })

            await issuesApi.createIssue(formData)

            // reset form
            setTitle('')
            setDescription('')
            setSeverity('moderate')
            setImages([])
            setLocation(null)

            sheetRef.current?.close()
            fetchIssues()
            Alert.alert('Success', 'Issue created successfully')
        } catch (e: any) {
            console.log('Error:', e?.response?.data)
            Alert.alert('Error', 'Failed to create issue. Try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <GestureHandlerRootView style={{flex: 1}}>
            <AppScreen screenStyle={styles.screen}>
                {loading && <LoadingScreen/>}
                <StatusBar style="dark"/>

                {/* Header */}
                <View style={{flexDirection: "row", position: "relative"}}>
                    <AppText styles={{
                        textAlign: "center",
                        fontWeight: "500",
                        fontSize: 17,
                        width: "100%"
                    }}>Issues</AppText>
                    <TouchableOpacity
                        onPress={() => {
                            sheetRef.current?.expand()
                            openSheet()
                        }}
                        style={{position: "absolute", alignSelf: "center", right: 0}}
                    >
                        <PlusIcon/>
                    </TouchableOpacity>
                </View>

                {/* Filter tabs */}
                <SegmentedControl
                    style={{marginTop: 20}}
                    values={CATEGORIES}
                    selectedIndex={selectedIndex}
                    onChange={(event) => {
                        setSelectedIndex(event.nativeEvent.selectedSegmentIndex)
                    }}
                />

                {/* Date & Filter */}
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
                        <AppText styles={{fontSize: 10}}>Tues, 23</AppText>
                    </View>
                    <TouchableOpacity onPress={() => router.navigate('/reports/issueDetails')}>
                        <Filter/>
                    </TouchableOpacity>
                </View>

                {/* Issues List */}
                <FlatList
                    data={issues}
                    keyExtractor={(item: any, index) => (item?.id ?? index).toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{gap: 15, paddingBottom: 10, marginTop: 32}}
                    renderItem={({item}) => (
                        <IssuesCard
                            issue={item}
                            onPress={() => router.navigate({
                                pathname: '/reports/issueDetails',
                                params: {id: item.id}
                            })}
                        />
                    )}
                    ListEmptyComponent={
                        <AppText styles={{textAlign: 'center', color: '#A5A5A5', marginTop: 32}}>
                            No issues found
                        </AppText>
                    }
                />

                {/* Add Issue Bottom Sheet */}
                <BottomSheet
                    ref={sheetRef}
                    snapPoints={snapPoints}
                    index={-1}
                    enablePanDownToClose
                    onClose={() => closeSheet()}
                >
                    <BottomSheetScrollView
                        contentContainerStyle={{height: "100%",}}>
                        {submitting && <LoadingScreen/>}

                        <AppText styles={{
                            fontSize: 16,
                            textAlign: "center",
                            marginTop: 32,
                            marginBottom: 16
                        }}>Add Issue</AppText>

                        <View style={{paddingHorizontal: 16, gap: 24, paddingBottom: 100}}>

                            {/* Title */}
                            <View style={{gap: 8}}>
                                <AppText styles={{fontSize: 14}}>Title</AppText>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Suspicious activities"
                                    placeholderTextColor={colors.TGrey60}
                                    value={title}
                                    onChangeText={setTitle}
                                />
                            </View>

                            {/* Description */}
                            <View style={{gap: 8}}>
                                <AppText styles={{fontSize: 14}}>Description</AppText>
                                <TextInput
                                    style={[styles.formInput, {height: 130, paddingTop: 16}]}
                                    placeholder="Describe the issue..."
                                    placeholderTextColor={colors.TGrey60}
                                    multiline
                                    textAlignVertical="top"
                                    value={description}
                                    onChangeText={setDescription}
                                />
                            </View>

                            {/* Severity */}
                            <View style={{gap: 8}}>
                                <AppText styles={{fontSize: 14}}>Severity</AppText>
                                <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
                                    {SEVERITY_OPTIONS.map(opt => (
                                        <TouchableOpacity
                                            key={opt}
                                            onPress={() => setSeverity(opt)}
                                            style={[
                                                styles.severityButton,
                                                severity === opt && {
                                                    backgroundColor: colors.primary,
                                                    borderColor: colors.primary
                                                }
                                            ]}
                                        >
                                            <AppText styles={{
                                                fontSize: 12,
                                                color: severity === opt ? '#fff' : '#A5A5A5'
                                            }}>
                                                {opt}
                                            </AppText>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Location */}
                            <View style={{gap: 8}}>
                                <AppText styles={{fontSize: 14}}>Set Location</AppText>
                                <View>
                                    <MapView
                                        provider={PROVIDER_GOOGLE}
                                        mapType="satellite"
                                        pointerEvents="none"
                                        initialRegion={{
                                            latitude: location?.latitude ?? -6.7924,
                                            longitude: location?.longitude ?? 39.2083,
                                            latitudeDelta: 0.05,
                                            longitudeDelta: 0.05,
                                        }}
                                        region={location ? {
                                            latitude: location.latitude,
                                            longitude: location.longitude,
                                            latitudeDelta: 0.01,
                                            longitudeDelta: 0.01,
                                        } : undefined}
                                        style={{width: "100%", height: 120, borderRadius: 16}}
                                    >
                                        {location && <Marker draggable coordinate={location}/>}
                                    </MapView>
                                </View>
                                {location && (
                                    <AppText styles={{fontSize: 10, color: '#A5A5A5'}}>
                                        Location set: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                                    </AppText>
                                )}
                            </View>

                            {/* Media */}
                            <View style={{gap: 8}}>
                                <AppText styles={{fontSize: 14}}>Media</AppText>
                                <FlatList
                                    horizontal
                                    data={[...images, 'add']}
                                    keyExtractor={(item, index) => index.toString()}
                                    showsHorizontalScrollIndicator={false}
                                    renderItem={({item}) => {
                                        if (item === 'add') {
                                            return (
                                                <TouchableOpacity
                                                    onPress={pickImage}
                                                    style={styles.addImageButton}
                                                >
                                                    <AppText styles={{fontSize: 28, color: '#A5A5A5'}}>+</AppText>
                                                </TouchableOpacity>
                                            )
                                        }
                                        return (
                                            <View style={{position: 'relative', marginRight: 8}}>
                                                <Image
                                                    source={item}
                                                    style={styles.mediaImage}
                                                    contentFit="cover"
                                                />
                                                <TouchableOpacity
                                                    style={styles.removeImage}
                                                    onPress={() => setImages(prev => prev.filter(i => i !== item))}
                                                >
                                                    <AppText styles={{color: '#fff', fontSize: 10}}>✕</AppText>
                                                </TouchableOpacity>
                                            </View>
                                        )
                                    }}
                                />
                            </View>

                            <AppButton
                                onPress={handleSubmit}
                                buttonStyles={{backgroundColor: colors.primary}}
                            >
                                Add Issue
                            </AppButton>
                        </View>
                    </BottomSheetScrollView>
                </BottomSheet>
            </AppScreen>
        </GestureHandlerRootView>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        paddingBottom: 0,
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    formInput: {
        width: "100%",
        height: 63,
        borderColor: "#D9D9D9",
        borderWidth: 1,
        paddingLeft: 18,
        borderRadius: 15
    },
    severityButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0'
    },
    mediaImage: {
        width: 100,
        height: 100,
        borderRadius: 12,
    },
    addImageButton: {
        width: 100,
        height: 100,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8
    },
    removeImage: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center'
    }
})

export default Reports;