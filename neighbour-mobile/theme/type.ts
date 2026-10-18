import {Platform, TextStyle} from 'react-native';

/** Text styles from Figma. The system font is SF Pro on iOS and Roboto on Android. */
const w = (weight: TextStyle['fontWeight']) => ({fontWeight: weight});
const ls = (v: number) => (Platform.OS === 'ios' ? v : 0);

export const type = {
    displaySOS: {fontSize: 40, lineHeight: 44, letterSpacing: ls(0.4), ...w('800')},
    titleLarge: {fontSize: 34, lineHeight: 41, letterSpacing: ls(0.4), ...w('700')},
    title1: {fontSize: 28, lineHeight: 34, letterSpacing: ls(0.38), ...w('700')},
    title2: {fontSize: 22, lineHeight: 28, letterSpacing: ls(-0.26), ...w('700')},
    title3: {fontSize: 20, lineHeight: 25, letterSpacing: ls(-0.45), ...w('600')},
    headline: {fontSize: 17, lineHeight: 22, letterSpacing: ls(-0.43), ...w('600')},
    body: {fontSize: 17, lineHeight: 22, letterSpacing: ls(-0.43), ...w('400')},
    bodyEmphasis: {fontSize: 17, lineHeight: 22, letterSpacing: ls(-0.43), ...w('600')},
    callout: {fontSize: 16, lineHeight: 21, letterSpacing: ls(-0.31), ...w('400')},
    subhead: {fontSize: 15, lineHeight: 20, letterSpacing: ls(-0.23), ...w('400')},
    label: {fontSize: 15, lineHeight: 20, letterSpacing: ls(-0.23), ...w('500')},
    footnote: {fontSize: 13, lineHeight: 18, letterSpacing: ls(-0.08), ...w('400')},
    caption1: {fontSize: 12, lineHeight: 16, ...w('400')},
    caption2: {fontSize: 11, lineHeight: 13, letterSpacing: ls(0.06), ...w('500')},
    buttonL: {fontSize: 17, lineHeight: 22, letterSpacing: ls(-0.43), ...w('600')},
    buttonM: {fontSize: 15, lineHeight: 20, letterSpacing: ls(-0.23), ...w('600')},
} satisfies Record<string, TextStyle>;

export type TypeName = keyof typeof type;
