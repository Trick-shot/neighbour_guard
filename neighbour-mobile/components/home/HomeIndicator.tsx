import animationData from "@/assets/animation/indicators/homeLocation1.json";
import LottieView from "lottie-react-native";

const HomeIndicator = () => {
    return (
        <LottieView
            source={animationData}
            loop={true}
            autoPlay={true}
            style={{width: 100, height: 100}}
        />
    )
}

export default HomeIndicator;