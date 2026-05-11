import * as SecureStore from 'expo-secure-store';
import {jwtDecode} from "jwt-decode";

const accessKey = "access";
const refreshKey = "refresh";

const storeToken = async (access: string, refresh: string) => {
    try {
        await SecureStore.setItemAsync(accessKey, access);
        await SecureStore.setItemAsync(refreshKey, refresh);
    } catch (error) {
        console.log("Error storing the auth token", error);
    }
}

const getToken = async () => {
    try {
        return await SecureStore.getItemAsync(accessKey);  // ← reads 'access'
    } catch (error) {
        console.log("Error getting the auth token", error);
    }
}

const getUser = async () => {
    const token = await getToken();
    return token ? jwtDecode(token) : null;
}

const removeToken = async () => {
    try {
        await SecureStore.deleteItemAsync(accessKey);
        await SecureStore.deleteItemAsync(refreshKey);
    } catch (error) {
        console.log("Error removing the auth token", error);
    }
}

export default {getToken, storeToken, getUser, removeToken}