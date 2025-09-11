'use client';

interface UsageData {
  [feature: string]: {
    usage: number;
    limit: number;
    percentage: number;
  };
}

interface UsageStatsProps {
  usageStats: UsageData;
  detailed?: boolean;
}

export function UsageStats({ usageStats, detailed = false }: UsageStatsProps) {
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getUsageTextColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatFeatureName = (feature: string) => {
    return feature
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatUsageText = (feature: string, data: { usage: number; limit: number }) => {
    const isUnlimited = data.limit === -1;
    
    switch (feature) {
      case 'monthly_sessions':
        return isUnlimited ? `${data.usage} sessions` : `${data.usage} / ${data.limit} sessions`;
      case 'session_duration_minutes':
        return isUnlimited ? `${data.usage} minutes` : `${data.usage} / ${data.limit} minutes`;
      case 'ai_responses_per_session':
        return isUnlimited ? `${data.usage} responses` : `${data.usage} / ${data.limit} responses`;
      case 'practice_sessions':
        return isUnlimited ? `${data.usage} sessions` : `${data.usage} / ${data.limit} sessions`;
      case 'export_requests':
        return isUnlimited ? `${data.usage} exports` : `${data.usage} / ${data.limit} exports`;
      case 'integrations':
        return isUnlimited ? `${data.usage} integrations` : `${data.usage} / ${data.limit} integrations`;
      default:
        return isUnlimited ? `${data.usage}` : `${data.usage} / ${data.limit}`;
    }
  };

  if (Object.keys(usageStats).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Statistics</h2>
        <div className="text-center py-8">
          <p className="text-gray-600">No usage data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        {detailed ? 'Detailed Usage Statistics' : 'Usage Statistics'}
      </h2>
      
      <div className={`space-y-${detailed ? '6' : '4'}`}>
        {Object.entries(usageStats).map(([feature, data]) => (
          <div key={feature} className={detailed ? 'border-b border-gray-200 pb-4 last:border-b-0' : ''}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">
                {formatFeatureName(feature)}
              </span>
              <span className={`text-sm font-medium ${getUsageTextColor(data.percentage)}`}>
                {formatUsageText(feature, data)}
              </span>
            </div>
            
            {data.limit !== -1 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(data.percentage)}`}
                  style={{ width: `${Math.min(data.percentage, 100)}%` }}
                ></div>
              </div>
            )}
            
            {data.limit === -1 && (
              <div className="text-xs text-gray-500 mt-1">Unlimited</div>
            )}
            
            {detailed && (
              <div className="mt-2 text-xs text-gray-500">
                {data.limit === -1 ? (
                  'No usage limits on your current plan'
                ) : data.percentage >= 90 ? (
                  'You\'re approaching your usage limit'
                ) : data.percentage >= 75 ? (
                  'You\'ve used most of your allocation'
                ) : (
                  'You have plenty of usage remaining'
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {!detailed && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Usage resets monthly. Upgrade your plan for higher limits.
          </p>
        </div>
      )}
    </div>
  );
}