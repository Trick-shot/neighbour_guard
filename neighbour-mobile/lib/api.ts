/**
 * One HTTP client for the whole app.
 * - Adds the access token to every request.
 * - On a 401, refreshes the token once (shared by all requests that failed together) and retries.
 * - Logs out only if the refresh itself fails.
 */
import {ApiResponse, create} from 'apisauce';

import authStorage from '@/auth/storage';

export const api = create({baseURL: process.env.EXPO_PUBLIC_API_URL, timeout: 15000});

let onLoggedOut: (() => void) | null = null;
export const setOnLoggedOut = (fn: () => void) => {
    onLoggedOut = fn;
};

api.addAsyncRequestTransform(async (request) => {
    const token = await authStorage.getToken();
    if (!token) return;
    request.headers = request.headers || {};
    if (!request.headers['Authorization']) request.headers['Authorization'] = `JWT ${token}`;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
    const refresh = await authStorage.getRefreshToken();
    if (!refresh) return null;
    const res = await create({baseURL: process.env.EXPO_PUBLIC_API_URL}).post<{ access: string }>(
        '/api/auth/jwt/refresh/', {refresh},
    );
    if (!res.ok || !res.data?.access) return null;
    await authStorage.storeToken(res.data.access, refresh);
    return res.data.access;
}

api.axiosInstance.interceptors.response.use(undefined, async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original?._retried || original?.url?.includes('/jwt/')) {
        throw error;
    }
    original._retried = true;
    refreshing = refreshing ?? refreshAccessToken().finally(() => (refreshing = null));
    const token = await refreshing;
    if (!token) {
        await authStorage.removeToken();
        onLoggedOut?.();
        throw error;
    }
    original.headers['Authorization'] = `JWT ${token}`;
    return api.axiosInstance(original);
});

/** Unwraps an apisauce response or throws an Error with the server's message. */
export async function call<T>(promise: Promise<ApiResponse<T>>): Promise<T> {
    const res = await promise;
    if (res.ok) return res.data as T;
    const body = res.data as any;
    const message = body?.detail || body?.error || (res.problem === 'NETWORK_ERROR' ? 'No connection' : 'Something went wrong');
    const err = new Error(message) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = body?.code;
    throw err;
}
