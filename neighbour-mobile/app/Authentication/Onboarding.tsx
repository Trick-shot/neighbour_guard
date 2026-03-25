import {useCallback, useRef} from "react"
import {LinearGradient} from 'expo-linear-gradient';
import {StyleSheet, View, Text} from "react-native";
import {Image} from 'expo-image';
import PagerView from 'react-native-pager-view';
import BottomSheet, {BottomSheetBackdropProps, BottomSheetView} from '@gorhom/bottom-sheet';
import img1 from '../../assets/images/img1.png';
import img2 from '../../assets/images/img2.png';
import img3 from '../../assets/images/img3.png';


const carouselImages = [img1, img2, img3];

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
    const bottomSheetRef = useRef<BottomSheet>(null);
    return (
        <View style={styles.screen}>
            <PagerView style={styles.carousel}>
                <Image style={styles.carouselImage} source={img1} contentFit="cover"/>
                <Image style={styles.carouselImage} source={img2}/>
                <Image style={styles.carouselImage} source={img3}/>
            </PagerView>
            <View style={styles.container}>
                <BottomSheet
                    ref={bottomSheetRef}
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
                        <Text>Awesome 1</Text>
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
        flex: 1,
    },
    container: {
        height: "37%",
    },
    contentContainer: {
        flex: 1,
        padding: 36,
        alignItems: 'center',
        borderRadius: 38,
    }
})

export default Onboarding;