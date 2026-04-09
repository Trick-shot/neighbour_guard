import AppScreen from "@/components/AppScreen";
import LottieView from "lottie-react-native";
import React, {useRef} from 'react';

const LoadingScreen = () => {
    const ref = useRef<LottieView>(null);

    return (
        <AppScreen screenStyle={{flex: 1, justifyContent: "center", alignItems: "center"}}>
            <LottieView
                ref={ref}
                source={require('../assets/animation/dotLoader.json')}
                style={{width: 108, height: 108, marginBottom: 200}}
                loop={true}
                autoPlay={true}
            />
        </AppScreen>
    );
};

export default LoadingScreen;