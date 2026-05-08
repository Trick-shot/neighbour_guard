import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import FilterButton from "@/components/message/FilterButton";
import MessageChat from "@/components/message/MessageChat";
import {useState} from "react";
import {StatusBar, StyleSheet, TouchableOpacity, View} from "react-native";
import SearchIcon from "@/assets/icons/Search.svg"

const filterButton = ["All", "Group"];

const Message = () => {
    const [activeFilter, setActiveFilter] = useState(0);
    return (
        <AppScreen>
            <StatusBar barStyle="dark-content"/>
            <View style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between"
            }}>
                <AppText styles={{
                    fontSize: 24,
                    fontWeight: "bold"
                }}>Messages</AppText>
                <TouchableOpacity>
                    <SearchIcon width={24}/>
                </TouchableOpacity>
            </View>
            <View style={{
                flexDirection: 'row',
                marginTop: 24,
                gap: 10
            }}>
                {
                    filterButton.map((value, index) => <FilterButton active={index === activeFilter}
                                                                     buttonText={value}
                                                                     onPress={() => setActiveFilter(index)}
                                                                     key={index}/>
                    )
                }
            </View>
            <MessageChat/>
        </AppScreen>
    )
}

const styles = StyleSheet.create({})

export default Message;