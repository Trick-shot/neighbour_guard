import {useColorScheme} from 'react-native';

import {Colors, palettes} from './colors';
import {type, TypeName} from './type';

export const space = {xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32} as const;
export const radius = {sm: 8, md: 12, lg: 16, xl: 20, pill: 999} as const;

export {type};
export {shadow} from './shadow';
export type {Colors, TypeName};

/** The colours for the phone's current light/dark setting. */
export function useColors(): Colors {
    return useColorScheme() === 'dark' ? palettes.dark : palettes.light;
}

export const alertColor = (colors: Colors, alertType: string) =>
    (colors.alert as Record<string, string>)[alertType] ?? colors.alert.other;
