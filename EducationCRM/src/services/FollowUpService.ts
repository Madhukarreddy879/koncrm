import apiClient from './ApiService';

export interface FollowUp {
  id: string;
  lead_id: string;
  telecaller_id: string;
  scheduled_at: string;
  description?: string;
  completed: boolean;
  completed_at?: string;
  inserted_at: string;
  updated_at: string;
  lead?: {
    id: string;
    student_name: string;
    phone_number: string;
    status: string;
  };
}

export interface FollowUpFilters {
  status?: 'pending' | 'completed';
  date?: string;
}

export interface CreateFollowUpData {
  lead_id: string;
  scheduled_at: string;
  description?: string;
}

class FollowUpService {
  /**
   * Fetch follow-ups for the current telecaller with optional filters
   * @param filters - Optional filters (status, date)
   * @returns Promise with array of follow-ups
   */
  async fetchFollowUps(filters: FollowUpFilters = {}): Promise<FollowUp[]> {
    try {
      const params: Record<string, string> = {};

      if (filters.status) {
        params.status = filters.status;
      }

      if (filters.date) {
        params.date = filters.date;
      }

      const response = await apiClient.get<{ data: FollowUp[] }>('/followups', { params });
      return response.data.data;
    } catch (error) {
      console.error('[FollowUpService] Failed to fetch follow-ups:', error);
      throw error;
    }
  }

  /**
   * Create a new follow-up task for a lead
   * @param leadId - Lead ID
   * @param data - Follow-up data (scheduled_at, description)
   * @returns Promise with created follow-up
   */
  async createFollowUp(leadId: string, data: Omit<CreateFollowUpData, 'lead_id'>): Promise<FollowUp> {
    try {
      const response = await apiClient.post<FollowUp>('/followups', {
        lead_id: leadId,
        ...data,
      });
      return response.data;
    } catch (error) {
      console.error('[FollowUpService] Failed to create follow-up:', error);
      throw error;
    }
  }

  /**
   * Mark a follow-up as completed
   * @param id - Follow-up ID
   * @returns Promise with updated follow-up
   */
  async markComplete(id: string): Promise<FollowUp> {
    try {
      const response = await apiClient.patch<FollowUp>(`/followups/${id}`, {
        completed: true,
      });
      return response.data;
    } catch (error) {
      console.error('[FollowUpService] Failed to mark follow-up complete:', error);
      throw error;
    }
  }

  /**
   * Get follow-ups grouped by date category
   * @returns Promise with categorized follow-ups
   */
  async getGroupedFollowUps(): Promise<{
    overdue: FollowUp[];
    today: FollowUp[];
    upcoming: FollowUp[];
  }> {
    try {
      const followUps = await this.fetchFollowUps({ status: 'pending' });

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const overdue: FollowUp[] = [];
      const today: FollowUp[] = [];
      const upcoming: FollowUp[] = [];

      followUps.forEach(followUp => {
        const scheduledDate = new Date(followUp.scheduled_at);

        if (scheduledDate < todayStart) {
          overdue.push(followUp);
        } else if (scheduledDate >= todayStart && scheduledDate < todayEnd) {
          today.push(followUp);
        } else {
          upcoming.push(followUp);
        }
      });

      return { overdue, today, upcoming };
    } catch (error) {
      console.error('[FollowUpService] Failed to get grouped follow-ups:', error);
      throw error;
    }
  }
}

export default new FollowUpService();
