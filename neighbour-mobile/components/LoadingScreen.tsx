import LottieView from "lottie-react-native";
import React, {useRef, useEffect} from 'react';
import {View, StyleSheet} from "react-native";

const LoadingScreen = () => {
    const ref = useRef<LottieView>(null);

    useEffect(() => {
        ref.current?.play();
    }, []);


    return (
        <View style={styles.overlay}>
            <LottieView
                ref={ref}
                source={require('../assets/animation/dotLoader.json')}
                style={{width: 110, height: 110, marginBottom: 200}}
                autoPlay={true}
                loop
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