import {ScrollView, View} from "react-native";
import {Image} from "expo-image";


const ImageSlider = () => {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{
                flexDirection: "row",
                gap: 4
            }}>
                <Image
                    style={{
                        width: 132,
                        height: 118,
                        borderRadius: 10,
                    }}
                    source="https://picsum.photos/seed/696/3000/2000"
                    contentFit="cover"
                    transition={1000}
                />
                <Image
                    style={{
                        width: 132,
                        height: 118,
                        borderRadius: 10,
                    }}
                    source="https://picsum.photos/seed/696/3000/2000"
                    contentFit="cover"
                    transition={1000}
                />
                <Image
                    style={{
                        width: 132,
                        height: 118,
                        borderRadius: 10,
                    }}
                    source="https://picsum.photos/seed/696/3000/2000"
                    contentFit="cover"
                    transition={1000}
                />
            </View>
        </ScrollView>
    )
}

export default ImageSlider
