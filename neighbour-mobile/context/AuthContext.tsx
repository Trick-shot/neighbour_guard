import {createContext, useContext, useState} from "react";
import * as SecureStore from 'expo-secure-store';

interface AuthContextType {
    email: string;
    setEmail: (email: string) => void;
    isAuthenticated: boolean;
    login: (access: string, refresh: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    email: '',
    setEmail: () => {
    },
    isAuthenticated: false,
    login: async () => {
    },
    logout: async () => {
    },
});

export const AuthProvider = ({children}: { children: React.ReactNode }) => {
    const [email, setEmail] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const login = async (access: string, refresh: string) => {
        await SecureStore.setItemAsync('access', access);
        await SecureStore.setItemAsync('refresh', refresh);
        setIsAuthenticated(true);
    }

    const logout = async () => {
        await SecureStore.deleteItemAsync('access');
        await SecureStore.deleteItemAsync('refresh');
        setIsAuthenticated(false);
    }

    return (
        <AuthContext.Provider value={{
            email,
            setEmail,
            isAuthenticated,
            login,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);