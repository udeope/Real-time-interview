import { Injectable, Logger } from '@nestjs/common';
import { UserProfileAnalysisService } from './user-profile-analysis.service';
import { JobDescriptionParsingService } from './job-description-parsing.service';
import { ConversationHistoryService } from './conversation-history.service';
import { QuestionClassificationService } from './question-classification.service';
import {
  ContextData,
  UserProfile,
  JobContext,
  Experience,
  Skill,
  ResponseApproach,
  ConversationContext,
  QuestionClassification
} from '../interfaces/context-analysis.interface';

@Injectable()
export class ContextDataAggregationService {
  private readonly logger = new Logger(ContextDataAggregationService.name);

  constructor(
    private readonly userProfileService: UserProfileAnalysisService,
    private readonly jobParsingService: JobDescriptionParsingService,
    private readonly conversationService: ConversationHistoryService,
    private readonly questionClassificationService: QuestionClassificationService
  ) {}

  async getRelevantContext(
    userId: string,
    question: string,
    sessionId?: string,
    jobContext?: JobContext
  ): Promise<ContextData> {
    try {
      this.logger.debug(`Aggregating context data for user: ${userId}, question: ${question.substring(0, 50)}...`);

      // Get user profile
      const userProfile = await this.userProfileService.analyzeUserProfile(userId);

      // Get or use provided job context
      let finalJobContext = jobContext;
      if (!finalJobContext && sessionId) {
        finalJobContext = await this.getJobContextFromSession(sessionId);
      }

      // Get conversation history
      const conversationHistory = sessionId 
        ? await this.conversationService.getConversationHistory(sessionId, 20)
        : [];

      // Classify the current question
      const questionClassification = await this.questionClassificationService.classifyQuestion(
        question,
        undefined,
        finalJobContext
      );

      // Find relevant experiences based on question and job context
      const relevantExperiences = this.findRelevantExperiences(
        userProfile.experience,
        questionClassification,
        finalJobContext
      );

      // Find matching skills
      const matchingSkills = this.findMatchingSkills(
        userProfile.skills,
        questionClassification,
        finalJobContext
      );

      // Generate suggested approach
      const suggestedApproach = this.generateResponseApproach(
        questionClassification,
        relevantExperiences,
        matchingSkills,
        conversationHistory,
        userProfile.preferences
      );

      const contextData: ContextData = {
        userProfile,
        jobContext: finalJobContext || this.getDefaultJobContext(),
        conversationHistory,
        relevantExperiences,
        matchingSkills,
        suggestedApproach
      };

      this.logger.debug(`Context data aggregated successfully for user: ${userId}`);
      return contextData;

    } catch (error) {
      this.logger.error(`Error aggregating context data: ${error.message}`, error.stack);
      throw error;
    }
  }

