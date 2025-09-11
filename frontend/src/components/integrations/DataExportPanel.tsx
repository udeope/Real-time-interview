'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';

interface ExportFormat {
  value: 'json' | 'csv' | 'pdf' | 'zip';
  label: string;
  description: string;
}

interface DataType {
  value: string;
  label: string;
  description: string;
  selected: boolean;
}

interface ExportHistory {
  id: string;
  format: string;
  dataTypes: string[];
  createdAt: string;
  status: 'completed' | 'processing' | 'failed';
  downloadUrl?: string;
  expiresAt?: string;
}

export const DataExportPanel: React.FC = () => {
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv' | 'pdf' | 'zip'>('json');
  const [dataTypes, setDataTypes] = useState<DataType[]>([
    { value: 'profile', label: 'User Profile', description: 'Personal information and preferences', selected: true },
    { value: 'sessions', label: 'Interview Sessions', description: 'Interview session records and metadata', selected: true },
    { value: 'transcriptions', label: 'Transcriptions', description: 'Audio transcription data', selected: false },
    { value: 'responses', label: 'AI Responses', description: 'Generated response suggestions', selected: false },
    { value: 'analytics', label: 'Analytics', description: 'Usage statistics and performance metrics', selected: false },
    { value: 'practice_sessions', label: 'Practice Sessions', description: 'Practice session records and feedback', selected: false },
    { value: 'integrations', label: 'Integrations', description: 'Connected third-party services', selected: false },
  ]);
  const [includeOptions, setIncludeOptions] = useState({
    includeAudio: false,
    includeTranscriptions: true,
    includeResponses: true,
    includeAnalytics: false,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);

  const formats: ExportFormat[] = [
    { value: 'json', label: 'JSON', description: 'Machine-readable JSON format' },
    { value: 'csv', label: 'CSV', description: 'Comma-separated values for spreadsheets' },
    { value: 'pdf', label: 'PDF', description: 'Human-readable PDF document' },
    { value: 'zip', label: 'ZIP Archive', description: 'Multiple formats in a compressed archive' },
  ];

  const handleDataTypeToggle = (value: string) => {
    setDataTypes(prev => prev.map(dt => 
      dt.value === value ? { ...dt, selected: !dt.selected } : dt
    ));
  };

  const handleCreateExport = async () => {
    setIsExporting(true);
    try {
      const selectedDataTypes = dataTypes.filter(dt => dt.selected).map(dt => dt.value);
      
      const response = await fetch('/api/integrations/data-export/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: selectedFormat,
          dataTypes: selectedDataTypes,
          ...includeOptions,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        // Add to export history
        const newExport: ExportHistory = {
          id: result.export.exportId,
          format: result.export.format,
          dataTypes: selectedDataTypes,
          createdAt: result.export.createdAt,
          status: 'completed',
          downloadUrl: result.export.downloadUrl,
          expiresAt: result.export.expiresAt,
        };
        setExportHistory(prev => [newExport, ...prev]);
      }
    } catch (error) {
      console.error('Failed to create export:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickExport = async (type: 'complete' | 'sessions-only' | 'profile-only') => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/integrations/data-export/quick-export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      const result = await response.json();
      
      if (response.ok) {
        // Add to export history
        const newExport: ExportHistory = {
          id: result.export.exportId,
          format: result.export.format,
          dataTypes: [], // Would be populated based on type
          createdAt: result.export.createdAt,
          status: 'completed',
          downloadUrl: result.export.downloadUrl,
          expiresAt: result.export.expiresAt,
        };
        setExportHistory(prev => [newExport, ...prev]);
      }
    } catch (error) {
      console.error('Failed to create quick export:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async (exportId: string) => {
    try {
      const response = await fetch(`/api/integrations/data-export/download/${exportId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export-${exportId}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download export:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Export</h3>
        <p className="text-sm text-gray-500">
          Export your data in various formats for backup or analysis
        </p>
      </div>

      {/* Quick Export Options */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Export</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            onClick={() => handleQuickExport('complete')}
            disabled={isExporting}
            variant="outline"
            className="text-left p-4 h-auto"
          >
            <div>
              <div className="font-medium">Complete Export</div>
              <div className="text-xs text-gray-500 mt-1">All data in ZIP format</div>
            </div>
          </Button>
          <Button
            onClick={() => handleQuickExport('sessions-only')}
            disabled={isExporting}
            variant="outline"
            className="text-left p-4 h-auto"
          >
            <div>
              <div className="font-medium">Sessions Only</div>
              <div className="text-xs text-gray-500 mt-1">Interview sessions and transcriptions</div>
            </div>
          </Button>
          <Button
            onClick={() => handleQuickExport('profile-only')}
            disabled={isExporting}
            variant="outline"
            className="text-left p-4 h-auto"
          >
            <div>
              <div className="font-medium">Profile Only</div>
              <div className="text-xs text-gray-500 mt-1">User profile and integrations</div>
            </div>
          </Button>
        </div>
      </div>

      {/* Custom Export */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Custom Export</h4>
        
        {/* Format Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {formats.map((format) => (
              <button
                key={format.value}
                onClick={() => setSelectedFormat(format.value)}
                className={`p-3 text-left border rounded-lg transition-colors ${
                  selectedFormat === format.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm">{format.label}</div>
                <div className="text-xs text-gray-500 mt-1">{format.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Data Types */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Data Types</label>
          <div className="space-y-2">
            {dataTypes.map((dataType) => (
              <label key={dataType.value} className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={dataType.selected}
                  onChange={() => handleDataTypeToggle(dataType.value)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{dataType.label}</div>
                  <div className="text-xs text-gray-500">{dataType.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Include Options */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Include Options</label>
          <div className="space-y-2">
            {Object.entries(includeOptions).map(([key, value]) => (
              <label key={key} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setIncludeOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>

        <Button
          onClick={handleCreateExport}
          disabled={isExporting || !dataTypes.some(dt => dt.selected)}
          className="w-full"
        >
          {isExporting ? 'Creating Export...' : 'Create Export'}
        </Button>
      </div>

      {/* Export History */}
      {exportHistory.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Export History</h4>
          <div className="space-y-3">
            {exportHistory.map((export_) => (
              <div key={export_.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {export_.format.toUpperCase()} Export
                    </div>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(export_.createdAt).toLocaleString()}
                      {export_.expiresAt && (
                        <span> • Expires: {new Date(export_.expiresAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      export_.status === 'completed' ? 'bg-green-100 text-green-800' :
                      export_.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {export_.status}
                    </span>
                    {export_.status === 'completed' && export_.downloadUrl && (
                      <Button
                        onClick={() => handleDownload(export_.id)}
                        size="sm"
                        variant="outline"
                      >
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GDPR Notice */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h5 className="text-sm font-medium text-blue-800">Data Portability Rights</h5>
            <p className="text-xs text-blue-700 mt-1">
              You have the right to export your data at any time. Exports are available for 24 hours 
              and contain all your personal data in a portable format as required by GDPR.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};