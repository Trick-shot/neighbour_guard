/**
 * Colour tokens, copied from the Figma "Color" variables (Light / Dark modes).
 * Use these names everywhere; never write a hex value outside theme/.
 */
const light = {
    bg: {page: '#f7f8fa', surface: '#ffffff', subtle: '#f0f2f5', inverse: '#0a0e1a', brand: '#0088ff',
        brandPressed: '#006fd6', brandSubtle: '#ebf5ff', danger: '#e5292b', dangerPressed: '#c81e1e',
        dangerSubtle: '#fef2f2', disabled: '#e4e7ec'},
    text: {primary: '#0b0f19', secondary: '#475467', muted: '#8a94a6', inverse: '#ffffff', brand: '#006fd6',
        onBrand: '#ffffff', danger: '#c81e1e', disabled: '#d0d5dd'},
    border: {default: '#e4e7ec', strong: '#d0d5dd', brand: '#0088ff', focus: '#339fff'},
    icon: {default: '#1d2433', muted: '#8a94a6', brand: '#0088ff', onBrand: '#ffffff', danger: '#e5292b'},
    feedback: {success: '#16a34a', successBg: '#dcfce7', warning: '#92400e', warningBg: '#fef3c7',
        error: '#c81e1e', errorBg: '#fef2f2'},
    alert: {emergency: '#e5292b', robbery: '#e5292b', fire: '#f97316', suspicious: '#f59e0b', medical: '#7c3aed',
        other: '#8a94a6'},
    scrim: 'rgba(10, 14, 26, 0.55)',
};

export type Colors = typeof light;

const dark: Colors = {
    bg: {page: '#0a0e1a', surface: '#11172a', subtle: '#1a2238', inverse: '#ffffff', brand: '#339fff',
        brandPressed: '#0088ff', brandSubtle: '#1a2238', danger: '#e5292b', dangerPressed: '#c81e1e',
        dangerSubtle: '#4a1010', disabled: '#242c44'},
    text: {primary: '#ffffff', secondary: '#d0d5dd', muted: '#8a94a6', inverse: '#0b0f19', brand: '#66b8ff',
        onBrand: '#ffffff', danger: '#f05252', disabled: '#475467'},
    border: {default: '#242c44', strong: '#475467', brand: '#339fff', focus: '#66b8ff'},
    icon: {default: '#ffffff', muted: '#8a94a6', brand: '#339fff', onBrand: '#ffffff', danger: '#f05252'},
    feedback: {success: '#16a34a', successBg: '#0f3d22', warning: '#f59e0b', warningBg: '#1a2238',
        error: '#f05252', errorBg: '#4a1010'},
    alert: {emergency: '#f05252', robbery: '#f05252', fire: '#f97316', suspicious: '#f59e0b', medical: '#7c3aed',
        other: '#8a94a6'},
    scrim: 'rgba(0, 0, 0, 0.6)',
};

export const palettes = {light, dark};
