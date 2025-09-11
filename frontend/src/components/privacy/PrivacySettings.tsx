'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';

interface PrivacySettings {
  audioRetentionDays: number;
  transcriptionRetentionDays: number;
  analyticsEnabled: boolean;
  dataSharingEnabled: boolean;
  marketingEmailsEnabled: boolean;
  sessionRecordingEnabled: boolean;
  aiTrainingConsent: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ConsentStatus {
  consentType: string;
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string;
  version: string;
  isRequired: boolean;
}

export default function PrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [consents, setConsents] = useState<ConsentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPrivacyData();
  }, []);

  const loadPrivacyData = async () => {
    try {
      setLoading(true);
      
      // Load privacy settings and consents in parallel
      const [settingsResponse, consentsResponse] = await Promise.all([
        fetch('/api/privacy-settings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }),
        fetch('/api/consent', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }),
      ]);

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setSettings(settingsData);
      }

      if (consentsResponse.ok) {
        const consentsData = await consentsResponse.json();
        setConsents(consentsData);
      }
    } catch (err) {
      setError('Failed to load privacy settings');
      console.error('Privacy settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePrivacySettings = async (updates: Partial<PrivacySettings>) => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/privacy-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const result = await response.json();
        setSettings(result.settings);
        setSuccess('Privacy settings updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update privacy settings');
      }
    } catch (err) {
      setError('Failed to update privacy settings');
      console.error('Update error:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateConsent = async (consentType: string, granted: boolean) => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/consent/${consentType}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ granted }),
      });

      if (response.ok) {
        // Reload consents to get updated data
        await loadPrivacyData();
        setSuccess('Consent updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update consent');
      }
    } catch (err) {
      setError('Failed to update consent');
      console.error('Consent error:', err);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('Are you sure you want to reset all privacy settings to defaults?')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/privacy-settings/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setSettings(result.settings);
        setSuccess('Privacy settings reset to defaults');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to reset privacy settings');
      }
    } catch (err) {
      setError('Failed to reset privacy settings');
      console.error('Reset error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Failed to load privacy settings</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Privacy & Security Settings</h2>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Data Retention Settings */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Retention</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audio Data Retention
              </label>
              <select
                value={settings.audioRetentionDays}
                onChange={(e) => updatePrivacySettings({ audioRetentionDays: parseInt(e.target.value) })}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 day</option>
                <option value={7}>1 week</option>
                <option value={30}>1 month (recommended)</option>
                <option value={90}>3 months</option>
                <option value={365}>1 year</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                How long to keep your audio recordings
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transcription Data Retention
              </label>
              <select
                value={settings.transcriptionRetentionDays}
                onChange={(e) => updatePrivacySettings({ transcriptionRetentionDays: parseInt(e.target.value) })}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>1 week</option>
                <option value={30}>1 month</option>
                <option value={90}>3 months (recommended)</option>
                <option value={180}>6 months</option>
                <option value={365}>1 year</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                How long to keep your transcription data
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Permissions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy Permissions</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Analytics & Performance Tracking</h4>
                <p className="text-sm text-gray-600">Allow us to collect usage analytics to improve the service</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.analyticsEnabled}
                  onChange={(e) => updatePrivacySettings({ analyticsEnabled: e.target.checked })}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Data Sharing</h4>
                <p className="text-sm text-gray-600">Allow sharing anonymized data for research purposes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.dataSharingEnabled}
                  onChange={(e) => updatePrivacySettings({ dataSharingEnabled: e.target.checked })}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Marketing Communications</h4>
                <p className="text-sm text-gray-600">Receive emails about new features and updates</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.marketingEmailsEnabled}
                  onChange={(e) => updatePrivacySettings({ marketingEmailsEnabled: e.target.checked })}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Session Recording</h4>
                <p className="text-sm text-gray-600">Allow recording of interview sessions for analysis</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.sessionRecordingEnabled}
                  onChange={(e) => updatePrivacySettings({ sessionRecordingEnabled: e.target.checked })}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">AI Model Training</h4>
                <p className="text-sm text-gray-600">Allow your data to be used for improving AI models</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.aiTrainingConsent}
                  onChange={(e) => updatePrivacySettings({ aiTrainingConsent: e.target.checked })}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Consent Management */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Consent Management</h3>
          <div className="space-y-3">
            {consents.map((consent) => (
              <div key={consent.consentType} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900 capitalize">
                    {consent.consentType.replace('_', ' ')}
                    {consent.isRequired && <span className="text-red-500 ml-1">*</span>}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Status: {consent.granted ? 'Granted' : 'Not granted'}
                    {consent.grantedAt && ` on ${new Date(consent.grantedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <Button
                  onClick={() => updateConsent(consent.consentType, !consent.granted)}
                  disabled={saving}
                  variant={consent.granted ? 'secondary' : 'primary'}
                  size="sm"
                >
                  {consent.granted ? 'Revoke' : 'Grant'}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
          <Button
            onClick={resetToDefaults}
            disabled={saving}
            variant="secondary"
          >
            Reset to Defaults
          </Button>
          
          <Button
            onClick={() => window.open('/privacy-policy', '_blank')}
            variant="outline"
          >
            View Privacy Policy
          </Button>
          
          <Button
            onClick={() => window.location.href = '/settings/data-export'}
            variant="outline"
          >
            Export My Data
          </Button>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>Last updated: {new Date(settings.updatedAt).toLocaleString()}</p>
          <p className="mt-1">
            For questions about your privacy, contact us at{' '}
            <a href="mailto:privacy@example.com" className="text-blue-600 hover:underline">
              privacy@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}