  async analyzeQuestionContext(
    question: string,
    userProfile: UserProfile,
    jobContext?: JobContext,
    conversationHistory?: ConversationContext[]
  ): Promise<{
    classification: QuestionClassification;
    contextualFactors: string[];
    recommendedApproach: ResponseApproach;
    relevantExperiences: Experience[];
    keyPoints: string[];
  }> {
    try {
      this.logger.debug(`Analyzing question context: ${question.substring(0, 50)}...`);

      // Classify the question
      const classification = await this.questionClassificationService.classifyQuestion(
        question,
        undefined,
        jobContext
      );

      // Identify contextual factors
      const contextualFactors = this.identifyContextualFactors(
        question,
        classification,
        conversationHistory || [],
        jobContext
      );

      // Find relevant experiences
      const relevantExperiences = this.findRelevantExperiences(
        userProfile.experience,
        classification,
        jobContext
      );

      // Generate recommended approach
      const recommendedApproach = this.generateResponseApproach(
        classification,
        relevantExperiences,
        userProfile.skills,
        conversationHistory || [],
        userProfile.preferences
      );

      // Extract key points to address
      const keyPoints = this.extractKeyPoints(
        question,
        classification,
        relevantExperiences,
        jobContext
      );

      const analysis = {
        classification,
        contextualFactors,
        recommendedApproach,
        relevantExperiences,
        keyPoints
      };

      this.logger.debug(`Question context analyzed successfully`);
      return analysis;

    } catch (error) {
      this.logger.error(`Error analyzing question context: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async getJobContextFromSession(sessionId: string): Promise<JobContext | undefined> {
    try {
      // This would typically fetch from the session's job context
      // For now, we'll return undefined and let the caller handle it
      return undefined;
    } catch (error) {
      this.logger.warn(`Could not retrieve job context from session: ${sessionId}`);
      return undefined;
    }
  }

  private findRelevantExperiences(
    experiences: Experience[],
    questionClassification: QuestionClassification,
    jobContext?: JobContext
  ): Experience[] {
    const relevantExperiences: Array<{ experience: Experience; relevanceScore: number }> = [];

    for (const experience of experiences) {
      let relevanceScore = 0;

      // Score based on question type
      if (questionClassification.type === 'technical') {
        // Check for matching technologies
        const questionKeywords = questionClassification.keywords;
        const expTechnologies = experience.technologies.map(tech => tech.toLowerCase());
        
        for (const keyword of questionKeywords) {
          if (expTechnologies.some(tech => tech.includes(keyword.toLowerCase()))) {
            relevanceScore += 0.3;
          }
        }

        // Check role relevance for technical questions
        if (this.isTechnicalRole(experience.role)) {
          relevanceScore += 0.2;
        }
      }

      if (questionClassification.type === 'behavioral') {
        // Check achievements for behavioral indicators
        const achievementText = experience.achievements.join(' ').toLowerCase();
        const behavioralKeywords = ['led', 'managed', 'improved', 'collaborated', 'solved', 'delivered'];
        
        for (const keyword of behavioralKeywords) {
          if (achievementText.includes(keyword)) {
            relevanceScore += 0.2;
          }
        }
      }

      // Score based on job context match
      if (jobContext) {
        // Industry match
        if (this.isIndustryMatch(experience.company, jobContext.industry)) {
          relevanceScore += 0.2;
        }

        // Role similarity
        if (this.isRoleSimilar(experience.role, jobContext.title)) {
          relevanceScore += 0.3;
        }

        // Technology match
        const jobTech = this.extractTechnologiesFromJobDescription(jobContext.description);
        const commonTech = experience.technologies.filter(tech => 
          jobTech.some(jobTechItem => 
            jobTechItem.toLowerCase().includes(tech.toLowerCase()) ||
            tech.toLowerCase().includes(jobTechItem.toLowerCase())
          )
        );
        relevanceScore += commonTech.length * 0.1;
      }

      // Recency bonus (more recent experiences are more relevant)
      if (experience.endDate) {
        const monthsAgo = this.getMonthsAgo(experience.endDate);
        if (monthsAgo < 12) relevanceScore += 0.2;
        else if (monthsAgo < 24) relevanceScore += 0.1;
      } else {
        // Current role gets highest recency bonus
        relevanceScore += 0.3;
      }

      if (relevanceScore > 0.1) {
        relevantExperiences.push({ experience, relevanceScore });
      }
    }

    // Sort by relevance score and return top experiences
    return relevantExperiences
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5)
      .map(item => item.experience);
  }

  private findMatchingSkills(
    skills: Skill[],
    questionClassification: QuestionClassification,
    jobContext?: JobContext
  ): Skill[] {
    const matchingSkills: Array<{ skill: Skill; relevanceScore: number }> = [];

    for (const skill of skills) {
      let relevanceScore = 0;

      // Score based on question keywords
      const skillName = skill.name.toLowerCase();
      for (const keyword of questionClassification.keywords) {
        if (skillName.includes(keyword.toLowerCase()) || 
            keyword.toLowerCase().includes(skillName)) {
          relevanceScore += 0.4;
        }
      }

      // Score based on question type and skill category
      if (questionClassification.type === 'technical' && skill.category === 'technical') {
        relevanceScore += 0.3;
      } else if (questionClassification.type === 'behavioral' && skill.category === 'soft') {
        relevanceScore += 0.3;
      }

      // Score based on skill level
      const levelBonus = { beginner: 0.1, intermediate: 0.2, advanced: 0.3, expert: 0.4 };
      relevanceScore += levelBonus[skill.level] || 0.2;

      // Score based on job context requirements
      if (jobContext) {
        const jobRequirements = jobContext.requirements.join(' ').toLowerCase();
        if (jobRequirements.includes(skillName)) {
          relevanceScore += 0.5;
        }
      }

      // Recency bonus
      if (skill.lastUsed) {
        const monthsAgo = this.getMonthsAgo(skill.lastUsed);
        if (monthsAgo < 6) relevanceScore += 0.2;
        else if (monthsAgo < 12) relevanceScore += 0.1;
      }

      if (relevanceScore > 0.2) {
        matchingSkills.push({ skill, relevanceScore });
      }
    }

    // Sort by relevance and return top skills
    return matchingSkills
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 8)
      .map(item => item.skill);
  }

  private generateResponseApproach(
    questionClassification: QuestionClassification,
    relevantExperiences: Experience[],
    matchingSkills: Skill[],
    conversationHistory: ConversationContext[],
    userPreferences: any
  ): ResponseApproach {
    // Determine structure based on question type
    let structure: ResponseApproach['structure'] = 'direct';
    
    if (questionClassification.requiresSTAR) {
      structure = 'STAR';
    } else if (questionClassification.type === 'technical') {
      structure = 'technical';
    } else if (questionClassification.category === 'problem-solving') {
      structure = 'problem-solving';
    }

    // Determine tone based on question type and user preferences
    let tone: ResponseApproach['tone'] = 'professional';
    
    if (questionClassification.type === 'technical') {
      tone = 'analytical';
    } else if (questionClassification.type === 'behavioral') {
      tone = 'confident';
    } else if (questionClassification.category === 'motivation') {
      tone = 'enthusiastic';
    }

    // Adjust based on user preferences
    if (userPreferences.communicationStyle === 'casual') {
      tone = 'confident';
    } else if (userPreferences.communicationStyle === 'formal') {
      tone = 'professional';
    }

    // Generate focus points
    const focusPoints = this.generateFocusPoints(
      questionClassification,
      relevantExperiences,
      matchingSkills
    );

    // Determine if examples are needed
    const examplesNeeded = questionClassification.requiresSTAR || 
                          questionClassification.type === 'behavioral' ||
                          questionClassification.category.includes('experience');

    // Estimate duration based on structure and user preferences
    let estimatedDuration = 60; // Default 60 seconds
    
    if (structure === 'STAR') {
      estimatedDuration = 90;
    } else if (questionClassification.type === 'technical') {
      estimatedDuration = 75;
    }

    if (userPreferences.preferredResponseStyle === 'concise') {
      estimatedDuration *= 0.7;
    } else if (userPreferences.preferredResponseStyle === 'detailed') {
      estimatedDuration *= 1.3;
    }

    return {
      structure,
      tone,
      focusPoints,
      examplesNeeded,
      estimatedDuration: Math.round(estimatedDuration)
    };
  }

  private identifyContextualFactors(
    question: string,
    classification: QuestionClassification,
    conversationHistory: ConversationContext[],
    jobContext?: JobContext
  ): string[] {
    const factors: string[] = [];

    // Question complexity
    if (classification.difficulty === 'senior') {
      factors.push('High-level question requiring strategic thinking');
    } else if (classification.difficulty === 'junior') {
      factors.push('Foundational question focusing on basics');
    }

    // Interview flow context
    if (conversationHistory.length === 0) {
      factors.push('Opening question - sets the tone');
    } else if (conversationHistory.length > 10) {
      factors.push('Late in interview - demonstrate depth');
    }

    // Question type patterns in conversation
    const recentTypes = conversationHistory.slice(-3).map(ctx => ctx.questionClassification.type);
    if (recentTypes.every(type => type === 'technical')) {
      factors.push('Technical deep-dive session');
    } else if (recentTypes.every(type => type === 'behavioral')) {
      factors.push('Cultural fit assessment phase');
    }

    // Job context factors
    if (jobContext) {
      if (jobContext.interviewType === 'technical' && classification.type !== 'technical') {
        factors.push('Behavioral question in technical interview - show well-roundedness');
      }
      
      if (jobContext.seniority.toLowerCase().includes('senior') && classification.difficulty !== 'senior') {
        factors.push('Opportunity to demonstrate leadership perspective');
      }
    }

    // Question specificity
    if (question.length > 200) {
      factors.push('Detailed question requiring comprehensive response');
    } else if (question.length < 50) {
      factors.push('Broad question allowing creative interpretation');
    }

    return factors;
  }

  private generateFocusPoints(
    classification: QuestionClassification,
    experiences: Experience[],
    skills: Skill[]
  ): string[] {
    const focusPoints: string[] = [];

    // Add points based on question type
    if (classification.type === 'technical') {
      focusPoints.push('Demonstrate technical expertise');
      focusPoints.push('Show problem-solving approach');
      if (experiences.length > 0) {
        focusPoints.push('Reference relevant project experience');
      }
    } else if (classification.type === 'behavioral') {
      focusPoints.push('Use specific examples');
      focusPoints.push('Show impact and results');
      focusPoints.push('Demonstrate soft skills');
    }

    // Add points based on available experiences
    if (experiences.length > 0) {
      const hasLeadershipExp = experiences.some(exp => 
        this.hasLeadershipIndicators(exp.role, exp.achievements)
      );
      if (hasLeadershipExp) {
        focusPoints.push('Highlight leadership experience');
      }

      const hasRecentExp = experiences.some(exp => 
        !exp.endDate || this.getMonthsAgo(exp.endDate) < 12
      );
      if (hasRecentExp) {
        focusPoints.push('Reference recent relevant experience');
      }
    }

    // Add points based on skills
    const expertSkills = skills.filter(skill => skill.level === 'expert');
    if (expertSkills.length > 0) {
      focusPoints.push('Showcase expert-level skills');
    }

    return focusPoints.slice(0, 4); // Limit to top 4 focus points
  }

  private extractKeyPoints(
    question: string,
    classification: QuestionClassification,
    experiences: Experience[],
    jobContext?: JobContext
  ): string[] {
    const keyPoints: string[] = [];

    // Extract key points from question keywords
    for (const keyword of classification.keywords) {
      if (keyword.length > 3) {
        keyPoints.push(`Address ${keyword} specifically`);
      }
    }

    // Add structure-specific points
    if (classification.requiresSTAR) {
      keyPoints.push('Structure response using STAR method');
      keyPoints.push('Include specific metrics and outcomes');
    }

    // Add context-specific points
    if (jobContext && classification.type === 'technical') {
      const jobTech = this.extractTechnologiesFromJobDescription(jobContext.description);
      const relevantTech = jobTech.slice(0, 2);
      for (const tech of relevantTech) {
        keyPoints.push(`Mention experience with ${tech}`);
      }
    }

    return keyPoints.slice(0, 5);
  }

  // Helper methods
  private isTechnicalRole(role: string): boolean {
    const technicalKeywords = [
      'engineer', 'developer', 'programmer', 'architect', 'analyst',
      'scientist', 'technical', 'software', 'systems', 'data'
    ];
    const lowerRole = role.toLowerCase();
    return technicalKeywords.some(keyword => lowerRole.includes(keyword));
  }

  private isIndustryMatch(company: string, targetIndustry: string): boolean {
    // This is a simplified implementation
    // In practice, you might use a company database or API
    const industryKeywords = {
      'Technology': ['tech', 'software', 'digital', 'platform'],
      'Finance': ['bank', 'financial', 'capital', 'investment'],
      'Healthcare': ['health', 'medical', 'pharma', 'bio'],
      'E-commerce': ['commerce', 'retail', 'marketplace', 'shopping']
    };

    const keywords = industryKeywords[targetIndustry] || [];
    const lowerCompany = company.toLowerCase();
    
    return keywords.some(keyword => lowerCompany.includes(keyword));
  }

  private isRoleSimilar(role1: string, role2: string): boolean {
    const normalizedRole1 = role1.toLowerCase().replace(/[^a-z\s]/g, '');
    const normalizedRole2 = role2.toLowerCase().replace(/[^a-z\s]/g, '');
    
    const words1 = normalizedRole1.split(/\s+/);
    const words2 = normalizedRole2.split(/\s+/);
    
    const commonWords = words1.filter(word => 
      words2.includes(word) && word.length > 2
    );
    
    return commonWords.length >= 1;
  }

  private extractTechnologiesFromJobDescription(description: string): string[] {
    const techPatterns = [
      /\b(?:JavaScript|TypeScript|Python|Java|C#|Go|Rust|PHP|Ruby|Swift|Kotlin)\b/gi,
      /\b(?:React|Vue|Angular|Node\.?js|Express|NestJS|Django|Flask|Spring|Laravel)\b/gi,
      /\b(?:PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch)\b/gi,
      /\b(?:AWS|Azure|GCP|Docker|Kubernetes|Terraform)\b/gi
    ];

    const technologies: string[] = [];
    
    for (const pattern of techPatterns) {
      const matches = description.match(pattern);
      if (matches) {
        technologies.push(...matches);
      }
    }

    return [...new Set(technologies)];
  }

  private hasLeadershipIndicators(role: string, achievements: string[]): boolean {
    const leadershipKeywords = ['lead', 'manager', 'director', 'head', 'chief', 'senior'];
    const text = `${role} ${achievements.join(' ')}`.toLowerCase();
    
    return leadershipKeywords.some(keyword => text.includes(keyword));
  }

  private getMonthsAgo(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
  }

  private getDefaultJobContext(): JobContext {
    return {
      title: 'Software Engineer',
      company: 'Company',
      description: 'Software engineering position',
      requirements: [],
      companyValues: [],
      interviewType: 'mixed',
      seniority: 'Mid',
      industry: 'Technology'
    };
  }
}