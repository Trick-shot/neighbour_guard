import {Text, View, StyleSheet} from "react-native";
import Login from "./Authentication/Login"

export default function Index() {
    return (
        <Login/>
    );
}

const style = StyleSheet.create({
    container: {
        backgroundColor: "blue",
        width: "100%",
        height: "100%"
    }
})