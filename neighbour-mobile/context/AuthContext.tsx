import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import * as SecureStore from "expo-secure-store";

interface AuthContextType {
    email: string;
    setEmail: (email: string) => void;

    isAuthenticated: boolean;
    isReady: boolean;

    login: (
        access: string,
        refresh: string
    ) => Promise<void>;

    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    email: "",
    setEmail: () => {
    },

    isAuthenticated: false,
    isReady: false,

    login: async () => {
    },
    logout: async () => {
    },
});

export const AuthProvider = ({
                                 children,
                             }: {
    children: React.ReactNode;
}) => {
    const [email, setEmail] = useState("");

    const [isAuthenticated, setIsAuthenticated] =
        useState(false);

    const [isReady, setIsReady] = useState(false);

    // restore auth state on startup
    useEffect(() => {
        restoreAuth();
    }, []);

    const restoreAuth = async () => {
        try {
            const access =
                await SecureStore.getItemAsync("access");

            const refresh =
                await SecureStore.getItemAsync("refresh");

            if (access && refresh) {
                setIsAuthenticated(true);
            }
        } catch (e) {
            console.error("Restore auth error:", e);
        } finally {
            setIsReady(true);
        }
    };

    const login = async (
        access: string,
        refresh: string
    ) => {
        try {
            await SecureStore.setItemAsync(
                "access",
                access
            );

            await SecureStore.setItemAsync(
                "refresh",
                refresh
            );

            setIsAuthenticated(true);
        } catch (e) {
            console.error("Login error:", e);
        }
    };

    const logout = async () => {
        try {
            await SecureStore.deleteItemAsync("access");

            await SecureStore.deleteItemAsync("refresh");

            setIsAuthenticated(false);

            setEmail("");

            console.log("Logged out successfully");
        } catch (e) {
            console.error("Logout error:", e);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                email,
                setEmail,

                isAuthenticated,
                isReady,

                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);