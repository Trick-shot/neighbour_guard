import * as Crypto from 'expo-crypto';

/** A UUID made on the phone. Used as client_id so retries never create duplicates. */
export const newClientId = () => Crypto.randomUUID();
