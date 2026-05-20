import {create} from 'apisauce';
import authStorage from "../auth/storage";


const baseURL = process.env.EXPO_PUBLIC_API_URL

const apiClient = create({baseURL});


apiClient.addAsyncRequestTransform(async (request) => {
    const authToken = await authStorage.getToken();
    if (!authToken) return;
    request.headers = request.headers || {};
    request.headers['Authorization'] = `JWT ${authToken}`;
})


export default apiClient;