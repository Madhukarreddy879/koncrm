import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../services/ApiService';

interface UserStats {
  today_calls: number;
  week_calls: number;
  total_leads: number;
  contacted_leads: number;
  interested_leads: number;
  enrolled_leads: number;
  conversion_rate: number;
}

export default function StatsScreen() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = async (refresh: boolean = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError('');

      const response = await apiClient.get<{ data: UserStats }>('/me/stats');
      setStats(response.data.data);
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError('Failed to load statistics. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStats(true);
    }, [])
  );

  const handleRefresh = () => {
    fetchStats(true);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>📊</Text>
        <Text style={styles.errorTitle}>Unable to Load Stats</Text>
        <Text style={styles.errorText}>{error || 'No data available'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={['#3b82f6']}
          tintColor="#3b82f6"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Performance</Text>
        <Text style={styles.headerSubtitle}>Track your progress and achievements</Text>
      </View>

      {/* Call Activity Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📞 Call Activity</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statValue}>{stats.today_calls}</Text>
            <Text style={styles.statLabel}>Today's Calls</Text>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>📱</Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.statCardSecondary]}>
            <Text style={styles.statValue}>{stats.week_calls}</Text>
            <Text style={styles.statLabel}>This Week</Text>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>📅</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Lead Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 Lead Management</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardInfo]}>
            <Text style={styles.statValue}>{stats.total_leads}</Text>
            <Text style={styles.statLabel}>Total Leads</Text>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>📋</Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.statCardWarning]}>
            <Text style={styles.statValue}>{stats.contacted_leads}</Text>
            <Text style={styles.statLabel}>Contacted</Text>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>✉️</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardSuccess]}>
            <Text style={styles.statValue}>{stats.interested_leads}</Text>
            <Text style={styles.statLabel}>Interested</Text>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>⭐</Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.statCardEnrolled]}>
            <Text style={styles.statValue}>{stats.enrolled_leads}</Text>
            <Text style={styles.statLabel}>Enrolled</Text>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>🎓</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Conversion Rate Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Conversion Rate</Text>
        <View style={styles.conversionCard}>
          <View style={styles.conversionContent}>
            <Text style={styles.conversionValue}>
              {stats.conversion_rate.toFixed(1)}%
            </Text>
            <Text style={styles.conversionLabel}>
              Enrolled / Total Leads
            </Text>
            <View style={styles.conversionBar}>
              <View
                style={[
                  styles.conversionBarFill,
                  { width: `${Math.min(stats.conversion_rate, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.conversionDetails}>
              {stats.enrolled_leads} out of {stats.total_leads} leads enrolled
            </Text>
          </View>
        </View>
      </View>

      {/* Performance Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 Insights</Text>
        <View style={styles.insightCard}>
          {stats.today_calls === 0 ? (
            <Text style={styles.insightText}>
              🎯 Start making calls today to improve your stats!
            </Text>
          ) : stats.today_calls < 10 ? (
            <Text style={styles.insightText}>
              🔥 Great start! Keep up the momentum with more calls.
            </Text>
          ) : (
            <Text style={styles.insightText}>
              ⚡ Excellent work! You're crushing your call targets today.
            </Text>
          )}
        </View>

        {stats.conversion_rate > 0 && (
          <View style={[styles.insightCard, styles.insightCardSuccess]}>
            <Text style={styles.insightText}>
              {stats.conversion_rate >= 20
                ? '🏆 Outstanding conversion rate! Keep it up!'
                : stats.conversion_rate >= 10
                  ? '👍 Good conversion rate. You\'re on the right track!'
                  : '💪 Focus on quality conversations to boost conversions.'}
            </Text>
          </View>
        )}
      </View>

      {/* Footer Spacing */}
      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 32,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6b7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  statCardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  statCardSecondary: {
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  statCardInfo: {
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4',
  },
  statCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  statCardSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  statCardEnrolled: {
    borderLeftWidth: 4,
    borderLeftColor: '#ec4899',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statIconContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    opacity: 0.2,
  },
  statIcon: {
    fontSize: 32,
  },
  conversionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  conversionContent: {
    alignItems: 'center',
  },
  conversionValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#3b82f6',
    marginBottom: 8,
  },
  conversionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 16,
  },
  conversionBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  conversionBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  conversionDetails: {
    fontSize: 13,
    color: '#9ca3af',
  },
  insightCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  insightCardSuccess: {
    backgroundColor: '#d1fae5',
    borderLeftColor: '#10b981',
  },
  insightText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
    fontWeight: '500',
  },
  footer: {
    height: 20,
  },
});
