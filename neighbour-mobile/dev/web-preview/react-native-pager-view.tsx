/** Web-only stand-in for react-native-pager-view (browser preview). Never used on a phone. */
import React, {forwardRef, useImperativeHandle, useRef, useState} from 'react';
import {ScrollView, View} from 'react-native';

const PagerView = forwardRef<any, any>(function PagerView({children, style, onPageSelected, initialPage = 0}, ref) {
    const sv = useRef<ScrollView>(null);
    const [w, setW] = useState(0);
    useImperativeHandle(ref, () => ({setPage: (i: number) => { sv.current?.scrollTo({x: i * w, animated: true}); onPageSelected?.({nativeEvent: {position: i}}); }}));
    return (
        <View style={style} onLayout={e => setW(e.nativeEvent.layout.width)}>
            {w > 0 && <ScrollView ref={sv} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                contentOffset={{x: initialPage * w, y: 0}}
                onMomentumScrollEnd={e => onPageSelected?.({nativeEvent: {position: Math.round(e.nativeEvent.contentOffset.x / w)}})}>
                {React.Children.map(children, c => <View style={{width: w, flex: 1}}>{c}</View>)}
            </ScrollView>}
        </View>
    );
});
export default PagerView;
