import { ErrorType, UserMessage } from '../types/error.types';

const errorMessages: Record<ErrorType, UserMessage> = {
  AUDIO_PERMISSION_DENIED: {
    title: 'Microphone Access Required',
    message: 'We need access to your microphone to capture interview audio.',
    instructions: [
      'Click the microphone icon in your browser address bar',
      'Select "Allow" for microphone access',
      'If you don\'t see the icon, check your browser settings',
      'Refresh the page after granting permission',
    ],
    actionButton: {
      text: 'Grant Permission',
      action: 'retry_audio_permission',
    },
    severity: 'warning',
    canRetry: true,
  },

  AUDIO_DEVICE_NOT_FOUND: {
    title: 'No Audio Device Found',
    message: 'We couldn\'t detect any microphone on your device.',
    instructions: [
      'Check that your microphone is properly connected',
      'Try unplugging and reconnecting your microphone',
      'Check your system audio settings',
      'Try using a different microphone if available',
    ],
    actionButton: {
      text: 'Detect Devices',
      action: 'detect_audio_devices',
    },
    severity: 'error',
    canRetry: true,
  },

  AUDIO_STREAM_INTERRUPTED: {
    title: 'Audio Connection Lost',
    message: 'The audio connection was interrupted. We\'re trying to reconnect.',
    instructions: [
      'Please wait while we attempt to reconnect',
      'Check your internet connection',
      'Ensure your microphone is still connected',
    ],
    severity: 'warning',
    canRetry: true,
    estimatedRecoveryTime: '10 seconds',
  },

  AUDIO_FORMAT_UNSUPPORTED: {
    title: 'Audio Format Not Supported',
    message: 'Your audio device is using an unsupported format.',
    instructions: [
      'Try using a different microphone',
      'Check your system audio settings',
      'Update your browser to the latest version',
      'Contact support if the problem persists',
    ],
    severity: 'error',
    canRetry: true,
  },

  TRANSCRIPTION_API_TIMEOUT: {
    title: 'Transcription Delayed',
    message: 'The transcription service is taking longer than usual. We\'re switching to a backup service.',
    instructions: [
      'Please continue speaking normally',
      'The transcription will catch up shortly',
      'Your audio is still being recorded',
    ],
    severity: 'warning',
    canRetry: false,
    estimatedRecoveryTime: '30 seconds',
  },

  TRANSCRIPTION_API_FAILURE: {
    title: 'Transcription Service Unavailable',
    message: 'We\'re having trouble with our transcription services. Switching to backup systems.',
    instructions: [
      'Please continue with your interview',
      'We\'re working to restore full functionality',
      'Your session data is being saved',
    ],
    severity: 'error',
    canRetry: true,
    estimatedRecoveryTime: '1-2 minutes',
  },

  TRANSCRIPTION_LOW_CONFIDENCE: {
    title: 'Audio Quality Issue',
    message: 'We\'re having trouble understanding the audio clearly.',
    instructions: [
      'Try speaking closer to your microphone',
      'Reduce background noise if possible',
      'Check that your microphone isn\'t muted',
      'Consider using headphones to reduce echo',
    ],
    actionButton: {
      text: 'Test Audio',
      action: 'test_audio_quality',
    },
    severity: 'warning',
    canRetry: true,
  },

  TRANSCRIPTION_RATE_LIMITED: {
    title: 'Service Temporarily Busy',
    message: 'Our transcription service is experiencing high demand. Please wait a moment.',
    instructions: [
      'We\'re automatically retrying your request',
      'No action needed from you',
      'Service should resume shortly',
    ],
    severity: 'info',
    canRetry: false,
    estimatedRecoveryTime: '30-60 seconds',
  },

  LLM_API_FAILURE: {
    title: 'AI Assistant Temporarily Unavailable',
    message: 'Our AI response system is having issues. Switching to backup systems.',
    instructions: [
      'Response suggestions may be delayed',
      'You can continue your interview normally',
      'We\'re working to restore full functionality',
    ],
    severity: 'warning',
    canRetry: true,
    estimatedRecoveryTime: '1-2 minutes',
  },

  LLM_CONTEXT_MISSING: {
    title: 'Limited Context Available',
    message: 'We have limited information about your profile or the job. Responses may be more generic.',
    instructions: [
      'Consider updating your profile for better suggestions',
      'Add job details in the context panel',
      'Generic responses are still available',
    ],
    actionButton: {
      text: 'Update Profile',
      action: 'update_profile',
    },
    severity: 'info',
    canRetry: false,
  },

  LLM_RESPONSE_TOO_LONG: {
    title: 'Response Optimized',
    message: 'We\'ve shortened the suggested response to fit within the recommended time limit.',
    instructions: [
      'The response has been automatically optimized',
      'You can expand it if needed',
      'Consider the 90-second speaking guideline',
    ],
    actionButton: {
      text: 'Show Full Response',
      action: 'show_full_response',
    },
    severity: 'info',
    canRetry: false,
  },

  LLM_RATE_LIMITED: {
    title: 'AI Service Busy',
    message: 'Our AI service is experiencing high demand. Switching to backup systems.',
    instructions: [
      'Response generation may be slower',
      'We\'re automatically switching providers',
      'Service should improve shortly',
    ],
    severity: 'warning',
    canRetry: false,
    estimatedRecoveryTime: '1-2 minutes',
  },

  DATABASE_CONNECTION_FAILED: {
    title: 'Connection Issue',
    message: 'We\'re having trouble saving your data. Reconnecting now.',
    instructions: [
      'Your session will continue normally',
      'We\'re automatically reconnecting',
      'Recent data may need to be re-entered',
    ],
    severity: 'warning',
    canRetry: true,
    estimatedRecoveryTime: '10-30 seconds',
  },

  REDIS_CONNECTION_FAILED: {
    title: 'Performance Temporarily Reduced',
    message: 'Some features may be slower while we restore full performance.',
    instructions: [
      'Core functionality remains available',
      'Response caching is temporarily disabled',
      'Performance will improve shortly',
    ],
    severity: 'info',
    canRetry: true,
    estimatedRecoveryTime: '1-2 minutes',
  },

  WEBSOCKET_CONNECTION_FAILED: {
    title: 'Real-time Connection Lost',
    message: 'We\'re reconnecting to restore real-time features.',
    instructions: [
      'Please wait while we reconnect',
      'You may need to refresh if issues persist',
      'Your session data is safe',
    ],
    actionButton: {
      text: 'Reconnect Now',
      action: 'reconnect_websocket',
    },
    severity: 'warning',
    canRetry: true,
    estimatedRecoveryTime: '10-20 seconds',
  },

  SERVICE_UNAVAILABLE: {
    title: 'Service Temporarily Unavailable',
    message: 'We\'re experiencing technical difficulties. Please try again in a few minutes.',
    instructions: [
      'Save any important work',
      'Try refreshing the page',
      'Contact support if the issue persists',
      'Check our status page for updates',
    ],
    actionButton: {
      text: 'Refresh Page',
      action: 'refresh_page',
    },
    severity: 'error',
    canRetry: true,
    estimatedRecoveryTime: '5-10 minutes',
  },

  NETWORK_TIMEOUT: {
    title: 'Network Timeout',
    message: 'The request took too long to complete. Checking your connection.',
    instructions: [
      'Check your internet connection',
      'Try moving closer to your router',
      'Close other bandwidth-heavy applications',
      'We\'ll automatically retry the request',
    ],
    severity: 'warning',
    canRetry: true,
    estimatedRecoveryTime: '30 seconds',
  },

  NETWORK_UNREACHABLE: {
    title: 'Connection Problem',
    message: 'We can\'t reach our servers. Please check your internet connection.',
    instructions: [
      'Check your internet connection',
      'Try refreshing the page',
      'Disable VPN if you\'re using one',
      'Contact your network administrator if needed',
    ],
    actionButton: {
      text: 'Test Connection',
      action: 'test_connection',
    },
    severity: 'error',
    canRetry: true,
  },

  API_QUOTA_EXCEEDED: {
    title: 'Usage Limit Reached',
    message: 'You\'ve reached your usage limit for this session. Consider upgrading your plan.',
    instructions: [
      'Your current session will continue with limited features',
      'Upgrade your plan for unlimited usage',
      'Usage limits reset daily',
    ],
    actionButton: {
      text: 'Upgrade Plan',
      action: 'upgrade_plan',
    },
    severity: 'warning',
    canRetry: false,
  },
};

export function getUserMessage(errorType: ErrorType): UserMessage {
  return errorMessages[errorType] || getDefaultMessage();
}

function getDefaultMessage(): UserMessage {
  return {
    title: 'Unexpected Error',
    message: 'Something unexpected happened. We\'re working to fix it.',
    instructions: [
      'Try refreshing the page',
      'Check your internet connection',
      'Contact support if the problem persists',
    ],
    actionButton: {
      text: 'Try Again',
      action: 'retry_operation',
    },
    severity: 'error',
    canRetry: true,
  };
}