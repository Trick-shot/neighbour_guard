import {Tabs} from 'expo-router';

import TabBarSOS from '@/components/ui/TabBarSOS';

/** Four tabs with SOS docked in the centre (Figma "Tab bar · SOS dock"). */
export default function TabLayout() {
    return (
        <Tabs screenOptions={{headerShown: false}} tabBar={(props) => <TabBarSOS {...props}/>}>
            <Tabs.Screen name="index" options={{title: 'Home'}}/>
            <Tabs.Screen name="message" options={{title: 'Messages'}}/>
            <Tabs.Screen name="reports" options={{title: 'Issues'}}/>
            <Tabs.Screen name="profile" options={{title: 'Profile'}}/>
        </Tabs>
    );
}
