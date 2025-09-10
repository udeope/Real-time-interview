'use client';

import { Building, User, Briefcase, Star, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { JobContext, UserProfile } from '@/types/ui.types';

interface ContextPanelProps {
  jobContext?: JobContext;
  userProfile?: UserProfile;
  className?: string;
}

export function ContextPanel({ jobContext, userProfile, className }: ContextPanelProps) {
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
    <div className={`space-y-4 ${className}`}>
      {/* Job Context */}
      {jobContext && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Briefcase className="h-5 w-5" />
              <span>Job Context</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Building className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">{jobContext.company}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {jobContext.title}
              </h3>
              <div className="flex items-center space-x-2 mb-3">
                <Badge className={getSeniorityColor(jobContext.seniority)}>
                  {jobContext.seniority}
                </Badge>
                <Badge variant="outline">
                  {jobContext.interviewType}
                </Badge>
              </div>
            </div>

            {jobContext.description && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {jobContext.description}
                </p>
              </div>
            )}

            {jobContext.requirements.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Key Requirements</h4>
                <ul className="space-y-1">
                  {jobContext.requirements.slice(0, 5).map((req, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      {req}
                    </li>
                  ))}
                  {jobContext.requirements.length > 5 && (
                    <li className="text-sm text-gray-500 italic">
                      +{jobContext.requirements.length - 5} more requirements
                    </li>
                  )}
                </ul>
              </div>
            )}

            {jobContext.companyValues.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Company Values</h4>
                <div className="flex flex-wrap gap-1">
                  {jobContext.companyValues.map((value, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Profile */}
      {userProfile && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Your Profile</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">{userProfile.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{userProfile.email}</p>
              <Badge className={getSeniorityColor(userProfile.seniority)}>
                {userProfile.seniority} Level
              </Badge>
            </div>

            {userProfile.industries.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Industries</h4>
                <div className="flex flex-wrap gap-1">
                  {userProfile.industries.map((industry, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {industry}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {userProfile.skills.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Top Skills</h4>
                <div className="space-y-2">
                  {userProfile.skills.slice(0, 6).map((skill, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{skill.name}</span>
                      <Badge className={getSkillLevelColor(skill.level)} variant="secondary">
                        {skill.level}
                      </Badge>
                    </div>
                  ))}
                  {userProfile.skills.length > 6 && (
                    <p className="text-sm text-gray-500 italic">
                      +{userProfile.skills.length - 6} more skills
                    </p>
                  )}
                </div>
              </div>
            )}

            {userProfile.experience.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Recent Experience</h4>
                <div className="space-y-3">
                  {userProfile.experience.slice(0, 3).map((exp, index) => (
                    <div key={index} className="border-l-2 border-blue-200 pl-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <Award className="h-3 w-3 text-blue-500" />
                        <span className="font-medium text-sm text-gray-900">{exp.role}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{exp.company}</p>
                      <p className="text-xs text-gray-500">{exp.duration}</p>
                      
                      {exp.technologies.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {exp.technologies.slice(0, 4).map((tech, techIndex) => (
                            <Badge key={techIndex} variant="outline" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                          {exp.technologies.length > 4 && (
                            <span className="text-xs text-gray-500">
                              +{exp.technologies.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {userProfile.experience.length > 3 && (
                    <p className="text-sm text-gray-500 italic">
                      +{userProfile.experience.length - 3} more positions
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!jobContext && !userProfile && (
        <Card>
          <CardContent className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <div className="text-lg mb-2">📋</div>
              <p>No context available</p>
              <p className="text-sm">Job and profile information will appear here</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}