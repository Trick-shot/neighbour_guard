import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import {useState} from "react";
import {StyleSheet} from "react-native";
import SegmentedControl from '@react-native-segmented-control/segmented-control';


const Index = () => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    return (
        <AppScreen screenStyle={styles.screen}>
            <AppText styles={{
                textAlign: "center",
                fontWeight: "500",
                fontSize: 17
            }}>
                Issues
            </AppText>
            <SegmentedControl
                style={{
                    marginTop: 20
                }}
                values={['Community', 'Neighbours']}
                selectedIndex={selectedIndex}
                onChange={(event) => {
                    setSelectedIndex(event.nativeEvent.selectedSegmentIndex);
                }}
            />
        </AppScreen>
    )
}

const styles = StyleSheet.create({
    screen: {}
})
export default Index;