import animationData from "@/assets/animation/indicators/homeLocation1.json";
import LottieView from "lottie-react-native";

const HomeIndicator = ({color}: { color: string }) => {
    return (
        <LottieView
            source={animationData}
            loop={true}
            autoPlay={true}
            style={{width: 100, height: 100}}
            colorFilters={[
                {
                    keypath: "Location",   // targets all layers
                    color: color,
                },
                {keypath: "Home", color: color},
            ]}

        />
    )
}

export default HomeIndicator;