import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Lead } from '../services/LeadService';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: '#dbeafe', text: '#1e40af' },
  contacted: { bg: '#fef3c7', text: '#92400e' },
  interested: { bg: '#d1fae5', text: '#065f46' },
  not_interested: { bg: '#fee2e2', text: '#991b1b' },
  enrolled: { bg: '#dcfce7', text: '#166534' },
  lost: { bg: '#f3f4f6', text: '#374151' },
};

interface LeadCardProps {
  lead: Lead;
  onPress: (lead: Lead) => void;
  hasPendingFollowup?: boolean;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onPress, hasPendingFollowup = false }) => {
  const statusColor = STATUS_COLORS[lead.status] || STATUS_COLORS.new;

  return (
    <TouchableOpacity
      style={styles.leadCard}
      onPress={() => onPress(lead)}
      activeOpacity={0.7}
    >
      {hasPendingFollowup && <View style={styles.priorityIndicator} />}
      
      <View style={styles.leadHeader}>
        <Text style={styles.leadName}>{lead.student_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.statusText, { color: statusColor.text }]}>
            {lead.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.leadInfo}>
        <Text style={styles.phoneNumber}>📞 {lead.phone_number}</Text>
        {lead.last_contacted_at && (
          <Text style={styles.lastContact}>
            Last contact: {new Date(lead.last_contacted_at).toLocaleDateString()}
          </Text>
        )}
      </View>

      {lead.preferred_course && (
        <Text style={styles.courseText} numberOfLines={1}>
          🎓 {lead.preferred_course}
        </Text>
      )}

      <View style={styles.leadFooter}>
        <Text style={styles.callCount}>
          {lead.call_count} {lead.call_count === 1 ? 'call' : 'calls'}
        </Text>
        <Text style={styles.arrowIcon}>→</Text>
      </View>
    </TouchableOpacity>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(LeadCard, (prevProps, nextProps) => {
  // Only re-render if lead data or pending followup status changes
  return (
    prevProps.lead.id === nextProps.lead.id &&
    prevProps.lead.status === nextProps.lead.status &&
    prevProps.lead.call_count === nextProps.lead.call_count &&
    prevProps.lead.last_contacted_at === nextProps.lead.last_contacted_at &&
    prevProps.hasPendingFollowup === nextProps.hasPendingFollowup
  );
});

const styles = StyleSheet.create({
  leadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  priorityIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leadName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  leadInfo: {
    marginBottom: 8,
  },
  phoneNumber: {
    fontSize: 15,
    color: '#3b82f6',
    fontWeight: '500',
    marginBottom: 4,
  },
  lastContact: {
    fontSize: 13,
    color: '#6b7280',
  },
  courseText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
  },
  leadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  callCount: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  arrowIcon: {
    fontSize: 18,
    color: '#9ca3af',
  },
});
