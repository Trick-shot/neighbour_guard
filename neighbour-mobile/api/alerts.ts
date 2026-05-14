// api/alerts.ts
import apiClient from "./client";

const sendAlert = (alert_type: string, message: string) =>
    apiClient.post("/api/main/alerts/send/", {alert_type, message});

const getAlerts = () =>
    apiClient.get("/api/main/alerts/");

const resolveAlert = (alertId: number) =>
    apiClient.patch(`/api/main/alerts/${alertId}/resolve/`);

const savePushToken = (token: string) =>
    apiClient.post("/api/main/users/push-token/", {token});

export default {sendAlert, getAlerts, resolveAlert, savePushToken};