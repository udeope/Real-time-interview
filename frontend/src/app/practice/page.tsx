'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Play, 
  RotateCcw, 
  Clock, 
  Target, 
  BookOpen,
  ChevronRight,
  Star
} from 'lucide-react';

// Mock data
const mockUser = {
  name: 'John Doe',
  email: 'john.doe@example.com'
};

const mockQuestionCategories = [
  {
    id: 'behavioral',
    name: 'Behavioral Questions',
    description: 'Questions about your past experiences and how you handle situations',
    count: 25,
    difficulty: 'Mixed',
    color: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'technical',
    name: 'Technical Questions',
    description: 'Questions about your technical skills and problem-solving abilities',
    count: 30,
    difficulty: 'Advanced',
    color: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  {
    id: 'situational',
    name: 'Situational Questions',
    description: 'Hypothetical scenarios to assess your decision-making skills',
    count: 20,
    difficulty: 'Intermediate',
    color: 'bg-green-50 text-green-700 border-green-200'
  },
  {
    id: 'cultural',
    name: 'Cultural Fit',
    description: 'Questions about company values and team collaboration',
    count: 15,
    difficulty: 'Easy',
    color: 'bg-orange-50 text-orange-700 border-orange-200'
  }
];

const mockPracticeHistory = [
  {
    id: '1',
    category: 'Behavioral',
    score: 88,
    questionsAnswered: 5,
    duration: 25,
    date: '2024-01-15'
  },
  {
    id: '2',
    category: 'Technical',
    score: 92,
    questionsAnswered: 3,
    duration: 18,
    date: '2024-01-12'
  },
  {
    id: '3',
    category: 'Situational',
    score: 79,
    questionsAnswered: 4,
    duration: 22,
    date: '2024-01-10'
  }
];

export default function PracticePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [practiceActive, setPracticeActive] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  const handleStartPractice = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setPracticeActive(true);
  };

  const handleStopPractice = () => {
    setPracticeActive(false);
    setSelectedCategory(null);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      case 'mixed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (practiceActive) {
    return (
      <MainLayout
        user={mockUser}
        onLogout={handleLogout}
      >
        <div className="space-y-6">
          {/* Practice Session Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5" />
                    <span>Practice Session - {mockQuestionCategories.find(c => c.id === selectedCategory)?.name}</span>
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Question 1 of 5 • Time: 02:34
                  </p>
                </div>
                <Button onClick={handleStopPractice} variant="outline">
                  End Session
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Current Question */}
          <Card>
            <CardHeader>
              <CardTitle>Current Question</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-lg text-gray-900">
                    "Tell me about a time when you had to work with a difficult team member. How did you handle the situation and what was the outcome?"
                  </p>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Target className="h-4 w-4" />
                    <span>Behavioral</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Recommended: 90 seconds</span>
                  </div>
                  <Badge className={getDifficultyColor('intermediate')}>
                    Intermediate
                  </Badge>
                </div>

                <div className="flex space-x-3">
                  <Button className="flex items-center space-x-2">
                    <Play className="h-4 w-4" />
                    <span>Start Recording</span>
                  </Button>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <RotateCcw className="h-4 w-4" />
                    <span>Skip Question</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm text-gray-600">1/5 questions</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '20%' }}></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      user={mockUser}
      onLogout={handleLogout}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Practice Mode</h1>
          <p className="text-green-100">
            Improve your interview skills with AI-powered practice sessions. Get instant feedback and track your progress.
          </p>
        </div>

        {/* Question Categories */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose a Practice Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockQuestionCategories.map((category) => (
              <Card key={category.id} className={`cursor-pointer transition-all hover:shadow-md border-2 ${category.color}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="flex items-center space-x-1">
                          <BookOpen className="h-4 w-4" />
                          <span>{category.count} questions</span>
                        </span>
                        <Badge className={getDifficultyColor(category.difficulty)}>
                          {category.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                  
                  <Button 
                    onClick={() => handleStartPractice(category.id)}
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>Start Practice</span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Practice History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Practice Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockPracticeHistory.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{session.category}</h4>
                      <p className="text-sm text-gray-600">
                        {session.questionsAnswered} questions • {session.duration} minutes
                      </p>
                      <p className="text-xs text-gray-500">{session.date}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-1 mb-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className={`font-semibold ${getScoreColor(session.score)}`}>
                        {session.score}%
                      </span>
                    </div>
                    <Button variant="ghost" size="sm">
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}