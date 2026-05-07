import AppBottomSheet from "@/components/AppBottomSheet";
import {Tabs} from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {useBottomSheet} from "../../context/BottomSheetContext";


export default function TabLayout() {
    const {isOpen} = useBottomSheet();

    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarStyle: {
                display: isOpen ? "none" : "flex",
            }
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({color}) => <MaterialIcons size={28} name="home" color={color}/>
                }}
            />
            <Tabs.Screen
                name="message"
                options={{
                    title: "Messages",
                    tabBarIcon: ({color}) => <MaterialIcons size={28} name="message" color={color}/>
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: "Reports",
                    tabBarIcon: ({color}) => <MaterialIcons size={28} name="report" color={color}/>
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({color}) => <MaterialIcons size={28} name="person" color={color}/>
                }}
            />
        </Tabs>

    );
}