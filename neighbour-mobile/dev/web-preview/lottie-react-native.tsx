/** Web-only stand-in for lottie-react-native (browser preview). Renders an empty box. */
import React, {forwardRef} from 'react';
import {View} from 'react-native';
const LottieView = forwardRef<any, any>(function LottieView({style}, _ref) { return <View style={style}/>; });
export default LottieView;
