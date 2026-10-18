import {Platform, ViewStyle} from 'react-native';

/** Figma drop shadows as React Native styles (iOS shadow*, Android elevation). */
const make = (y: number, blur: number, opacity: number, elevation: number, color = '#0d1426'): ViewStyle =>
    Platform.select({
        ios: {shadowColor: color, shadowOffset: {width: 0, height: y}, shadowOpacity: opacity, shadowRadius: blur / 2},
        default: {elevation, shadowColor: color},
    }) as ViewStyle;

export const shadow = {
    bubble: make(2, 8, 0.06, 2),        // chat bubbles, composer input, round header buttons
    pill: make(2, 8, 0.14, 3),          // area count pills
    card: make(4, 16, 0.12, 6),         // compact status bar
    control: make(4, 14, 0.12, 5),      // map controls
    md: make(4, 12, 0.08, 4, '#0a0f1a'),// Shadow/md
    tabBar: make(-4, 10, 0.08, 12),
    type: make(4, 12, 0.3, 6, '#000000'),
    sos: make(15, 50, 0.35, 16, '#e5292b'),
};
