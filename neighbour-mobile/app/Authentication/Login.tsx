import AppScreen from "@/components/AppScreen";
import {Text, StyleSheet} from "react-native";

const Login = () => {
    return(
      <AppScreen screenStyle={style.screenStyle}>
          <Text >Welcome,</Text>
      </AppScreen>
    )
}

const style = StyleSheet.create({
    screenStyle: {
        flex:1,
        backgroundColor:"#fff"
    }
})

export default Login;