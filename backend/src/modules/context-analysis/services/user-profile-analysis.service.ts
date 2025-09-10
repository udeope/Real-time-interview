import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../config/database.config';
import { UserProfile, Experience, Skill, SkillExtraction } from '../interfaces/context-analysis.interface';

@Injectable()
export class UserProfileAnalysisService {
  private readonly logger = new Logger(UserProfileAnalysisService.name);

  constructor(private readonly prisma: DatabaseService) {}

  async analyzeUserProfile(userId: string): Promise<UserProfile> {
    try {
      this.logger.debug(`Analyzing user profile for user: ${userId}`);

      const userWithProfile = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      });

      if (!userWithProfile?.profile) {
        throw new Error(`User profile not found for user: ${userId}`);
      }

      const profile = userWithProfile.profile;

      // Parse stored JSON data
      const experience = this.parseExperience(profile.experience as any);
      const skills = this.parseSkills(profile.skills as any);
      const industries = this.parseIndustries(profile.industries as any);
      const preferences = this.parsePreferences(profile.preferences as any);

      // Enhance profile with extracted skills from experience
      const extractedSkillsResult = await this.extractSkillsFromExperience(experience);
      const enhancedSkills = this.mergeSkills(skills, extractedSkillsResult.extractedSkills);

      const userProfile: UserProfile = {
        userId,
        experience,
        skills: enhancedSkills,
        industries,
        seniority: (profile.seniority as any) || this.calculateSeniority(experience),
        preferences
      };

