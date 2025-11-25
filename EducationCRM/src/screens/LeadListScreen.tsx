import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LeadService, { Lead } from '../services/LeadService';
import { useDebounce } from '../hooks/useDebounce';
import LeadCard from '../components/LeadCard';
import OfflineIndicator from '../components/OfflineIndicator';
import { cancelAllRequests } from '../services/ApiService';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Interested', value: 'interested' },
  { label: 'Not Interested', value: 'not_interested' },
  { label: 'Enrolled', value: 'enrolled' },
  { label: 'Lost', value: 'lost' },
];

// Fixed height for lead cards (approximate)
const LEAD_CARD_HEIGHT = 180;
const LEAD_CARD_MARGIN = 12;

export default function LeadListScreen() {
  const navigation = useNavigation();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(searchQuery, 300);
  const previousSearchRef = useRef(searchQuery);

  // Fetch leads
  const fetchLeads = async (page: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      setError('');

      const filters = {
        status: selectedStatus,
        search: debouncedSearch,
      };

      const response = await LeadService.fetchLeads(filters, page);

      if (page === 1 || refresh) {
        setLeads(response.data);
      } else {
        setLeads(prev => [...prev, ...response.data]);
      }

      setCurrentPage(response.page);
      setTotalPages(response.total_pages);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      setError('Failed to load leads. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  // Initial load and when filters change
  useEffect(() => {
    // Cancel pending requests when search or filter changes
    if (previousSearchRef.current !== searchQuery) {
      cancelAllRequests();
      previousSearchRef.current = searchQuery;
    }

    fetchLeads(1);
  }, [debouncedSearch, selectedStatus]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchLeads(1, true);
    }, [])
  );

  const handleRefresh = () => {
    fetchLeads(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && currentPage < totalPages) {
      fetchLeads(currentPage + 1);
    }
  };

  const handleLeadPress = useCallback((lead: Lead) => {
    // @ts-ignore - Navigation types will be properly typed later
    navigation.navigate('LeadDetail', { leadId: lead.id });
  }, [navigation]);

  // Optimized key extractor using lead.id
  const keyExtractor = useCallback((item: Lead) => item.id, []);

  // Optimized getItemLayout for fixed-height items
  const getItemLayout = useCallback(
    (_data: ArrayLike<Lead> | null | undefined, index: number) => ({
      length: LEAD_CARD_HEIGHT + LEAD_CARD_MARGIN,
      offset: (LEAD_CARD_HEIGHT + LEAD_CARD_MARGIN) * index,
      index,
    }),
    []
  );

  const renderLeadCard = useCallback(({ item }: { item: Lead }) => {
    const hasPendingFollowup = false; // TODO: Check if lead has pending followup
    return <LeadCard lead={item} onPress={handleLeadPress} hasPendingFollowup={hasPendingFollowup} />;
  }, [handleLeadPress]);

  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No leads found</Text>
        <Text style={styles.emptyText}>
          {searchQuery || selectedStatus
            ? 'Try adjusting your filters'
            : 'Your assigned leads will appear here'}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {STATUS_FILTERS.map(filter => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterChip,
              selectedStatus === filter.value && styles.filterChipActive,
            ]}
            onPress={() => setSelectedStatus(filter.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedStatus === filter.value && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Error Message */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Leads List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading leads...</Text>
        </View>
      ) : (
        <FlatList
          data={leads}
          renderItem={renderLeadCard}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#3b82f6']}
              tintColor="#3b82f6"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          // Performance optimizations
          windowSize={10}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
          initialNumToRender={10}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  clearIcon: {
    fontSize: 18,
    color: '#9ca3af',
    padding: 4,
  },
  filtersContainer: {
    maxHeight: 50,
    marginBottom: 12,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
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
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
