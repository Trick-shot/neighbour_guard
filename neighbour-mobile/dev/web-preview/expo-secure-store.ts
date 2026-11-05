/** Web-only stand-in for expo-secure-store (browser preview). Never used on a phone. */
const ls = () => (globalThis as any).localStorage as Storage;
export const getItemAsync = async (k: string) => ls().getItem(k);
export const setItemAsync = async (k: string, v: string) => ls().setItem(k, v);
export const deleteItemAsync = async (k: string) => ls().removeItem(k);
