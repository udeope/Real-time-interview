'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';

interface DataType {
  key: string;
  name: string;
  description: string;
}

interface ExportRequest {
  id: string;
  requestType: 'export' | 'delete';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  exportUrl?: string;
  expiresAt?: string;
  completedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

interface DataSummary {
  dataTypes: {
    audio: number;
    transcriptions: number;
    sessions: number;
    interactions: number;
    practiceData: number;
  };
  retentionPeriods: {
    audio: number;
    transcriptions: number;
  };
  lastActivity: string;
}

export default function DataExport() {
  const [dataTypes, setDataTypes] = useState<DataType[]>([]);
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [exportRequests, setExportRequests] = useState<ExportRequest[]>([]);
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [dataTypesResponse, summaryResponse] = await Promise.all([
        fetch('/api/gdpr/data-types', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }),
        fetch('/api/gdpr/data-summary', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }),
      ]);

      if (dataTypesResponse.ok) {
        const data = await dataTypesResponse.json();
        setDataTypes(data.dataTypes);
      }

      if (summaryResponse.ok) {
        const summary = await summaryResponse.json();
        setDataSummary(summary);
      }

      // Load recent export requests
      await loadExportRequests();
    } catch (err) {
      setError('Failed to load data export information');
      console.error('Data export error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadExportRequests = async () => {
    try {
      // This would need to be implemented to get user's export requests
      // For now, we'll just set an empty array
      setExportRequests([]);
    } catch (err) {
      console.error('Failed to load export requests:', err);
    }
  };

  const handleDataTypeToggle = (dataTypeKey: string) => {
    setSelectedDataTypes(prev => {
      if (prev.includes(dataTypeKey)) {
        return prev.filter(key => key !== dataTypeKey);
      } else {
        return [...prev, dataTypeKey];
      }
    });
  };

  const selectAllDataTypes = () => {
    setSelectedDataTypes(dataTypes.map(dt => dt.key));
  };

  const clearSelection = () => {
    setSelectedDataTypes([]);
  };

  const createExportRequest = async () => {
    if (selectedDataTypes.length === 0) {
      setError('Please select at least one data type to export');
      return;
    }

    try {
      setExporting(true);
      setError(null);

      const response = await fetch('/api/gdpr/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          dataTypes: selectedDataTypes,
          format: 'json',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`Export request created successfully. Request ID: ${result.requestId}`);
        setSelectedDataTypes([]);
        await loadExportRequests();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create export request');
      }
    } catch (err) {
      setError('Failed to create export request');
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const createDeletionRequest = async () => {
    if (selectedDataTypes.length === 0) {
      setError('Please select at least one data type to delete');
      return;
    }

    const confirmMessage = selectedDataTypes.includes('all') 
      ? 'This will permanently delete your entire account and all associated data. This action cannot be undone. Are you absolutely sure?'
      : `This will permanently delete the selected data types: ${selectedDataTypes.join(', ')}. This action cannot be undone. Are you sure?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    // Double confirmation for account deletion
    if (selectedDataTypes.includes('all')) {
      const finalConfirm = prompt('To confirm account deletion, please type "DELETE MY ACCOUNT" below:');
      if (finalConfirm !== 'DELETE MY ACCOUNT') {
        setError('Account deletion cancelled - confirmation text did not match');
        return;
      }
    }

    try {
      setDeleting(true);
      setError(null);

      const response = await fetch('/api/gdpr/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          dataTypes: selectedDataTypes,
          confirmation: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`Deletion request created successfully. Request ID: ${result.requestId}`);
        setSelectedDataTypes([]);
        
        if (selectedDataTypes.includes('all')) {
          // If deleting all data, redirect to logout
          setTimeout(() => {
            localStorage.removeItem('token');
            window.location.href = '/';
          }, 3000);
        } else {
          await loadExportRequests();
        }
        
        setTimeout(() => setSuccess(null), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create deletion request');
      }
    } catch (err) {
      setError('Failed to create deletion request');
      console.error('Deletion error:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Export & Deletion</h2>
        
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

        {/* Data Summary */}
        {dataSummary && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Your Data Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Audio files:</span> {dataSummary.dataTypes.audio}
              </div>
              <div>
                <span className="font-medium">Transcriptions:</span> {dataSummary.dataTypes.transcriptions}
              </div>
              <div>
                <span className="font-medium">Sessions:</span> {dataSummary.dataTypes.sessions}
              </div>
              <div>
                <span className="font-medium">Interactions:</span> {dataSummary.dataTypes.interactions}
              </div>
              <div>
                <span className="font-medium">Practice data:</span> {dataSummary.dataTypes.practiceData}
              </div>
              <div>
                <span className="font-medium">Last activity:</span>{' '}
                {dataSummary.lastActivity ? new Date(dataSummary.lastActivity).toLocaleDateString() : 'Never'}
              </div>
            </div>
          </div>
        )}

        {/* Data Type Selection */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Select Data Types</h3>
            <div className="space-x-2">
              <Button onClick={selectAllDataTypes} variant="outline" size="sm">
                Select All
              </Button>
              <Button onClick={clearSelection} variant="outline" size="sm">
                Clear Selection
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataTypes.map((dataType) => (
              <div
                key={dataType.key}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedDataTypes.includes(dataType.key)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleDataTypeToggle(dataType.key)}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedDataTypes.includes(dataType.key)}
                    onChange={() => handleDataTypeToggle(dataType.key)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">{dataType.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{dataType.description}</p>
                    {dataType.key === 'all' && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        ⚠️ This will delete your entire account
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button
            onClick={createExportRequest}
            disabled={exporting || selectedDataTypes.length === 0}
            variant="primary"
          >
            {exporting ? 'Creating Export...' : 'Export Selected Data'}
          </Button>
          
          <Button
            onClick={createDeletionRequest}
            disabled={deleting || selectedDataTypes.length === 0}
            variant="secondary"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deleting ? 'Creating Deletion Request...' : 'Delete Selected Data'}
          </Button>
        </div>

        {/* Export Requests History */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Requests</h3>
          {exportRequests.length === 0 ? (
            <p className="text-gray-500 text-sm">No export or deletion requests found.</p>
          ) : (
            <div className="space-y-3">
              {exportRequests.map((request) => (
                <div key={request.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 capitalize">
                        {request.requestType} Request
                      </h4>
                      <p className="text-sm text-gray-600">
                        Status: <span className={`font-medium ${
                          request.status === 'completed' ? 'text-green-600' :
                          request.status === 'failed' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          {request.status}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Created: {new Date(request.createdAt).toLocaleString()}
                      </p>
                    </div>
                    
                    {request.status === 'completed' && request.exportUrl && (
                      <Button
                        onClick={() => window.open(request.exportUrl, '_blank')}
                        variant="outline"
                        size="sm"
                      >
                        Download
                      </Button>
                    )}
                  </div>
                  
                  {request.errorMessage && (
                    <p className="text-sm text-red-600 mt-2">{request.errorMessage}</p>
                  )}
                  
                  {request.expiresAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Expires: {new Date(request.expiresAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GDPR Information */}
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Rights Under GDPR</h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>Right to Access:</strong> You can request a copy of all personal data we hold about you.</p>
            <p><strong>Right to Rectification:</strong> You can request correction of inaccurate personal data.</p>
            <p><strong>Right to Erasure:</strong> You can request deletion of your personal data.</p>
            <p><strong>Right to Restrict Processing:</strong> You can request limitation of processing of your data.</p>
            <p><strong>Right to Data Portability:</strong> You can request transfer of your data in a structured format.</p>
            <p><strong>Right to Object:</strong> You can object to processing of your personal data.</p>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>For questions about your data rights, contact us at{' '}
              <a href="mailto:privacy@example.com" className="text-blue-600 hover:underline">
                privacy@example.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}