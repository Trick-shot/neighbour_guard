import {create} from 'apisauce';
import {Platform} from 'react-native';
import authStorage from "../auth/storage";


const baseURL = Platform.OS === 'ios'
    // ? 'http://10.0.2.2:8000'
    ? 'http://192.168.1.4:8000'
    : 'http://192.168.1.4:8000';

const apiClient = create({baseURL});


apiClient.addAsyncRequestTransform(async (request) => {
    const authToken = await authStorage.getToken();
    if (!authToken) return;
    request.headers = request.headers || {};
    request.headers['Authorization'] = `JWT ${authToken}`;
})


export default apiClient;