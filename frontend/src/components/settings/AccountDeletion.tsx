'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Trash2,
  AlertTriangle,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';
import { settingsService, AccountDeletionRequest } from '@/lib/settings.service';

interface AccountDeletionProps {
  onAccountDeleted?: () => void;
}

export default function AccountDeletion({ onAccountDeleted }: AccountDeletionProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [scheduledDeletion, setScheduledDeletion] = useState<Date | null>(null);
  const [deletionStep, setDeletionStep] = useState<'initial' | 'confirm' | 'schedule' | 'final'>('initial');
  const { toast } = useToast();

  const handleImmediateDeletion = async () => {
    setIsDeleting(true);
    
    try {
      const request: AccountDeletionRequest = {
        reason: reason || undefined,
        feedback: feedback || undefined,
      };

      const result = await settingsService.requestAccountDeletion(request);
      
      if (result.success) {
        toast({
          title: 'Account Deleted',
          description: 'Your account has been successfully deleted.',
        });
        
        // Clear local storage
        localStorage.clear();
        
        // Redirect or call callback
        if (onAccountDeleted) {
          onAccountDeleted();
        } else {
          window.location.href = '/';
        }
      } else {
        throw new Error('Account deletion failed');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleScheduleDeletion = async () => {
    if (!scheduledDeletion) return;

    try {
      await settingsService.scheduleAccountDeletion(scheduledDeletion);
      
      toast({
        title: 'Deletion Scheduled',
        description: `Your account will be deleted on ${scheduledDeletion.toLocaleDateString()}`,
      });
      
      setDeletionStep('initial');
      setScheduledDeletion(null);
    } catch (error) {
      console.error('Error scheduling deletion:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule account deletion.',
        variant: 'destructive',
      });
    }
  };

  const handleCancelDeletion = async () => {
    try {
      await settingsService.cancelAccountDeletion();
      
      toast({
        title: 'Deletion Cancelled',
        description: 'Your scheduled account deletion has been cancelled.',
      });
    } catch (error) {
      console.error('Error cancelling deletion:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel account deletion.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setDeletionStep('initial');
    setShowConfirmation(false);
    setReason('');
    setFeedback('');
    setScheduledDeletion(null);
  };

  const renderInitialStep = () => (
    <CardContent className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800">
              Warning: This action cannot be undone
            </h3>
            <p className="text-sm text-red-700 mt-1">
              Deleting your account will permanently remove all your data, including:
            </p>
            <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
              <li>Interview sessions and recordings</li>
              <li>Practice sessions and progress</li>
              <li>User profile and preferences</li>
              <li>Integration connections</li>
              <li>Subscription and billing history</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for deletion (optional)
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Select a reason...</option>
            <option value="not_useful">Not useful for my needs</option>
            <option value="too_expensive">Too expensive</option>
            <option value="privacy_concerns">Privacy concerns</option>
            <option value="found_alternative">Found a better alternative</option>
            <option value="technical_issues">Technical issues</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional feedback (optional)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Help us improve by sharing your feedback..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setDeletionStep('schedule')}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Deletion
        </Button>
        
        <Button
          variant="destructive"
          onClick={() => setDeletionStep('confirm')}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Now
        </Button>
      </div>
    </CardContent>
  );

  const renderConfirmStep = () => (
    <CardContent className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800">
              Final Confirmation Required
            </h3>
            <p className="text-sm text-red-700 mt-1">
              This will immediately and permanently delete your account and all associated data.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="font-medium text-gray-900 mb-2">Data to be deleted:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div className="flex items-center">
              <XCircle className="w-4 h-4 mr-2 text-red-500" />
              User Profile
            </div>
            <div className="flex items-center">
              <XCircle className="w-4 h-4 mr-2 text-red-500" />
              Interview Sessions
            </div>
            <div className="flex items-center">
              <XCircle className="w-4 h-4 mr-2 text-red-500" />
              Practice Sessions
            </div>
            <div className="flex items-center">
              <XCircle className="w-4 h-4 mr-2 text-red-500" />
              Integrations
            </div>
            <div className="flex items-center">
              <XCircle className="w-4 h-4 mr-2 text-red-500" />
              Preferences
            </div>
            <div className="flex items-center">
              <XCircle className="w-4 h-4 mr-2 text-red-500" />
              Subscriptions
            </div>
          </div>
        </div>

        {reason && (
          <div>
            <span className="text-sm font-medium text-gray-700">Reason: </span>
            <span className="text-sm text-gray-600">{reason}</span>
          </div>
        )}

        {feedback && (
          <div>
            <span className="text-sm font-medium text-gray-700">Feedback: </span>
            <p className="text-sm text-gray-600 mt-1">{feedback}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={resetForm}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        
        <Button
          variant="destructive"
          onClick={handleImmediateDeletion}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Confirm Deletion
            </>
          )}
        </Button>
      </div>
    </CardContent>
  );

  const renderScheduleStep = () => (
    <CardContent className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <Clock className="h-5 w-5 text-yellow-400 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">
              Schedule Account Deletion
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              You can schedule your account deletion for a future date. You can cancel this at any time before the scheduled date.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Deletion Date
        </label>
        <input
          type="date"
          min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
          value={scheduledDeletion?.toISOString().split('T')[0] || ''}
          onChange={(e) => setScheduledDeletion(new Date(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Minimum 24 hours from now
        </p>
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={resetForm}
        >
          Cancel
        </Button>
        
        <Button
          onClick={handleScheduleDeletion}
          disabled={!scheduledDeletion}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Deletion
        </Button>
      </div>
    </CardContent>
  );

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center text-red-600">
          <Shield className="w-5 h-5 mr-2" />
          Account Deletion
        </CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data
        </CardDescription>
      </CardHeader>
      
      {deletionStep === 'initial' && renderInitialStep()}
      {deletionStep === 'confirm' && renderConfirmStep()}
      {deletionStep === 'schedule' && renderScheduleStep()}
    </Card>
  );
}