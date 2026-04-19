import React from "react";

type AuthContextType = {
    user: any; // or better: User | null
    setUser: (user: any) => void;
};

export const AuthContext = React.createContext<AuthContextType>({
    user: null,
    setUser: () => {
    },
});

