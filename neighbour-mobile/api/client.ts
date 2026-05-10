import {create} from 'apisauce';
import authStorage from "../auth/storage";
import {Platform} from 'react-native';


const baseURL = Platform.OS === 'ios'
    // ? 'http://10.0.2.2:8000'
    ? 'http://192.168.1.9:8000'
    : 'http://127.0.0.1:8000';

const apiClient = create({baseURL});


apiClient.addAsyncRequestTransform(async (request) => {
    const authToken = await authStorage.getToken();
    if (!authToken) return;

    request.headers = request.headers || {};
    request.headers['Authorization'] = `JWT ${authToken}`;
})


export default apiClient;