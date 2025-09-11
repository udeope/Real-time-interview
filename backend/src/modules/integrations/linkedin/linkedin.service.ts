import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { UserProfileAnalysisService } from '../../context-analysis/services/user-profile-analysis.service';

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline: string;
  summary: string;
  positions: LinkedInPosition[];
  skills: LinkedInSkill[];
  educations: LinkedInEducation[];
}

export interface LinkedInPosition {
  id: string;
  title: string;
  companyName: string;
  description: string;
  startDate: { month: number; year: number };
  endDate?: { month: number; year: number };
  isCurrent: boolean;
}

export interface LinkedInSkill {
  name: string;
  endorsementCount: number;
}

export interface LinkedInEducation {
  schoolName: string;
  degree: string;
  fieldOfStudy: string;
  startDate: { year: number };
  endDate: { year: number };
}

@Injectable()
export class LinkedInService {
  private readonly logger = new Logger(LinkedInService.name);
  private readonly baseUrl = 'https://api.linkedin.com/v2';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly userProfileService: UserProfileAnalysisService,
  ) {}

  async getAuthUrl(state: string): Promise<string> {
    const clientId = this.configService.get<string>('LINKEDIN_CLIENT_ID');
    const redirectUri = this.configService.get<string>('LINKEDIN_REDIRECT_URI');
    const scope = 'r_liteprofile r_emailaddress r_basicprofile';

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope,
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const clientId = this.configService.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret = this.configService.get<string>('LINKEDIN_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('LINKEDIN_REDIRECT_URI');

    try {
      const response = await firstValueFrom(
        this.httpService.post('https://www.linkedin.com/oauth/v2/accessToken', {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      return response.data.access_token;
    } catch (error) {
      this.logger.error('Failed to exchange LinkedIn code for token', error);
      throw new BadRequestException('Invalid LinkedIn authorization code');
    }
  }

  async getProfile(accessToken: string): Promise<LinkedInProfile> {
    try {
      // Get basic profile
      const profileResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/people/~`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
      );

      // Get positions
      const positionsResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/people/~/positions`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
      );

      // Get skills
      const skillsResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/people/~/skills`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
      );

      // Get education
      const educationResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/people/~/educations`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
      );

      return {
        id: profileResponse.data.id,
        firstName: profileResponse.data.firstName?.localized?.en_US || '',
        lastName: profileResponse.data.lastName?.localized?.en_US || '',
        headline: profileResponse.data.headline?.localized?.en_US || '',
        summary: profileResponse.data.summary?.localized?.en_US || '',
        positions: this.mapPositions(positionsResponse.data.values || []),
        skills: this.mapSkills(skillsResponse.data.values || []),
        educations: this.mapEducations(educationResponse.data.values || []),
      };
    } catch (error) {
      this.logger.error('Failed to fetch LinkedIn profile', error);
      throw new BadRequestException('Failed to fetch LinkedIn profile');
    }
  }

  async syncUserProfile(userId: string, accessToken: string): Promise<void> {
    const linkedInProfile = await this.getProfile(accessToken);
    
    // Extract experience from LinkedIn positions
    const experience = linkedInProfile.positions.map(position => ({
      company: position.companyName,
      role: position.title,
      duration: this.formatDuration(position.startDate, position.endDate),
      achievements: position.description ? [position.description] : [],
      technologies: this.extractTechnologies(position.description || ''),
    }));

    // Extract skills
    const skills = linkedInProfile.skills.map(skill => ({
      name: skill.name,
      level: this.mapEndorsementCountToLevel(skill.endorsementCount),
      category: 'professional', // Could be enhanced with skill categorization
    }));

    // Determine seniority based on experience
    const seniority = this.determineSeniority(linkedInProfile.positions);

    // Update user profile
    await this.userProfileService.updateProfile(userId, {
      experience,
      skills,
      seniority,
      linkedInId: linkedInProfile.id,
      lastLinkedInSync: new Date(),
    });

    this.logger.log(`Successfully synced LinkedIn profile for user ${userId}`);
  }

  private mapPositions(positions: any[]): LinkedInPosition[] {
    return positions.map(position => ({
      id: position.id,
      title: position.title?.localized?.en_US || '',
      companyName: position.companyName?.localized?.en_US || '',
      description: position.description?.localized?.en_US || '',
      startDate: position.startDate || { month: 1, year: new Date().getFullYear() },
      endDate: position.endDate,
      isCurrent: !position.endDate,
    }));
  }

  private mapSkills(skills: any[]): LinkedInSkill[] {
    return skills.map(skill => ({
      name: skill.name?.localized?.en_US || '',
      endorsementCount: skill.endorsementCount || 0,
    }));
  }

  private mapEducations(educations: any[]): LinkedInEducation[] {
    return educations.map(education => ({
      schoolName: education.schoolName?.localized?.en_US || '',
      degree: education.degree?.localized?.en_US || '',
      fieldOfStudy: education.fieldOfStudy?.localized?.en_US || '',
      startDate: education.startDate || { year: new Date().getFullYear() },
      endDate: education.endDate || { year: new Date().getFullYear() },
    }));
  }

  private formatDuration(startDate: { month: number; year: number }, endDate?: { month: number; year: number }): string {
    const start = `${startDate.month}/${startDate.year}`;
    const end = endDate ? `${endDate.month}/${endDate.year}` : 'Present';
    return `${start} - ${end}`;
  }

  private extractTechnologies(description: string): string[] {
    // Simple technology extraction - could be enhanced with NLP
    const techKeywords = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'React', 'Angular', 'Vue',
      'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'Spring', '.NET',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB',
      'Redis', 'GraphQL', 'REST', 'API', 'Microservices'
    ];

    return techKeywords.filter(tech => 
      description.toLowerCase().includes(tech.toLowerCase())
    );
  }

  private mapEndorsementCountToLevel(endorsementCount: number): string {
    if (endorsementCount >= 50) return 'expert';
    if (endorsementCount >= 20) return 'advanced';
    if (endorsementCount >= 5) return 'intermediate';
    return 'beginner';
  }

  private determineSeniority(positions: LinkedInPosition[]): string {
    const totalYears = positions.reduce((total, position) => {
      const startYear = position.startDate.year;
      const endYear = position.endDate?.year || new Date().getFullYear();
      return total + (endYear - startYear);
    }, 0);

    if (totalYears >= 8) return 'senior';
    if (totalYears >= 4) return 'mid';
    return 'junior';
  }
}