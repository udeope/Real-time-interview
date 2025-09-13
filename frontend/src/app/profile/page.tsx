'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { 
  User, 
  Mail, 
  Briefcase, 
  Plus, 
  Edit, 
  Trash2,
  Save,
  X
} from 'lucide-react';

const mockProfile = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  seniority: 'mid',
  industries: ['Technology', 'SaaS', 'E-commerce'],
  experience: [
    {
      id: '1',
      company: 'Previous Corp',
      role: 'Frontend Developer',
      duration: '2022-2024',
      achievements: ['Led UI redesign project', 'Improved performance by 40%'],
      technologies: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS']
    },
    {
      id: '2',
      company: 'StartupXYZ',
      role: 'Junior Developer',
      duration: '2020-2022',
      achievements: ['Built responsive web applications', 'Collaborated with design team'],
      technologies: ['JavaScript', 'Vue.js', 'CSS', 'Node.js']
    }
  ],
  skills: [
    { id: '1', name: 'React.js', level: 'advanced', category: 'Frontend' },
    { id: '2', name: 'TypeScript', level: 'intermediate', category: 'Language' },
    { id: '3', name: 'Node.js', level: 'intermediate', category: 'Backend' },
    { id: '4', name: 'CSS/SCSS', level: 'advanced', category: 'Frontend' },
    { id: '5', name: 'Git', level: 'advanced', category: 'Tools' }
  ]
};

function ProfileContent() {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editingExperience, setEditingExperience] = useState<string | null>(null);
  const [editingSkill, setEditingSkill] = useState<string | null>(null);

  const getSeniorityColor = (seniority: string) => {
    switch (seniority.toLowerCase()) {
      case 'junior':
        return 'bg-green-100 text-green-800';
      case 'mid':
        return 'bg-blue-100 text-blue-800';
      case 'senior':
        return 'bg-purple-100 text-purple-800';
      case 'lead':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSkillLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-red-100 text-red-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-blue-100 text-blue-800';
      case 'expert':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <MainLayout
      user={user}
      onLogout={logout}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Your Profile</h1>
              <p className="text-purple-100">
                Manage your professional information to get better interview assistance
              </p>
            </div>
            <Button 
              variant="secondary"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2"
            >
              {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
              <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
            </Button>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Basic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    defaultValue={mockProfile.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{mockProfile.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <p className="text-gray-900">{mockProfile.email}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seniority Level
              </label>
              {isEditing ? (
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="junior">Junior</option>
                  <option value="mid" selected>Mid-level</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                </select>
              ) : (
                <Badge className={getSeniorityColor(mockProfile.seniority)}>
                  {mockProfile.seniority} Level
                </Badge>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industries
              </label>
              <div className="flex flex-wrap gap-2">
                {mockProfile.industries.map((industry, index) => (
                  <Badge key={index} variant="outline">
                    {industry}
                    {isEditing && (
                      <button className="ml-1 text-red-500 hover:text-red-700">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
                {isEditing && (
                  <Button variant="outline" size="sm" className="flex items-center space-x-1">
                    <Plus className="h-3 w-3" />
                    <span>Add Industry</span>
                  </Button>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex space-x-2">
                <Button className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Experience */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5" />
                <span>Work Experience</span>
              </CardTitle>
              <Button variant="outline" size="sm" className="flex items-center space-x-1">
                <Plus className="h-3 w-3" />
                <span>Add Experience</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {mockProfile.experience.map((exp) => (
                <div key={exp.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">{exp.role}</h3>
                      <p className="text-gray-600">{exp.company}</p>
                      <p className="text-sm text-gray-500">{exp.duration}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingExperience(exp.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Key Achievements</h4>
                      <ul className="space-y-1">
                        {exp.achievements.map((achievement, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            {achievement}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Technologies Used</h4>
                      <div className="flex flex-wrap gap-1">
                        {exp.technologies.map((tech, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Skills & Expertise</CardTitle>
              <Button variant="outline" size="sm" className="flex items-center space-x-1">
                <Plus className="h-3 w-3" />
                <span>Add Skill</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockProfile.skills.map((skill) => (
                <div key={skill.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{skill.name}</h4>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingSkill(skill.id)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Badge className={getSkillLevelColor(skill.level)} variant="secondary">
                      {skill.level}
                    </Badge>
                    <p className="text-xs text-gray-500">{skill.category}</p>
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

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}