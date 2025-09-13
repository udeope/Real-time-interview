'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Bell, 
  Shield, 
  Mic, 
  Globe,
  Clock,
  Palette,
  Save,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { settingsService, UserPreferences, UpdatePreferencesRequest } from '@/lib/settings.service';

export default function SettingsManagement() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<UpdatePreferencesRequest>({});
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const userPreferences = await settingsService.getUserPreferences();
      setPreferences(userPreferences);
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (key: keyof UpdatePreferencesRequest, value: any) => {
    setPendingChanges(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveChanges = async () => {
    if (!hasChanges || Object.keys(pendingChanges).length === 0) return;

    setSaving(true);
    try {
      const updatedPreferences = await settingsService.batchUpdatePreferences(pendingChanges);
      setPreferences(updatedPreferences);
      setPendingChanges({});
      setHasChanges(false);
      
      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('Are you sure you want to reset all settings to default values?')) return;

    setSaving(true);
    try {
      const defaultPreferences = await settingsService.resetUserPreferences();
      setPreferences(defaultPreferences);
      setPendingChanges({});
      setHasChanges(false);
      
      toast({
        title: 'Success',
        description: 'Settings reset to defaults',
      });
    } catch (error) {
      console.error('Error resetting preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const exportSettings = async () => {
    try {
      await settingsService.downloadSettingsFile();
      toast({
        title: 'Success',
        description: 'Settings exported successfully',
      });
    } catch (error) {
      console.error('Error exporting settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to export settings',
        variant: 'destructive',
      });
    }
  };

  const getCurrentValue = (key: keyof UpdatePreferencesRequest) => {
    return pendingChanges[key] !== undefined ? pendingChanges[key] : preferences?.[key];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading settings...
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
        <p>Failed to load settings</p>
        <Button onClick={loadPreferences} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Settings & Preferences
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportSettings}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
                disabled={saving}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={saveChanges}
                disabled={!hasChanges || saving}
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Customize your AI Interview Assistant experience
          </CardDescription>
        </CardHeader>
        {hasChanges && (
          <CardContent>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
                <p className="text-sm text-yellow-700">
                  You have unsaved changes. Don't forget to save your settings.
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={getCurrentValue('language')}
                onChange={(e) => handlePreferenceChange('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="zh">中文</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={getCurrentValue('timezone')}
                onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Europe/Berlin">Berlin (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Asia/Shanghai">Shanghai (CST)</option>
                <option value="Asia/Seoul">Seoul (KST)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <select
                value={getCurrentValue('theme')}
                onChange={(e) => handlePreferenceChange('theme', e.target.value)}
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
                value={getCurrentValue('audioQuality')}
                onChange={(e) => handlePreferenceChange('audioQuality', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">High Quality (48kHz)</option>
                <option value="medium">Medium Quality (44.1kHz)</option>
                <option value="low">Low Quality (16kHz)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Notifications
          </CardTitle>
          <CardDescription>
            Choose how you want to be notified about important updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: 'emailNotifications' as keyof UpdatePreferencesRequest,
              label: 'Email Notifications',
              description: 'Receive important updates via email',
            },
            {
              key: 'pushNotifications' as keyof UpdatePreferencesRequest,
              label: 'Push Notifications',
              description: 'Receive browser notifications',
            },
            {
              key: 'interviewReminders' as keyof UpdatePreferencesRequest,
              label: 'Interview Reminders',
              description: 'Get reminded about upcoming interviews',
            },
            {
              key: 'practiceReminders' as keyof UpdatePreferencesRequest,
              label: 'Practice Reminders',
              description: 'Get reminded to practice interview skills',
            },
            {
              key: 'weeklyReports' as keyof UpdatePreferencesRequest,
              label: 'Weekly Reports',
              description: 'Receive weekly progress summaries',
            },
          ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{setting.label}</h4>
                <p className="text-sm text-gray-600">{setting.description}</p>
              </div>
              <button
                onClick={() => handlePreferenceChange(setting.key, !getCurrentValue(setting.key))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  getCurrentValue(setting.key) ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    getCurrentValue(setting.key) ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Interview Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mic className="w-5 h-5 mr-2" />
            Interview Settings
          </CardTitle>
          <CardDescription>
            Customize your interview experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: 'autoSaveResponses' as keyof UpdatePreferencesRequest,
              label: 'Auto-save Responses',
              description: 'Automatically save your responses during interviews',
            },
            {
              key: 'showConfidenceScores' as keyof UpdatePreferencesRequest,
              label: 'Show Confidence Scores',
              description: 'Display transcription confidence indicators',
            },
          ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{setting.label}</h4>
                <p className="text-sm text-gray-600">{setting.description}</p>
              </div>
              <button
                onClick={() => handlePreferenceChange(setting.key, !getCurrentValue(setting.key))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  getCurrentValue(setting.key) ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    getCurrentValue(setting.key) ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Settings Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Settings Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Created:</span>
              <span className="ml-2 text-gray-600">
                {new Date(preferences.createdAt).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="font-medium">Last Updated:</span>
              <span className="ml-2 text-gray-600">
                {new Date(preferences.updatedAt).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="font-medium">Settings ID:</span>
              <span className="ml-2 text-gray-600 font-mono text-xs">
                {preferences.id}
              </span>
            </div>
            <div>
              <span className="font-medium">Sync Status:</span>
              <Badge variant="default" className="ml-2">
                <CheckCircle className="w-3 h-3 mr-1" />
                Synced
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}