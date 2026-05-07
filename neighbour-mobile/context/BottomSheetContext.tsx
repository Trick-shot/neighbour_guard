import React, {createContext, useContext, useState} from "react";

type BottomSheetContextType = {
    isOpen: boolean;
    openSheet: () => void;
    closeSheet: () => void;
};

const BottomSheetContext = createContext<BottomSheetContextType | null>(null);

export const BottomSheetProvider = ({
                                        children,
                                    }: {
    children: React.ReactNode;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <BottomSheetContext.Provider
            value={{
                isOpen,
                openSheet: () => setIsOpen(true),
                closeSheet: () => setIsOpen(false),
            }}
        >
            {children}
        </BottomSheetContext.Provider>
    );
};

export const useBottomSheet = () => {
    const context = useContext(BottomSheetContext);

    if (!context) {
        throw new Error("useBottomSheet must be used inside provider");
    }

    return context;
};