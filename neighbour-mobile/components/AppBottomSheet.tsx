import BottomSheet from "@gorhom/bottom-sheet";
import {useEffect, useMemo, useRef} from "react";
import {View, Text} from "react-native";
import {useBottomSheet} from "../context/BottomSheetContext";

export default function AppBottomSheet() {
    const ref = useRef<BottomSheet>(null);

    const snapPoints = useMemo(() => ["50%"], []);

    const {isOpen, closeSheet} = useBottomSheet();

    useEffect(() => {
        if (isOpen) {
            ref.current?.expand();
        } else {
            ref.current?.close();
        }
    }, [isOpen]);

    return (
        <BottomSheet
            ref={ref}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose
            onClose={closeSheet}
        >
            <View style={{padding: 20}}>
                <Text>Hello Sheet</Text>
            </View>
        </BottomSheet>
    );
}