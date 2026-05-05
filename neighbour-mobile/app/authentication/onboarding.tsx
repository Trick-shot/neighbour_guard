import AppButton from "@/components/AppButton";
import AppText from "@/components/AppText";
import {useRouter} from "expo-router";
import React, {useRef, useState} from "react"
import {LinearGradient} from 'expo-linear-gradient';
import {StyleSheet, View, Animated, TouchableOpacity} from "react-native";
import {Image} from 'expo-image';
import PagerView from 'react-native-pager-view';
import BottomSheet, {BottomSheetBackdropProps, BottomSheetView} from '@gorhom/bottom-sheet';

import img1 from '../../assets/images/img1.png';
import img2 from '../../assets/images/img2.png';
import img3 from '../../assets/images/img3.png';
import RightIcon from "../../assets/icons/rightIcon.svg"


const carouselImages = [{
    image: img1,
    carouselTitle: "Welcome",
    carouselBody: "Stay connected with your neighborhood and feel safe wherever you are.",
}, {
    image: img2,
    carouselTitle: "Community Connection",
    carouselBody: "Chat with neighbors and security to keep everyone informed and safe.",
}, {
    image: img3,
    carouselTitle: "Instant Alerts",
    carouselBody: "Send and receive emergency alerts instantly when it matters most.",
}];


const Gradient = ({style}: BottomSheetBackdropProps) => {
    return (
        <LinearGradient
            colors={['#0062B8', '#004785', '#002C52']}
            start={{x: 0, y: 0}}
            end={{x: 0, y: 1}}
            style={[
                StyleSheet.absoluteFillObject,
                {
                    borderTopLeftRadius: 38, borderTopRightRadius: 38
                },   // ← Increase this value
            ]}
        />
    )
}

const Onboarding = () => {
    const router = useRouter()
    const pageRef = useRef<PagerView>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const onPageScroll = Animated.event(
        [
            {
                nativeEvent: {
                    position: new Animated.Value(0), // dummy values
                    offset: new Animated.Value(0),
                },
            },
        ],
        {
            useNativeDriver: false,
            listener: (e: any) => {
                const {position, offset} = e.nativeEvent;
                scrollX.setValue(position + offset);
            },
        }
    );

    const handleNext = () => {
        if (currentPage < carouselImages.length - 1) {
            pageRef.current?.setPage(currentPage + 1);
        } else {
            // TODO: navigate to main app
            console.log("Get Started");
        }
    };
    return (
        <View style={styles.screen}>
            <View style={styles.carousel}>
                <PagerView
                    ref={pageRef}
                    style={{flex: 1}}
                    initialPage={0}
                    onPageScroll={onPageScroll}
                    onPageSelected={(e) =>
                        setCurrentPage(e.nativeEvent.position)
                    }
                >
                    {carouselImages.map((item, index) => (
                        <View key={index}>
                            <Image
                                source={item.image}
                                style={styles.carouselImage}
                                contentFit="cover"
                            />
                        </View>
                    ))}
                </PagerView>
            </View>
            <View style={styles.container}>
                <BottomSheet
                    index={0}
                    enableHandlePanningGesture={false}
                    enableContentPanningGesture={false}
                    enablePanDownToClose={false}
                    enableDynamicSizing={false}
                    handleComponent={null}
                    backgroundComponent={Gradient}
                    snapPoints={['100%']}
                >
                    <BottomSheetView style={styles.contentContainer}>
                        <View style={styles.dotsContainer}>
                            {carouselImages.map((_, index) => {
                                const isActive = index === currentPage;

                                return (
                                    <Animated.View
                                        key={index}
                                        style={[
                                            styles.dot,
                                            {
                                                transform: [
                                                    {
                                                        scale: isActive ? 1.4 : 1,
                                                    },
                                                ],
                                                opacity: isActive ? 1 : 0.4,
                                            },
                                        ]}
                                    />
                                );
                            })}
                        </View>
                        <AppText styles={{
                            height: 29,
                            fontSize: 24,
                            marginTop: 2,
                            fontWeight: "bold",
                            color: "#fff"
                        }}>{carouselImages[currentPage].carouselTitle}
                        </AppText>
                        <AppText styles={{
                            height: 65,
                            fontSize: 14,
                            textAlign: "center",
                            color: "#fff"
                        }}>{carouselImages[currentPage].carouselBody}
                        </AppText>
                        <AppButton onPress={() => router.navigate('/authentication/register')}>Get Started</AppButton>
                        <TouchableOpacity onPress={() => router.navigate("/authentication/login")} style={{
                            marginTop: 5,
                            flexDirection: "row",
                            gap: 10,
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            <AppText styles={{
                                fontSize: 14,
                                color: "#fff",
                                flexDirection: "row"
                            }}>Skip</AppText>
                            <RightIcon width={18.5} height={14.81}/>
                        </TouchableOpacity>
                    </BottomSheetView>
                </BottomSheet>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    carousel: {
        width: "100%",
        height: "70%",
        position: "absolute",
        top: 0,
        left: 0,
    },
    carouselImage: {
        width: "100%",
        height: "100%",
    },
    container: {
        height: "37%",
    },
    contentContainer: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
        justifyContent: "space-evenly",
        gap: 20
    },
    dotsContainer: {
        flexDirection: "row",
        marginTop: 3,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: "#fff",
        marginHorizontal: 4,
    },
})

export default Onboarding;