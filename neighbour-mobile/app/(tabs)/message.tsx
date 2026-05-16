import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import FilterButton from "@/components/message/FilterButton";
import MessageChat from "@/components/message/MessageChat";
import NewChatModal from "@/components/message/NewChatModal";
import {useState} from "react";
import {StatusBar, StyleSheet, TouchableOpacity, View} from "react-native";
import SearchIcon from "@/assets/icons/Search.svg";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const filterButton = ["All", "Group"];

const Message = () => {
    const [activeFilter, setActiveFilter] = useState(0);
    const [showNewChat, setShowNewChat] = useState(false);

    return (
        <AppScreen>
            <StatusBar barStyle="dark-content"/>
            <View style={{flexDirection: "row", alignItems: "center", justifyContent: "space-between"}}>
                <AppText styles={{fontSize: 24, fontWeight: "bold"}}>Messages</AppText>
                <View style={{flexDirection: 'row', gap: 16}}>
                    <TouchableOpacity>
                        <SearchIcon width={24}/>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowNewChat(true)}>
                        <MaterialIcons name="edit" size={24} color="white"/>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={{flexDirection: 'row', marginTop: 24, gap: 10}}>
                {filterButton.map((value, index) => (
                    <FilterButton
                        active={index === activeFilter}
                        buttonText={value}
                        onPress={() => setActiveFilter(index)}
                        key={index}
                    />
                ))}
            </View>
            <MessageChat filterIndex={activeFilter}/>
            <NewChatModal visible={showNewChat} onClose={() => setShowNewChat(false)}/>
        </AppScreen>
    );
};

export default Message;