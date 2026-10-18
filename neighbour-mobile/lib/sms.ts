/**
 * The SMS fallback's two constants.
 *
 * Both are compiled in rather than fetched: the moment this is needed is the moment there is no
 * network. `EXPO_PUBLIC_SOS_SHORTCODE` must match the Africa's Talking number whose inbound
 * callback points at `POST /api/v2/sms/inbound/` (see docs/DEPLOY.md).
 */
export const SOS_SHORTCODE = process.env.EXPO_PUBLIC_SOS_SHORTCODE ?? '';

/** The 8-character code the server matches against `Alert.sms_ref` (`Alert.ref_for` in Python). */
export const smsRef = (clientId: string) => clientId.replace(/-/g, '').slice(0, 8).toLowerCase();
