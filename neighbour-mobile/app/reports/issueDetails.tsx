import BackIcon from "@/assets/icons/backIcon.svg";
import AppScreen from "@/components/AppScreen";
import AppText from "@/components/AppText";
import LoadingScreen from "@/components/LoadingScreen";
import {Image} from "expo-image";
import {useLocalSearchParams, useRouter} from "expo-router";
import {useEffect, useRef, useState} from "react";
import {
    View, StyleSheet, TouchableOpacity,
    ScrollView, TextInput, Alert, Modal,
    Dimensions, KeyboardAvoidingView, Platform, FlatList
} from "react-native";
import colors from "@/utils/config";
import LocationIcon from "@/assets/icons/LocationIcon.svg"
import ClockIcon from "@/assets/icons/Clock.svg"
import issuesApi from "@/api/issues";

const {width} = Dimensions.get('window')

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

const formatDate = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return `${Math.floor(diff / 604800)}W ago`
}

const IssueDetails = () => {
    const router = useRouter()
    const {id} = useLocalSearchParams<{ id: string }>()
    const [issue, setIssue] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [showAllMedia, setShowAllMedia] = useState(false)
    const commentRef = useRef<TextInput>(null)

    useEffect(() => {
        fetchIssue()
    }, [])

    const fetchIssue = async () => {
        try {
            setLoading(true)
            const res = await issuesApi.getIssue(Number(id))
            setIssue(res.data)
        } catch (e) {
            console.log(e)
        } finally {
            setLoading(false)
        }
    }

    const handleComment = async () => {
        if (!comment.trim()) return
        try {
            setSubmitting(true)
            await issuesApi.addComment(Number(id), comment)
            setComment('')
            fetchIssue()
        } catch (e) {
            Alert.alert('Error', 'Failed to add comment')
        } finally {
            setSubmitting(false)
        }
    }

    const handleLike = async (commentId: number) => {
        try {
            await issuesApi.likeComment(Number(id), commentId)
            fetchIssue()
        } catch (e) {
            console.log(e)
        }
    }

    if (loading) return <LoadingScreen/>
    if (!issue) return null

    const distance = issue.location && issue.residence?.location
        ? getDistance(
            issue.residence.location.latitude,
            issue.residence.location.longitude,
            issue.location.latitude,
            issue.location.longitude
        ) : null

    const severityColor = getSeverityColor(issue.severity)
    const mediaToShow = showAllMedia ? issue.media : issue.media?.slice(0, 3)

    return (
        <KeyboardAvoidingView
            style={{flex: 1}}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <AppScreen screenStyle={{paddingBottom: 0}}>
                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <BackIcon/>
                        </TouchableOpacity>
                        <AppText styles={{fontSize: 16, fontWeight: "bold"}}>
                            Issue Detail
                        </AppText>
                        <View style={{width: 24}}/>
                    </View>

                    {/* Severity */}
                    <View style={[styles.badge, {borderColor: severityColor}]}>
                        <AppText styles={{
                            fontSize: 10,
                            fontWeight: "bold",
                            color: severityColor,
                            textTransform: 'capitalize'
                        }}>
                            {issue.severity}
                        </AppText>
                    </View>

                    {/* Title */}
                    <AppText styles={{marginTop: 20, fontWeight: "500", fontSize: 20, lineHeight: 28}}>
                        {issue.title}
                    </AppText>

                    {/* Posted by */}
                    <View style={styles.postedBy}>
                        <View style={styles.avatar}>
                            <AppText styles={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>
                                {issue.created_by?.full_name?.[0]?.toUpperCase() ?? 'U'}
                            </AppText>
                        </View>
                        <View style={{flex: 1}}>
                            <AppText styles={{fontSize: 13, fontWeight: '500'}}>
                                {issue.created_by?.full_name ?? 'Unknown'}
                            </AppText>
                            <AppText styles={{fontSize: 11, color: '#A5A5A5'}}>
                                Posted {formatDate(issue.created_at)}
                            </AppText>
                        </View>
                        <View style={[styles.categoryBadge, {
                            backgroundColor: issue.category === 'community'
                                ? '#E8F5E9'
                                : '#E3F2FD'
                        }]}>
                            <AppText styles={{
                                fontSize: 10,
                                color: issue.category === 'community' ? '#2E7D32' : '#1565C0',
                                textTransform: 'capitalize'
                            }}>
                                {issue.category}
                            </AppText>
                        </View>
                    </View>

                    {/* Distance & Time */}
                    <View style={{marginTop: 28, flexDirection: "row", alignItems: "center", gap: 22}}>
                        <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
                            <LocationIcon/>
                            <AppText styles={{fontSize: 12, color: colors.TGrey60}}>
                                {distance ? `${distance}km away` : 'Location not set'}
                            </AppText>
                        </View>
                        <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
                            <ClockIcon/>
                            <AppText styles={{fontSize: 12, color: colors.TGrey60}}>
                                {new Date(issue.created_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </AppText>
                        </View>
                    </View>

                    {/* Description */}
                    <View style={{gap: 12, marginTop: 21}}>
                        <AppText styles={{fontWeight: "500", fontSize: 16}}>Description</AppText>
                        <AppText styles={{
                            fontSize: 14,
                            color: colors.TGrey60,
                            lineHeight: 22,
                        }}>
                            {issue.description}
                        </AppText>
                    </View>

                    {/* Media */}
                    {issue.media?.length > 0 && (
                        <View style={{marginTop: 32, gap: 16}}>
                            <View style={{flexDirection: "row", justifyContent: "space-between"}}>
                                <AppText styles={{fontSize: 16, fontWeight: "500"}}>
                                    Media ({issue.media.length})
                                </AppText>
                                {issue.media.length > 3 && (
                                    <TouchableOpacity onPress={() => setShowAllMedia(!showAllMedia)}>
                                        <AppText styles={{
                                            fontSize: 14,
                                            color: colors.primaryLight,
                                            textDecorationLine: "underline"
                                        }}>
                                            {showAllMedia ? 'show less' : 'see more'}
                                        </AppText>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View style={styles.mediaGrid}>
                                {mediaToShow.map((item: any, index: number) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.mediaItem}
                                        onPress={() => setSelectedImage(item.image)}
                                    >
                                        <Image
                                            source={item.image}
                                            style={{width: '100%', height: '100%', borderRadius: 12}}
                                            contentFit="cover"
                                        />
                                        {index === 2 && !showAllMedia && issue.media.length > 3 && (
                                            <View style={styles.moreOverlay}>
                                                <AppText styles={{
                                                    color: '#fff',
                                                    fontSize: 18,
                                                    fontWeight: 'bold'
                                                }}>
                                                    +{issue.media.length - 3}
                                                </AppText>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Comments */}
                    <View style={{marginTop: 32, marginBottom: 16}}>
                        <AppText styles={{fontWeight: "500", fontSize: 16}}>
                            Comments ({issue.comments?.length ?? 0})
                        </AppText>

                        {issue.comments?.length === 0 && (
                            <AppText styles={{
                                color: '#A5A5A5',
                                fontSize: 13,
                                marginTop: 12,
                                textAlign: 'center'
                            }}>
                                No comments yet. Be the first!
                            </AppText>
                        )}

                        {issue.comments?.map((item: any) => (
                            <View key={item.id} style={styles.commentCard}>
                                <View style={{flexDirection: 'row', gap: 12}}>
                                    <View style={styles.commentAvatar}>
                                        <AppText styles={{
                                            color: '#fff',
                                            fontWeight: 'bold',
                                            fontSize: 12
                                        }}>
                                            {item.user?.full_name?.[0]?.toUpperCase() ?? 'U'}
                                        </AppText>
                                    </View>
                                    <View style={{flex: 1}}>
                                        <View style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
                                                <AppText styles={{fontWeight: '600', fontSize: 13}}>
                                                    {item.user?.full_name ?? 'Unknown'}
                                                </AppText>
                                                <AppText styles={{fontSize: 11, color: '#A5A5A5'}}>
                                                    {formatDate(item.created_at)}
                                                </AppText>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => handleLike(item.id)}
                                                style={{alignItems: 'center', gap: 2}}
                                            >
                                                <AppText styles={{
                                                    fontSize: 18,
                                                    color: item.is_liked ? 'red' : '#D0D0D0'
                                                }}>
                                                    ♥
                                                </AppText>
                                                {item.likes_count > 0 && (
                                                    <AppText styles={{fontSize: 10, color: '#A5A5A5'}}>
                                                        {item.likes_count}
                                                    </AppText>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                        <AppText styles={{fontSize: 13, marginTop: 4, lineHeight: 18}}>
                                            {item.comment}
                                        </AppText>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setComment(`@${item.user?.full_name} `)
                                                commentRef.current?.focus()
                                            }}
                                        >
                                            <AppText styles={{fontSize: 11, color: '#A5A5A5', marginTop: 4}}>
                                                Reply
                                            </AppText>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>

                {/* Comment Input */}
                <View style={styles.commentInput}>
                    <TextInput
                        ref={commentRef}
                        style={{flex: 1, fontSize: 14, paddingVertical: 8}}
                        placeholder="Add a comment..."
                        placeholderTextColor="#A5A5A5"
                        value={comment}
                        onChangeText={setComment}
                        multiline
                    />
                    <TouchableOpacity
                        onPress={handleComment}
                        disabled={!comment.trim() || submitting}
                        style={[
                            styles.sendButton,
                            (!comment.trim() || submitting) && {opacity: 0.4}
                        ]}
                    >
                        <AppText styles={{color: '#fff', fontSize: 13, fontWeight: '600'}}>
                            {submitting ? '...' : 'Send'}
                        </AppText>
                    </TouchableOpacity>
                </View>

                {/* Full Screen Image Modal */}
                <Modal visible={!!selectedImage} transparent animationType="fade">
                    <View style={styles.modal}>
                        <TouchableOpacity
                            style={styles.modalClose}
                            onPress={() => setSelectedImage(null)}
                        >
                            <AppText styles={{color: '#fff', fontSize: 18}}>✕</AppText>
                        </TouchableOpacity>
                        {selectedImage && (
                            <Image
                                source={selectedImage}
                                style={{width: '100%', height: '70%'}}
                                contentFit="contain"
                            />
                        )}
                    </View>
                </Modal>
            </AppScreen>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    screen: {},
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: 'space-between',
        marginBottom: 8
    },
    badge: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 5,
        borderWidth: 1,
        alignSelf: 'flex-start',
        marginTop: 22
    },
    postedBy: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 16,
        padding: 12,
        backgroundColor: '#F9F9F9',
        borderRadius: 12
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center'
    },
    categoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20
    },
    mediaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    mediaItem: {
        width: (width - 48) / 3,
        height: (width - 48) / 3,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative'
    },
    moreOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12
    },
    commentCard: {
        marginTop: 16,
        paddingBottom: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F0F0F0'
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center'
    },
    commentInput: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 0.5,
        borderTopColor: '#E0E0E0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#fff',
        gap: 8
    },
    sendButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20
    },
    modal: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalClose: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 10,
        padding: 8
    }
})

export default IssueDetails;