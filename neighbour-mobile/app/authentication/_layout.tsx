import {Stack} from 'expo-router';

// The AuthProvider lives once, in app/_layout.tsx. A second provider here used to hide the
// signed-in state from the rest of the app.
export default function AuthLayout() {
    return <Stack screenOptions={{headerShown: false}}/>;
}
