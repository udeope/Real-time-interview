import React from 'react';
import IntegrationManagement from '@/components/integrations/IntegrationManagement';
import DataExportPanel from '@/components/integrations/DataExportPanel';

export default function IntegrationsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          External Integrations
        </h1>
        <p className="text-gray-600">
          Connect your external services to enhance your interview preparation experience.
        </p>
      </div>

      <div className="space-y-8">
        <IntegrationManagement />
        <DataExportPanel />
      </div>
    </div>
  );
}