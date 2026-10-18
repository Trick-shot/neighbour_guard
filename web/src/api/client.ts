import Axios from "axios";

// Django serves this app and the API from the same origin (the catch-all route renders index.html,
// the API lives under /api), so a relative base URL is correct on localhost and on the server
// alike — and nothing has to be rebuilt when the domain changes. A hardcoded 127.0.0.1 here meant
// the email-activation page called the *visitor's* own machine and sign-up could never complete.
// VITE_API_URL overrides it for `npm run dev`, which serves this app on its own port.
const apiClient = Axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "/api",
});


export default apiClient;
