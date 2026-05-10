import {createContext, useContext, useState} from "react";

interface AuthContextType {
    email: string;
    setEmail: (email: string) => void;
}

const AuthContext = createContext<AuthContextType>({
    email: '',
    setEmail: () => {
    },
});

export const AuthProvider = ({children}: { children: React.ReactNode }) => {
    const [email, setEmail] = useState('');

    return (
        <AuthContext.Provider value={{email, setEmail}}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);