      this.logger.debug(`User profile analyzed successfully for user: ${userId}`);
      return userProfile;

    } catch (error) {
      this.logger.error(`Error analyzing user profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  async extractSkillsFromExperience(experiences: Experience[]): Promise<SkillExtraction> {
    try {
      const extractedSkills: Skill[] = [];
      const skillMap = new Map<string, Skill>();

      for (const exp of experiences) {
        // Extract skills from technologies
        for (const tech of exp.technologies) {
          const skill = this.createSkillFromTechnology(tech, exp);
          if (skill) {
            const existing = skillMap.get(skill.name.toLowerCase());
            if (existing) {
              // Merge skills, taking the higher level
              existing.yearsOfExperience = Math.max(
                existing.yearsOfExperience || 0,
                skill.yearsOfExperience || 0
              );
              if (this.getSkillLevelValue(skill.level) > this.getSkillLevelValue(existing.level)) {
                existing.level = skill.level;
              }
            } else {
              skillMap.set(skill.name.toLowerCase(), skill);
            }
          }
        }

        // Extract skills from achievements and descriptions
        const achievementSkills = this.extractSkillsFromText(
          exp.achievements.join(' ') + ' ' + (exp.description || ''),
          exp
        );

        for (const skill of achievementSkills) {
          const existing = skillMap.get(skill.name.toLowerCase());
          if (existing) {
            existing.yearsOfExperience = Math.max(
              existing.yearsOfExperience || 0,
              skill.yearsOfExperience || 0
            );
          } else {
            skillMap.set(skill.name.toLowerCase(), skill);
          }
        }
      }

      return {
        extractedSkills: Array.from(skillMap.values()),
        confidence: 0.8,
        source: 'experience'
      };

    } catch (error) {
      this.logger.error(`Error extracting skills from experience: ${error.message}`, error.stack);
      return {
        extractedSkills: [],
        confidence: 0,
        source: 'experience'
      };
    }
  }

  private parseExperience(experienceData: any): Experience[] {
    if (!experienceData || !Array.isArray(experienceData)) {
      return [];
    }

    return experienceData.map(exp => ({
      company: exp.company || '',
      role: exp.role || '',
      duration: exp.duration || '',
      achievements: Array.isArray(exp.achievements) ? exp.achievements : [],
      technologies: Array.isArray(exp.technologies) ? exp.technologies : [],
      startDate: exp.startDate ? new Date(exp.startDate) : undefined,
      endDate: exp.endDate ? new Date(exp.endDate) : undefined,
      description: exp.description || ''
    }));
  }

  private parseSkills(skillsData: any): Skill[] {
    if (!skillsData || !Array.isArray(skillsData)) {
      return [];
    }

    return skillsData.map(skill => ({
      name: skill.name || '',
      level: skill.level || 'intermediate',
      category: skill.category || 'technical',
      yearsOfExperience: skill.yearsOfExperience || 0,
      lastUsed: skill.lastUsed ? new Date(skill.lastUsed) : undefined
    }));
  }

  private parseIndustries(industriesData: any): string[] {
    if (!industriesData) return [];
    if (Array.isArray(industriesData)) return industriesData;
    if (typeof industriesData === 'string') return [industriesData];
    return [];
  }

  private parsePreferences(preferencesData: any): any {
    return {
      preferredResponseStyle: preferencesData?.preferredResponseStyle || 'detailed',
      focusAreas: Array.isArray(preferencesData?.focusAreas) ? preferencesData.focusAreas : [],
      avoidTopics: Array.isArray(preferencesData?.avoidTopics) ? preferencesData.avoidTopics : [],
      communicationStyle: preferencesData?.communicationStyle || 'adaptive'
    };
  }

  private calculateSeniority(experiences: Experience[]): 'junior' | 'mid' | 'senior' | 'lead' {
    if (experiences.length === 0) return 'junior';

    // Calculate total years of experience
    let totalYears = 0;
    let hasLeadershipRole = false;

    for (const exp of experiences) {
      // Parse duration to estimate years
      const years = this.parseDurationToYears(exp.duration);
      totalYears += years;

      // Check for leadership indicators
      if (this.hasLeadershipIndicators(exp)) {
        hasLeadershipRole = true;
      }
    }

    if (totalYears >= 8 || hasLeadershipRole) return 'lead';
    if (totalYears >= 5) return 'senior';
    if (totalYears >= 2) return 'mid';
    return 'junior';
  }

  private parseDurationToYears(duration: string): number {
    const yearMatch = duration.match(/(\d+)\s*year/i);
    const monthMatch = duration.match(/(\d+)\s*month/i);

    let years = 0;
    if (yearMatch) years += parseInt(yearMatch[1]);
    if (monthMatch) years += parseInt(monthMatch[1]) / 12;

    return years;
  }

  private hasLeadershipIndicators(experience: Experience): boolean {
    const leadershipKeywords = [
      'lead', 'manager', 'director', 'head', 'chief', 'senior', 'principal',
      'architect', 'team lead', 'tech lead', 'engineering manager'
    ];

    const text = `${experience.role} ${experience.achievements.join(' ')} ${experience.description || ''}`.toLowerCase();
    
    return leadershipKeywords.some(keyword => text.includes(keyword));
  }

  private createSkillFromTechnology(technology: string, experience: Experience): Skill | null {
    const techSkillMap = {
      // Programming Languages
      'javascript': { category: 'technical', level: 'intermediate' },
      'typescript': { category: 'technical', level: 'intermediate' },
      'python': { category: 'technical', level: 'intermediate' },
      'java': { category: 'technical', level: 'intermediate' },
      'c#': { category: 'technical', level: 'intermediate' },
      'go': { category: 'technical', level: 'intermediate' },
      'rust': { category: 'technical', level: 'intermediate' },
      'php': { category: 'technical', level: 'intermediate' },

      // Frameworks
      'react': { category: 'technical', level: 'intermediate' },
      'vue': { category: 'technical', level: 'intermediate' },
      'angular': { category: 'technical', level: 'intermediate' },
      'node.js': { category: 'technical', level: 'intermediate' },
      'express': { category: 'technical', level: 'intermediate' },
      'nestjs': { category: 'technical', level: 'intermediate' },
      'django': { category: 'technical', level: 'intermediate' },
      'flask': { category: 'technical', level: 'intermediate' },
      'spring': { category: 'technical', level: 'intermediate' },

      // Databases
      'postgresql': { category: 'technical', level: 'intermediate' },
      'mysql': { category: 'technical', level: 'intermediate' },
      'mongodb': { category: 'technical', level: 'intermediate' },
      'redis': { category: 'technical', level: 'intermediate' },

      // Cloud & DevOps
      'aws': { category: 'technical', level: 'intermediate' },
      'azure': { category: 'technical', level: 'intermediate' },
      'gcp': { category: 'technical', level: 'intermediate' },
      'docker': { category: 'technical', level: 'intermediate' },
      'kubernetes': { category: 'technical', level: 'intermediate' },
      'terraform': { category: 'technical', level: 'intermediate' }
    };

    const normalizedTech = technology.toLowerCase().trim();
    const skillConfig = techSkillMap[normalizedTech];

    if (!skillConfig) return null;

    const experienceYears = this.parseDurationToYears(experience.duration);
    
    return {
      name: technology,
      level: this.adjustSkillLevel(skillConfig.level as any, experienceYears),
      category: skillConfig.category as any,
      yearsOfExperience: experienceYears,
      lastUsed: experience.endDate || new Date()
    };
  }

  private extractSkillsFromText(text: string, experience: Experience): Skill[] {
    const skills: Skill[] = [];
    const softSkillKeywords = {
      'leadership': 'soft',
      'communication': 'soft',
      'teamwork': 'soft',
      'problem solving': 'soft',
      'project management': 'soft',
      'agile': 'soft',
      'scrum': 'soft',
      'mentoring': 'soft',
      'collaboration': 'soft'
    };

    const normalizedText = text.toLowerCase();
    
    for (const [keyword, category] of Object.entries(softSkillKeywords)) {
      if (normalizedText.includes(keyword)) {
        skills.push({
          name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          level: 'intermediate',
          category: category as any,
          yearsOfExperience: this.parseDurationToYears(experience.duration)
        });
      }
    }

    return skills;
  }

  private adjustSkillLevel(baseLevel: string, experienceYears: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    if (experienceYears >= 5) return 'expert';
    if (experienceYears >= 3) return 'advanced';
    if (experienceYears >= 1) return 'intermediate';
    return 'beginner';
  }

  private getSkillLevelValue(level: string): number {
    const levelValues = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    return levelValues[level] || 2;
  }

  private mergeSkills(existingSkills: Skill[], extractedSkills: Skill[]): Skill[] {
    const skillMap = new Map<string, Skill>();

    // Add existing skills
    for (const skill of existingSkills) {
      skillMap.set(skill.name.toLowerCase(), skill);
    }

    // Merge extracted skills
    for (const skill of extractedSkills) {
      const existing = skillMap.get(skill.name.toLowerCase());
      if (existing) {
        // Keep the higher level and more recent experience
        existing.yearsOfExperience = Math.max(
          existing.yearsOfExperience || 0,
          skill.yearsOfExperience || 0
        );
        if (this.getSkillLevelValue(skill.level) > this.getSkillLevelValue(existing.level)) {
          existing.level = skill.level;
        }
        if (skill.lastUsed && (!existing.lastUsed || skill.lastUsed > existing.lastUsed)) {
          existing.lastUsed = skill.lastUsed;
        }
      } else {
        skillMap.set(skill.name.toLowerCase(), skill);
      }
    }

    return Array.from(skillMap.values());
  }
}