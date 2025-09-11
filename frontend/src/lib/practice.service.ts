interface PracticeConfig {
  jobTitle: string;
  industry: string;
  difficulty: 'junior' | 'mid' | 'senior';
  questionTypes: string[];
  questionCount: number;
  duration?: number;
}

interface PracticeSession {
  sessionId: string;
  questions: any[];
  status: string;
  createdAt: string;
}

interface PracticeResponse {
  sessionId: string;
  questionId: string;
  response: string;
  duration: number;
  usedAISuggestions?: boolean;
}

interface PracticeFeedback {
  overallScore: number;
  contentScore: number;
  structureScore: number;
  clarityScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
}

class PracticeService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async createPracticeSession(config: PracticeConfig): Promise<PracticeSession> {
    return this.request<PracticeSession>('/practice/sessions', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getPracticeSession(sessionId: string): Promise<any> {
    return this.request(`/practice/sessions/${sessionId}`);
  }

  async getNextQuestion(sessionId: string): Promise<any> {
    return this.request(`/practice/sessions/${sessionId}/next-question`);
  }

  async submitResponse(response: PracticeResponse): Promise<PracticeFeedback> {
    return this.request<PracticeFeedback>(`/practice/sessions/${response.sessionId}/responses`, {
      method: 'POST',
      body: JSON.stringify(response),
    });
  }

  async completePracticeSession(sessionId: string): Promise<any> {
    return this.request(`/practice/sessions/${sessionId}/complete`, {
      method: 'PUT',
    });
  }

  async pausePracticeSession(sessionId: string): Promise<void> {
    await this.request(`/practice/sessions/${sessionId}/pause`, {
      method: 'PUT',
    });
  }

  async resumePracticeSession(sessionId: string): Promise<void> {
    await this.request(`/practice/sessions/${sessionId}/resume`, {
      method: 'PUT',
    });
  }

  async abandonPracticeSession(sessionId: string): Promise<void> {
    await this.request(`/practice/sessions/${sessionId}/abandon`, {
      method: 'PUT',
    });
  }

  async getUserPracticeSessions(limit = 10): Promise<any[]> {
    return this.request(`/practice/sessions?limit=${limit}`);
  }

  async getUserAnalytics(): Promise<any> {
    return this.request('/practice/analytics');
  }

  async getSessionAnalytics(sessionId: string): Promise<any> {
    return this.request(`/practice/sessions/${sessionId}/analytics`);
  }

  async getQuestionsByCategory(category: string, limit = 10): Promise<any[]> {
    return this.request(`/practice/questions/categories/${category}?limit=${limit}`);
  }

  async initializeQuestionBank(): Promise<void> {
    await this.request('/practice/initialize-question-bank', {
      method: 'POST',
    });
  }
}

export const practiceService = new PracticeService();