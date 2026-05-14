import AppText from "@/components/AppText";
import colors from "@/utils/config";
import {TouchableOpacity, View} from "react-native";

interface IssueCardProps {
    onPress?: () => void
    issue: {
        id: number
        title: string
        severity: string
        created_at: string
        location?: {
            latitude: number
            longitude: number
        }
        residence?: {
            location?: {
                latitude: number
                longitude: number
            }
        }
    }
}

const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'low':
            return '#4CAF50'
        case 'moderate':
            return '#4CAF50'
        case 'high':
            return '#FF9800'
        case 'critical':
            return '#F44336'
        default:
            return colors.primary
    }
}

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)
}

const IssuesCard = ({onPress, issue}: IssueCardProps) => {
    const severityColor = getSeverityColor(issue.severity)

    const distance = issue.location && issue.residence?.location
        ? getDistance(
            issue.residence.location.latitude,
            issue.residence.location.longitude,
            issue.location.latitude,
            issue.location.longitude
        ) : null

    const time = new Date(issue.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    })

    return (
        <TouchableOpacity onPress={onPress} style={{
            width: "100%",
            flexDirection: "row",
            paddingHorizontal: 16,
            alignItems: "center",
            gap: 15,
            backgroundColor: "rgba(233,233,233,0.2)",
            borderRadius: 11
        }}>
            <AppText styles={{fontSize: 8, color: '#A5A5A5'}}>{time}</AppText>
            <View style={{flexDirection: "row", gap: 15}}>
                <View style={{
                    height: 75,
                    backgroundColor: severityColor,
                    width: 3,
                    borderRadius: 6
                }}/>
                <View style={{padding: 8, justifyContent: "space-between"}}>
                    <AppText styles={{
                        fontSize: 10,
                        color: severityColor,
                        textTransform: 'capitalize'
                    }}>
                        {issue.severity}
                    </AppText>
                    <AppText styles={{fontSize: 14, fontWeight: "bold"}}>
                        {issue.title}
                    </AppText>
                    <AppText styles={{fontSize: 10, color: '#A5A5A5'}}>
                        {distance ? `Distance ${distance}km` : 'Location not set'}
                    </AppText>
                </View>
            </View>
        </TouchableOpacity>
    )
}

export default IssuesCard;