import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import FollowUpService, { FollowUp } from '../services/FollowUpService';

interface FollowUpSection {
  title: string;
  data: FollowUp[];
  color: string;
}

export default function FollowUpListScreen() {
  const navigation = useNavigation();
  const [sections, setSections] = useState<FollowUpSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchFollowUps = async (refresh: boolean = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError('');

      const grouped = await FollowUpService.getGroupedFollowUps();

      const newSections: FollowUpSection[] = [
        {
          title: 'Overdue',
          data: grouped.overdue,
          color: '#ef4444',
        },
        {
          title: 'Today',
          data: grouped.today,
          color: '#f59e0b',
        },
        {
          title: 'Upcoming',
          data: grouped.upcoming,
          color: '#10b981',
        },
      ];

      setSections(newSections);
    } catch (err: any) {
      console.error('Error fetching follow-ups:', err);
      setError('Failed to load follow-ups. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFollowUps(true);
    }, [])
  );

  const handleRefresh = () => {
    fetchFollowUps(true);
  };

  const handleMarkComplete = async (followUpId: string) => {
    try {
      await FollowUpService.markComplete(followUpId);
      fetchFollowUps(true);
    } catch (error) {
      console.error('Error marking follow-up complete:', error);
    }
  };

  const handleFollowUpPress = (followUp: FollowUp) => {
    if (followUp.lead) {
      // @ts-ignore
      navigation.navigate('LeadDetail', { leadId: followUp.lead_id });
    }
  };

  const renderFollowUpCard = ({ item }: { item: FollowUp }) => {
    const scheduledDate = new Date(item.scheduled_at);
    const timeString = scheduledDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={styles.followUpCard}
        onPress={() => handleFollowUpPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.leadInfo}>
              <Text style={styles.leadName}>
                {item.lead?.student_name || 'Unknown Lead'}
              </Text>
              {item.lead?.phone_number && (
                <Text style={styles.phoneNumber}>📞 {item.lead.phone_number}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => handleMarkComplete(item.id)}
            >
              <Text style={styles.checkboxIcon}>✓</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.timeContainer}>
            <Text style={styles.timeIcon}>🕐</Text>
            <Text style={styles.timeText}>{timeString}</Text>
          </View>

          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: FollowUpSection }) => {
    if (section.data.length === 0) return null;

    return (
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIndicator, { backgroundColor: section.color }]} />
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{section.data.length}</Text>
        </View>
      </View>
    );
  };

  const renderSectionEmpty = (section: FollowUpSection) => {
    return (
      <View style={styles.emptySection}>
        <Text style={styles.emptySectionText}>No {section.title.toLowerCase()} follow-ups</Text>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) return null;

    const hasAnyFollowUps = sections.some(section => section.data.length > 0);

    if (hasAnyFollowUps) return null;

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyTitle}>No Follow-ups</Text>
        <Text style={styles.emptyText}>
          You don't have any pending follow-ups at the moment
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading follow-ups...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <SectionList
        sections={sections}
        renderItem={renderFollowUpCard}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
        ListEmptyComponent={renderEmptyState}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  followUpCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leadInfo: {
    flex: 1,
    marginRight: 12,
  },
  leadName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  checkboxIcon: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '700',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4b5563',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  emptySection: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
