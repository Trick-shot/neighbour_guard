import {Stack} from 'expo-router';

/**
 * The Issues tab is a stack (list → detail → report). Without this file the folder's screens were
 * three separate routes and none of them was named `issues`, so the tab bar had no Issues tab.
 */
export default function IssuesLayout() {
    return <Stack screenOptions={{headerShown: false}}/>;
}
