import AppText from "@/components/AppText";
import statsApi from "@/api/stats";
import {useEffect, useState} from "react";
import {ActivityIndicator, Dimensions, ScrollView, StyleSheet, View} from "react-native";
import {
    VictoryBar,
    VictoryChart,
    VictoryPie,
    VictoryAxis,
} from "victory-native";

import {VictoryTheme} from "victory";

const {width} = Dimensions.get('window');

const ALERT_COLORS: Record<string, string> = {
    emergency: '#FF4444',
    fire: '#FF8C00',
    medical: '#4CAF50',
    suspicious: '#FF9800',
    other: '#9E9E9E',
};

const SEVERITY_COLORS: Record<string, string> = {
    low: '#4CAF50',
    moderate: '#FF9800',
    high: '#FF5722',
    critical: '#F44336',
};

const StatsSheet = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const res = await statsApi.getNeighbourhoodStats();
            if (res.ok) setStats(res.data);
        } catch (e) {
            console.log('Stats error:', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator color="#1E3A5F"/>
        </View>
    );

    if (!stats) return null;

    const alertTypeData = stats.alerts.by_type.map((item: any) => ({
        x: item.alert_type,
        y: item.count,
        fill: ALERT_COLORS[item.alert_type] ?? '#9E9E9E'
    }));

    const severityData = stats.issues.by_severity.map((item: any) => ({
        x: item.severity,
        y: item.count,
        fill: SEVERITY_COLORS[item.severity] ?? '#9E9E9E'
    }));

    const monthlyData = stats.alerts.by_month.map((item: any) => ({
        x: item.month?.slice(5) ?? '',  // show MM only
        y: item.count
    }));

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 40}}
        >
            {/* ── Header ── */}
            <AppText styles={styles.title}>Neighbourhood Report</AppText>

            {/* ── Summary Cards ── */}
            <View style={styles.cardRow}>
                <StatCard label="Total Alerts" value={stats.alerts.total} color="#FF4444"/>
                <StatCard label="Unresolved" value={stats.alerts.unresolved} color="#FF9800"/>
            </View>
            <View style={styles.cardRow}>
                <StatCard label="Total Issues" value={stats.issues.total} color="#1E3A5F"/>
                <StatCard label="Neighbours" value={stats.neighbours.total} color="#4CAF50"/>
            </View>
            <View style={styles.cardRow}>
                <StatCard label="My Alerts" value={stats.alerts.my_sent} color="#9C27B0"/>
                <StatCard label="My Issues" value={stats.issues.my_reported} color="#2196F3"/>
            </View>

            {/* ── Alerts by Type (Pie) ── */}
            {alertTypeData.length > 0 && (
                <View style={styles.chartCard}>
                    <AppText styles={styles.chartTitle}>Alerts by Type</AppText>
                    <VictoryPie
                        data={alertTypeData}
                        width={width - 48}
                        height={220}
                        colorScale={alertTypeData.map((d: any) => d.fill)}
                        innerRadius={50}
                        labelRadius={80}
                        style={{labels: {fontSize: 10, fill: '#1E3A5F', fontWeight: 'bold'}}}
                        padding={{top: 10, bottom: 10, left: 40, right: 40}}
                    />
                    {/* Legend */}
                    <View style={styles.legend}>
                        {alertTypeData.map((item: any) => (
                            <View key={item.x} style={styles.legendItem}>
                                <View style={[styles.legendDot, {backgroundColor: item.fill}]}/>
                                <AppText styles={styles.legendText}>
                                    {item.x} ({item.y})
                                </AppText>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* ── Monthly Alerts (Bar) ── */}
            {monthlyData.length > 0 && (
                <View style={styles.chartCard}>
                    <AppText styles={styles.chartTitle}>Alerts (Last 6 Months)</AppText>
                    <VictoryChart
                        width={width - 48}
                        height={200}
                        theme={VictoryTheme.material}
                        domainPadding={20}
                        padding={{top: 20, bottom: 40, left: 40, right: 20}}
                    >
                        <VictoryAxis
                            style={{tickLabels: {fontSize: 9, fill: '#666'}}}
                        />
                        <VictoryAxis
                            dependentAxis
                            style={{tickLabels: {fontSize: 9, fill: '#666'}}}
                        />
                        <VictoryBar
                            data={monthlyData}
                            style={{data: {fill: '#1E3A5F', borderRadius: 4}}}
                            animate={{duration: 500}}
                        />
                    </VictoryChart>
                </View>
            )}

            {/* ── Issues by Severity (Bar) ── */}
            {severityData.length > 0 && (
                <View style={styles.chartCard}>
                    <AppText styles={styles.chartTitle}>Issues by Severity</AppText>
                    <VictoryChart
                        width={width - 48}
                        height={200}
                        theme={VictoryTheme.material}
                        domainPadding={20}
                        padding={{top: 20, bottom: 40, left: 40, right: 20}}
                    >
                        <VictoryAxis
                            style={{tickLabels: {fontSize: 10, fill: '#666'}}}
                        />
                        <VictoryAxis
                            dependentAxis
                            style={{tickLabels: {fontSize: 9, fill: '#666'}}}
                        />
                        <VictoryBar
                            data={severityData}
                            style={{
                                data: {
                                    fill: ({datum}: any) =>
                                        SEVERITY_COLORS[datum.x] ?? '#1E3A5F'
                                }
                            }}
                            animate={{duration: 500}}
                        />
                    </VictoryChart>
                </View>
            )}

            {/* ── Issues by Category ── */}
            {stats.issues.by_category.length > 0 && (
                <View style={styles.chartCard}>
                    <AppText styles={styles.chartTitle}>Issues by Category</AppText>
                    <VictoryPie
                        data={stats.issues.by_category.map((item: any) => ({
                            x: item.category,
                            y: item.count
                        }))}
                        width={width - 48}
                        height={200}
                        colorScale={['#1E3A5F', '#5A7FA8']}
                        innerRadius={40}
                        labelRadius={70}
                        style={{labels: {fontSize: 11, fill: '#1E3A5F', fontWeight: 'bold'}}}
                        padding={{top: 10, bottom: 10, left: 40, right: 40}}
                    />
                </View>
            )}

            {/* ── Neighbours Online ── */}
            <View style={styles.chartCard}>
                <AppText styles={styles.chartTitle}>Neighbours Online</AppText>
                <View style={styles.onlineRow}>
                    <View style={styles.onlineStat}>
                        <AppText styles={styles.onlineNumber}>{stats.neighbours.online}</AppText>
                        <AppText styles={styles.onlineLabel}>Online Now</AppText>
                    </View>
                    <View style={styles.onlineDivider}/>
                    <View style={styles.onlineStat}>
                        <AppText styles={styles.onlineNumber}>{stats.neighbours.total}</AppText>
                        <AppText styles={styles.onlineLabel}>Total</AppText>
                    </View>
                    <View style={styles.onlineDivider}/>
                    <View style={styles.onlineStat}>
                        <AppText styles={styles.onlineNumber}>
                            {stats.neighbours.total > 0
                                ? Math.round((stats.neighbours.online / stats.neighbours.total) * 100)
                                : 0}%
                        </AppText>
                        <AppText styles={styles.onlineLabel}>Active</AppText>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

const StatCard = ({label, value, color}: { label: string; value: number; color: string }) => (
    <View style={[styles.statCard, {borderLeftColor: color}]}>
        <AppText styles={[styles.statValue, {color}]}>{value}</AppText>
        <AppText styles={styles.statLabel}>{label}</AppText>
    </View>
);

const styles = StyleSheet.create({
    container: {flex: 1, backgroundColor: '#FFFFFF'},
    loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40},
    title: {fontSize: 18, fontWeight: 'bold', color: '#1E3A5F', padding: 16, paddingBottom: 8},
    cardRow: {flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 12},
    statCard: {
        flex: 1, backgroundColor: '#F0F4F8',
        borderRadius: 12, padding: 16,
        borderLeftWidth: 4,
    },
    statValue: {fontSize: 28, fontWeight: 'bold'},
    statLabel: {fontSize: 12, color: '#64748B', marginTop: 4},
    chartCard: {
        marginHorizontal: 16, marginBottom: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: '#E2EAF4',
    },
    chartTitle: {fontSize: 14, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 8},
    legend: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8},
    legendItem: {flexDirection: 'row', alignItems: 'center', gap: 4},
    legendDot: {width: 10, height: 10, borderRadius: 5},
    legendText: {fontSize: 11, color: '#4A6080'},
    onlineRow: {flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8},
    onlineStat: {alignItems: 'center'},
    onlineNumber: {fontSize: 32, fontWeight: 'bold', color: '#1E3A5F'},
    onlineLabel: {fontSize: 12, color: '#64748B', marginTop: 4},
    onlineDivider: {width: 1, backgroundColor: '#E2EAF4'},
});

export default StatsSheet;