interface UserPreferences {
  id: string;
  userId: string;
  language: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  interviewReminders: boolean;
  practiceReminders: boolean;
  weeklyReports: boolean;
  theme: string;
  audioQuality: string;
  autoSaveResponses: boolean;
  showConfidenceScores: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UpdatePreferencesRequest {
  language?: string;
  timezone?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  interviewReminders?: boolean;
  practiceReminders?: boolean;
  weeklyReports?: boolean;
  theme?: string;
  audioQuality?: string;
  autoSaveResponses?: boolean;
  showConfidenceScores?: boolean;
}

interface AccountDeletionRequest {
  reason?: string;
  feedback?: string;
}

interface AccountDeletionResult {
  success: boolean;
  deletedAt: string;
  dataRemoved: {
    userProfile: boolean;
    interviewSessions: boolean;
    practiceSessions: boolean;
    integrations: boolean;
    preferences: boolean;
    auditLogs: boolean;
    subscriptions: boolean;
  };
  errors?: string[];
}

interface UserSettings {
  user: any;
  profile: any;
  preferences: UserPreferences;
  exportedAt: string;
}

class SettingsService {
  private baseUrl = '/api/users/me';

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  // Preferences Management
  async getUserPreferences(): Promise<UserPreferences> {
    const response = await fetch(`${this.baseUrl}/preferences`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user preferences');
    }

    return response.json();
  }

  async updateUserPreferences(updates: UpdatePreferencesRequest): Promise<UserPreferences> {
    const response = await fetch(`${this.baseUrl}/preferences`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update user preferences');
    }

    return response.json();
  }

  async resetUserPreferences(): Promise<UserPreferences> {
    const response = await fetch(`${this.baseUrl}/preferences`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to reset user preferences');
    }

    return response.json();
  }

  // Settings Export
  async exportUserSettings(): Promise<UserSettings> {
    const response = await fetch(`${this.baseUrl}/export-settings`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to export user settings');
    }

    return response.json();
  }

  async downloadSettingsFile(): Promise<void> {
    try {
      const settings = await this.exportUserSettings();
      
      const blob = new Blob([JSON.stringify(settings, null, 2)], {
        type: 'application/json',
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-interview-assistant-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download settings file:', error);
      throw error;
    }
  }

  // Account Deletion
  async requestAccountDeletion(request: AccountDeletionRequest): Promise<AccountDeletionResult> {
    const response = await fetch(`${this.baseUrl}/delete-account`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to delete account');
    }

    return response.json();
  }

  async scheduleAccountDeletion(deletionDate: Date): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/schedule-deletion`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        deletionDate: deletionDate.toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to schedule account deletion');
    }

    return response.json();
  }

  async cancelAccountDeletion(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/cancel-deletion`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to cancel account deletion');
    }

    return response.json();
  }

  // Local Storage Helpers
  savePreferencesToLocal(preferences: UserPreferences): void {
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
  }

  getPreferencesFromLocal(): UserPreferences | null {
    const stored = localStorage.getItem('userPreferences');
    return stored ? JSON.parse(stored) : null;
  }

  clearLocalPreferences(): void {
    localStorage.removeItem('userPreferences');
  }

  // Theme Management
  applyTheme(theme: string): void {
    const root = document.documentElement;
    
    switch (theme) {
      case 'dark':
        root.classList.add('dark');
        break;
      case 'light':
        root.classList.remove('dark');
        break;
      case 'system':
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        break;
    }
  }

  // Language Management
  applyLanguage(language: string): void {
    document.documentElement.lang = language;
    localStorage.setItem('selectedLanguage', language);
  }

  // Timezone Management
  applyTimezone(timezone: string): void {
    localStorage.setItem('selectedTimezone', timezone);
  }

  // Audio Quality Management
  getAudioConstraints(quality: string): MediaTrackConstraints {
    switch (quality) {
      case 'high':
        return {
          sampleRate: 48000,
          channelCount: 2,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };
      case 'medium':
        return {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };
      case 'low':
        return {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        };
      default:
        return {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };
    }
  }

  // Notification Management
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  }

  async sendTestNotification(): Promise<void> {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('AI Interview Assistant', {
        body: 'Notifications are working correctly!',
        icon: '/favicon.ico',
      });
    }
  }

  // Validation Helpers
  validateTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  validateLanguage(language: string): boolean {
    const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'];
    return supportedLanguages.includes(language);
  }

  // Sync with Server
  async syncPreferences(): Promise<UserPreferences> {
    try {
      const serverPreferences = await this.getUserPreferences();
      this.savePreferencesToLocal(serverPreferences);
      
      // Apply preferences to the current session
      this.applyTheme(serverPreferences.theme);
      this.applyLanguage(serverPreferences.language);
      this.applyTimezone(serverPreferences.timezone);
      
      return serverPreferences;
    } catch (error) {
      console.error('Failed to sync preferences:', error);
      
      // Fall back to local preferences if available
      const localPreferences = this.getPreferencesFromLocal();
      if (localPreferences) {
        this.applyTheme(localPreferences.theme);
        this.applyLanguage(localPreferences.language);
        this.applyTimezone(localPreferences.timezone);
        return localPreferences;
      }
      
      throw error;
    }
  }

  // Batch Update Helper
  async batchUpdatePreferences(updates: Partial<UpdatePreferencesRequest>): Promise<UserPreferences> {
    const updatedPreferences = await this.updateUserPreferences(updates);
    this.savePreferencesToLocal(updatedPreferences);
    
    // Apply relevant changes immediately
    if (updates.theme) {
      this.applyTheme(updates.theme);
    }
    if (updates.language) {
      this.applyLanguage(updates.language);
    }
    if (updates.timezone) {
      this.applyTimezone(updates.timezone);
    }
    
    return updatedPreferences;
  }
}

export const settingsService = new SettingsService();
export type { UserPreferences, UpdatePreferencesRequest, AccountDeletionRequest, AccountDeletionResult, UserSettings };