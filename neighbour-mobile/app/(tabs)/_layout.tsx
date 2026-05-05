import {Tabs} from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{headerShown: false}}>
            <Tabs.Screen
                name="home"
                options={{
                    title: "Home",
                    tabBarIcon: ({color}) => <MaterialIcons size={28} name="home" color={color}/>
                }}
            />
            <Tabs.Screen
                name="messages/index"
                options={{
                    title: "Messages",
                    tabBarIcon: ({color}) => <MaterialIcons size={28} name="message" color={color}/>
                }}
            />
            <Tabs.Screen
                name="reports/index"
                options={{
                    title: "Reports",
                    tabBarIcon: ({color}) => <MaterialIcons size={28} name="report" color={color}/>
                }}
            />
            <Tabs.Screen
                name="profile/index"
                options={{
                    title: "Profile",
                    tabBarIcon: ({color}) => <MaterialIcons size={28} name="person" color={color}/>
                }}
            />
        </Tabs>
    );
}