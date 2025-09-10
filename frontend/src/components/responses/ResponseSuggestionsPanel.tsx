'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { Copy, Edit, Check, Clock, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ResponseOption } from '@/types/ui.types';

interface ResponseSuggestionsPanelProps {
  responses: ResponseOption[];
  isGenerating: boolean;
  onCopyResponse: (response: ResponseOption) => void;
  onEditResponse: (response: ResponseOption) => void;
  onSelectResponse: (response: ResponseOption) => void;
  className?: string;
}

export function ResponseSuggestionsPanel({
  responses,
  isGenerating,
  onCopyResponse,
  onEditResponse,
  onSelectResponse,
  className
}: ResponseSuggestionsPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleCopy = async (response: ResponseOption) => {
    try {
      await navigator.clipboard.writeText(response.content);
      setCopiedId(response.id);
      onCopyResponse(response);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy response:', error);
    }
  };

  const handleSelect = (response: ResponseOption) => {
    setSelectedId(response.id);
    onSelectResponse(response);
  };

  const getStructureBadge = (structure: ResponseOption['structure']) => {
    switch (structure) {
      case 'STAR':
        return <Badge variant="default">STAR Method</Badge>;
      case 'technical':
        return <Badge variant="secondary">Technical</Badge>;
      case 'direct':
        return <Badge variant="outline">Direct</Badge>;
      default:
        return null;
    }
  };

  const getDurationColor = (duration: number) => {
    if (duration <= 60) return 'text-green-600';
    if (duration <= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className={clsx('h-full flex flex-col', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Response Suggestions</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col min-h-0">
        {isGenerating ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-600">Generating responses...</p>
              <p className="text-sm text-gray-500">This may take a few seconds</p>
            </div>
          </div>
        ) : responses.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <div className="text-lg mb-2">💡</div>
              <p>No responses available</p>
              <p className="text-sm">Responses will appear when a question is detected</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto">
            {responses.map((response, index) => (
              <div
                key={response.id}
                className={clsx(
                  'p-4 border rounded-lg transition-all duration-200 hover:shadow-md',
                  selectedId === response.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 bg-white'
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      Option {index + 1}
                    </span>
                    {getStructureBadge(response.structure)}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className={clsx(
                      'text-xs font-medium',
                      getDurationColor(response.estimatedDuration)
                    )}>
                      {response.estimatedDuration}s
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-3">
                  <p className="text-sm text-gray-900 leading-relaxed">
                    {response.content}
                  </p>
                </div>

                {/* Tags */}
                {response.tags.length > 0 && (
                  <div className="flex items-center space-x-1 mb-3">
                    <Tag className="h-3 w-3 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {response.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(response)}
                      className="flex items-center space-x-1"
                    >
                      {copiedId === response.id ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copiedId === response.id ? 'Copied!' : 'Copy'}</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditResponse(response)}
                      className="flex items-center space-x-1"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Edit</span>
                    </Button>
                  </div>

                  <Button
                    variant={selectedId === response.id ? "secondary" : "default"}
                    size="sm"
                    onClick={() => handleSelect(response)}
                  >
                    {selectedId === response.id ? 'Selected' : 'Select'}
                  </Button>
                </div>

                {/* Confidence indicator */}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Confidence: {Math.round(response.confidence * 100)}%</span>
                    <div className="flex items-center space-x-1">
                      <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${response.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}