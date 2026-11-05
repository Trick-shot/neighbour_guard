/**
 * Web-only stand-in for react-native-maps, used by `npm run preview` so screens can be checked
 * in a browser against the Figma frames. Never bundled into the phone app (metro.config.js maps
 * it in for platform "web" only). Markers are placed with a flat projection of the region.
 */
import React, {createContext, forwardRef, useContext, useImperativeHandle, useState} from 'react';
import {View} from 'react-native';

type Region = {latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number};
const Ctx = createContext<{region: Region; w: number; h: number} | null>(null);

const project = (c: {latitude: number; longitude: number}, r: Region, w: number, h: number) => ({
    left: ((c.longitude - r.longitude) / r.longitudeDelta + 0.5) * w,
    top: (0.5 - (c.latitude - r.latitude) / r.latitudeDelta) * h,
});

const MapView = forwardRef<any, any>(function MapView(props, ref) {
    const {style, initialRegion, region, children, onMapReady} = props;
    const r: Region = region ?? initialRegion ?? {latitude: -6.748, longitude: 39.2797, latitudeDelta: 0.01, longitudeDelta: 0.01};
    const [size, setSize] = useState({w: 0, h: 0});
    useImperativeHandle(ref, () => ({animateToRegion: () => undefined, animateCamera: () => undefined, fitToCoordinates: () => undefined}));
    React.useEffect(() => { onMapReady?.(); }, []);
    return (
        <View style={[{backgroundColor: props.mapType === 'satellite' ? '#5b6b4f' : '#eef0ea', overflow: 'hidden'}, style]}
              onLayout={e => setSize({w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height})}>
            <Ctx.Provider value={{region: r, w: size.w, h: size.h}}>{size.w > 0 ? children : null}</Ctx.Provider>
        </View>
    );
});

export function Marker({coordinate, children, anchor}: any) {
    const ctx = useContext(Ctx);
    const [s, setS] = useState({w: 0, h: 0});
    if (!ctx || !coordinate) return null;
    const p = project(coordinate, ctx.region, ctx.w, ctx.h);
    const a = anchor ?? {x: 0.5, y: 1};
    return (
        <View style={{position: 'absolute', left: p.left - s.w * a.x, top: p.top - s.h * a.y}}
              onLayout={e => setS({w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height})}>
            {children ?? <View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: '#e5292b'}}/>}
        </View>
    );
}

export function Circle({center, radius, fillColor, strokeColor, strokeWidth}: any) {
    const ctx = useContext(Ctx);
    if (!ctx || !center) return null;
    const p = project(center, ctx.region, ctx.w, ctx.h);
    const px = (radius / 111000 / ctx.region.latitudeDelta) * ctx.h;
    return <View pointerEvents="none" style={{position: 'absolute', left: p.left - px, top: p.top - px, width: px * 2,
        height: px * 2, borderRadius: px, backgroundColor: fillColor, borderColor: strokeColor, borderWidth: strokeWidth ?? 0}}/>;
}

export const Polyline = () => null;
export const Polygon = () => null;
export const Callout = () => null;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = undefined;
export type {Region};
export default MapView;
