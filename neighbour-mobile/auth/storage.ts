import * as SecureStore from 'expo-secure-store';
import {jwtDecode} from 'jwt-decode';

// Tokens live only in SecureStore (Keychain / Keystore), never AsyncStorage.
const accessKey = 'access';
const refreshKey = 'refresh';

const storeToken = async (access: string, refresh: string) => {
    await SecureStore.setItemAsync(accessKey, access);
    await SecureStore.setItemAsync(refreshKey, refresh);
};

const getToken = async () => {
    try {
        return await SecureStore.getItemAsync(accessKey);
    } catch {
        return null;
    }
};

const getRefreshToken = async () => {
    try {
        return await SecureStore.getItemAsync(refreshKey);
    } catch {
        return null;
    }
};

const getUser = async () => {
    const token = await getToken();
    return token ? jwtDecode<{ user_id: number; email: string; full_name: string }>(token) : null;
};

const removeToken = async () => {
    await SecureStore.deleteItemAsync(accessKey);
    await SecureStore.deleteItemAsync(refreshKey);
};

export default {getToken, getRefreshToken, storeToken, getUser, removeToken};
