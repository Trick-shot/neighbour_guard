import LottieView from "lottie-react-native";
import {View, StyleSheet} from "react-native";
import animationData from '../assets/animation/loading2.json'

const LoadingScreen = () => {

    return (
        <View style={styles.overlay}>
            <LottieView
                source={animationData}
                loop={true}
                autoPlay={true}
                style={{width: 100, height: 100}}
            />
        </View>
    );
};


const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: "#fff",
        zIndex: 999,
        elevation: 10,
    }
});


export default LoadingScreen;