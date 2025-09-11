'use client';

import { useState, useEffect } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

interface Preferences {
  id: string;
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
}

export function UserPreferences() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/me/preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<Preferences>) => {
    if (!preferences) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/me/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedPreferences = await response.json();
        setPreferences(updatedPreferences);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof Preferences, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  const handleSelect = (key: keyof Preferences, value: string) => {
    updatePreferences({ [key]: value });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Unable to load preferences</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Indicator */}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckIcon className="h-5 w-5 text-green-400 mr-3" />
            <p className="text-sm text-green-700">Preferences saved successfully!</p>
          </div>
        </div>
      )}

      {/* General Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={preferences.language}
                onChange={(e) => handleSelect('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={preferences.timezone}
                onChange={(e) => handleSelect('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <select
                value={preferences.theme}
                onChange={(e) => handleSelect('theme', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audio Quality
              </label>
              <select
                value={preferences.audioQuality}
                onChange={(e) => handleSelect('audioQuality', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">High Quality</option>
                <option value="medium">Medium Quality</option>
                <option value="low">Low Quality (Faster)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
          <p className="text-sm text-gray-600 mt-1">
            Choose how you want to be notified about important updates
          </p>
        </div>
        <div className="p-6 space-y-4">
          {[
            {
              key: 'emailNotifications' as keyof Preferences,
              label: 'Email Notifications',
              description: 'Receive important updates via email',
            },
            {
              key: 'pushNotifications' as keyof Preferences,
              label: 'Push Notifications',
              description: 'Receive browser notifications',
            },
            {
              key: 'interviewReminders' as keyof Preferences,
              label: 'Interview Reminders',
              description: 'Get reminded about upcoming interviews',
            },
            {
              key: 'practiceReminders' as keyof Preferences,
              label: 'Practice Reminders',
              description: 'Get reminded to practice interview skills',
            },
            {
              key: 'weeklyReports' as keyof Preferences,
              label: 'Weekly Reports',
              description: 'Receive weekly progress summaries',
            },
          ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{setting.label}</h4>
                <p className="text-sm text-gray-600">{setting.description}</p>
              </div>
              <button
                onClick={() => handleToggle(setting.key, !preferences[setting.key])}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  preferences[setting.key] ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences[setting.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Interview Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Interview Settings</h3>
          <p className="text-sm text-gray-600 mt-1">
            Customize your interview experience
          </p>
        </div>
        <div className="p-6 space-y-4">
          {[
            {
              key: 'autoSaveResponses' as keyof Preferences,
              label: 'Auto-save Responses',
              description: 'Automatically save your responses during interviews',
            },
            {
              key: 'showConfidenceScores' as keyof Preferences,
              label: 'Show Confidence Scores',
              description: 'Display transcription confidence indicators',
            },
          ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{setting.label}</h4>
                <p className="text-sm text-gray-600">{setting.description}</p>
              </div>
              <button
                onClick={() => handleToggle(setting.key, !preferences[setting.key])}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  preferences[setting.key] ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences[setting.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}