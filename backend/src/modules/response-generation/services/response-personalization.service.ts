import { Injectable, Logger } from '@nestjs/common';
import { 
  PersonalizationContext,
  ResponseOption,
  UserProfile,
  JobContext,
  Experience,
  Skill,
  ResponseTone,
  ResponseStructure
} from '../interfaces/response-generation.interface';

@Injectable()
export class ResponsePersonalizationService {
  private readonly logger = new Logger(ResponsePersonalizationService.name);

  /**
   * Personalize response based on user profile and job context
   */
  async personalizeResponse(
    template: string, 
    context: PersonalizationContext
  ): Promise<string> {
    try {
      let personalizedResponse = template;

      // Apply user-specific personalization
      personalizedResponse = this.applyUserPersonalization(personalizedResponse, context.userProfile);
      
      // Apply job-specific personalization
      personalizedResponse = this.applyJobPersonalization(personalizedResponse, context.jobContext);
      
      // Apply experience-based personalization
      personalizedResponse = this.applyExperiencePersonalization(
        personalizedResponse, 
        context.relevantExperiences
      );
      
      // Apply skill-based personalization
      personalizedResponse = this.applySkillPersonalization(
        personalizedResponse, 
        context.matchingSkills
      );
      
      // Apply communication style
      personalizedResponse = this.applyCommunicationStyle(
        personalizedResponse, 
        context.userProfile.preferences.communicationStyle
      );

      return personalizedResponse;
    } catch (error) {
      this.logger.error('Error personalizing response:', error);
      return template; // Return original template if personalization fails
    }
  }

  /**
   * Generate multiple response options with different approaches and tones
   */
  async generateMultipleOptions(
    baseResponse: string,
    context: PersonalizationContext,
    count: number = 3
  ): Promise<ResponseOption[]> {
    const options: ResponseOption[] = [];
    const tones: ResponseTone[] = ['concise', 'detailed', 'balanced'];
    const structures: ResponseStructure[] = ['direct', 'storytelling', 'technical'];

    for (let i = 0; i < Math.min(count, 3); i++) {
      const tone = tones[i];
      const structure = this.selectOptimalStructure(context, structures[i]);
      
      const personalizedContent = await this.personalizeForToneAndStructure(
        baseResponse,
        context,
        tone,
        structure
      );

      options.push({
        id: `personalized-${Date.now()}-${i}`,
        content: personalizedContent,
        structure,
        estimatedDuration: this.estimateDuration(personalizedContent),
        confidence: this.calculateConfidence(personalizedContent, context),
        tags: this.generateTags(context, structure, tone),
        tone,
        reasoning: this.generateReasoning(structure, tone, context)
      });
    }

    return options;
  }

  /**
   * Adapt response tone based on user preferences and job context
   */
  adaptResponseTone(
    response: string, 
    targetTone: ResponseTone, 
    userProfile: UserProfile
  ): string {
    switch (targetTone) {
      case 'concise':
        return this.makeConcise(response, userProfile);
      case 'detailed':
        return this.makeDetailed(response, userProfile);
      case 'balanced':
        return this.makeBalanced(response, userProfile);
      default:
        return response;
    }
  }

  /**
   * Select optimal response structure based on question type and user profile
   */
  selectOptimalStructure(
    context: PersonalizationContext, 
    preferredStructure?: ResponseStructure
  ): ResponseStructure {
    if (preferredStructure) return preferredStructure;

    const { questionClassification, userProfile } = context;
    
    // Use STAR for behavioral questions
    if (questionClassification?.requiresSTAR || questionClassification?.type === 'behavioral') {
      return 'STAR';
    }
    
    // Use technical structure for technical questions
    if (questionClassification?.type === 'technical') {
      return 'technical';
    }
    
    // Use storytelling for senior professionals who prefer detailed responses
    if (userProfile.seniority === 'senior' || userProfile.seniority === 'lead') {
      if (userProfile.preferences.preferredResponseStyle === 'storytelling') {
        return 'storytelling';
      }
    }
    
    return 'direct';
  }

  private async personalizeForToneAndStructure(
    baseResponse: string,
    context: PersonalizationContext,
    tone: ResponseTone,
    structure: ResponseStructure
  ): Promise<string> {
    let response = baseResponse;
    
    // Apply structure-specific modifications
    response = this.applyStructureModifications(response, structure, context);
    
    // Apply tone-specific modifications
    response = this.adaptResponseTone(response, tone, context.userProfile);
    
    return response;
  }

  private applyUserPersonalization(response: string, userProfile: UserProfile): string {
    let personalized = response;
    
    // Replace generic placeholders with user-specific information
    personalized = personalized.replace(
      /\{seniority\}/g, 
      userProfile.seniority
    );
    
    personalized = personalized.replace(
      /\{industry\}/g, 
      userProfile.industries[0] || 'technology'
    );
    
    // Add user's focus areas
    if (userProfile.preferences.focusAreas.length > 0) {
      const focusArea = userProfile.preferences.focusAreas[0];
      personalized = personalized.replace(
        /\{focus_area\}/g, 
        focusArea
      );
    }
    
    return personalized;
  }

  private applyJobPersonalization(response: string, jobContext: JobContext): string {
    let personalized = response;
    
    personalized = personalized.replace(/\{job_title\}/g, jobContext.title);
    personalized = personalized.replace(/\{company\}/g, jobContext.company);
    personalized = personalized.replace(/\{job_industry\}/g, jobContext.industry);
    
    // Incorporate company values if mentioned
    if (jobContext.companyValues.length > 0) {
      const primaryValue = jobContext.companyValues[0];
      personalized = personalized.replace(/\{company_value\}/g, primaryValue);
    }
    
    return personalized;
  }

  private applyExperiencePersonalization(response: string, experiences: Experience[]): string {
    if (experiences.length === 0) return response;
    
    const mostRelevant = experiences[0];
    let personalized = response;
    
    personalized = personalized.replace(/\{previous_company\}/g, mostRelevant.company);
    personalized = personalized.replace(/\{previous_role\}/g, mostRelevant.role);
    personalized = personalized.replace(/\{experience_duration\}/g, mostRelevant.duration);
    
    if (mostRelevant.achievements.length > 0) {
      personalized = personalized.replace(
        /\{key_achievement\}/g, 
        mostRelevant.achievements[0]
      );
    }
    
    return personalized;
  }

  private applySkillPersonalization(response: string, skills: Skill[]): string {
    if (skills.length === 0) return response;
    
    const topSkills = skills
      .filter(skill => skill.level === 'advanced' || skill.level === 'expert')
      .slice(0, 3);
    
    if (topSkills.length > 0) {
      const skillNames = topSkills.map(skill => skill.name).join(', ');
      response = response.replace(/\{top_skills\}/g, skillNames);
      response = response.replace(/\{primary_skill\}/g, topSkills[0].name);
    }
    
    return response;
  }

  private applyCommunicationStyle(
    response: string, 
    style: 'formal' | 'casual' | 'adaptive'
  ): string {
    switch (style) {
      case 'formal':
        return this.makeFormal(response);
      case 'casual':
        return this.makeCasual(response);
      case 'adaptive':
        return this.makeAdaptive(response);
      default:
        return response;
    }
  }

  private applyStructureModifications(
    response: string, 
    structure: ResponseStructure, 
    context: PersonalizationContext
  ): string {
    switch (structure) {
      case 'STAR':
        return this.addSTARStructure(response, context);
      case 'technical':
        return this.addTechnicalStructure(response, context);
      case 'storytelling':
        return this.addStorytellingStructure(response, context);
      default:
        return response;
    }
  }

  private makeConcise(response: string, userProfile: UserProfile): string {
    // Reduce response length while maintaining key points
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const conciseSentences = sentences.slice(0, Math.max(2, Math.floor(sentences.length * 0.6)));
    return conciseSentences.join('. ') + '.';
  }

  private makeDetailed(response: string, userProfile: UserProfile): string {
    // Add more context and examples
    let detailed = response;
    
    // Add transition phrases for more detail
    detailed = detailed.replace(
      /\. ([A-Z])/g, 
      '. Additionally, $1'
    );
    
    // Add specific examples where appropriate
    if (userProfile.experience.length > 0) {
      const experience = userProfile.experience[0];
      detailed += ` For instance, during my time at ${experience.company}, I ${experience.achievements[0] || 'successfully delivered key projects'}.`;
    }
    
    return detailed;
  }

  private makeBalanced(response: string, userProfile: UserProfile): string {
    // Maintain original structure with minor enhancements
    return response;
  }

  private makeFormal(response: string): string {
    return response
      .replace(/I'm/g, 'I am')
      .replace(/don't/g, 'do not')
      .replace(/won't/g, 'will not')
      .replace(/can't/g, 'cannot');
  }

  private makeCasual(response: string): string {
    return response
      .replace(/I am/g, "I'm")
      .replace(/do not/g, "don't")
      .replace(/will not/g, "won't")
      .replace(/cannot/g, "can't");
  }

  private makeAdaptive(response: string): string {
    // Keep a balance between formal and casual
    return response;
  }

  private addSTARStructure(response: string, context: PersonalizationContext): string {
    // Add STAR method indicators if not already present
    if (!response.includes('Situation:') && !response.includes('**Situation:**')) {
      return `**Situation:** ${response}`;
    }
    return response;
  }

  private addTechnicalStructure(response: string, context: PersonalizationContext): string {
    // Add technical approach indicators
    const technicalPhrases = [
      'From a technical perspective,',
      'My approach would involve',
      'The solution I would implement'
    ];
    
    if (!technicalPhrases.some(phrase => response.includes(phrase))) {
      return `From a technical perspective, ${response}`;
    }
    
    return response;
  }

  private addStorytellingStructure(response: string, context: PersonalizationContext): string {
    // Add narrative elements
    const storyStarters = [
      'Let me share an experience that illustrates this.',
      'This reminds me of a situation I encountered.',
      'I have a relevant example from my career.'
    ];
    
    const starter = storyStarters[Math.floor(Math.random() * storyStarters.length)];
    return `${starter} ${response}`;
  }

  private estimateDuration(content: string): number {
    // Estimate speaking duration (approximately 150 words per minute)
    const wordCount = content.split(/\s+/).length;
    return Math.round((wordCount / 150) * 60); // Convert to seconds
  }

  private calculateConfidence(content: string, context: PersonalizationContext): number {
    let confidence = 0.7; // Base confidence
    
    // Increase confidence based on relevant experience matches
    const experienceMatches = context.relevantExperiences.length;
    confidence += Math.min(experienceMatches * 0.1, 0.2);
    
    // Increase confidence based on skill matches
    const skillMatches = context.matchingSkills.length;
    confidence += Math.min(skillMatches * 0.05, 0.1);
    
    // Adjust based on content length (optimal range)
    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 100 && wordCount <= 200) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  private generateTags(
    context: PersonalizationContext, 
    structure: ResponseStructure, 
    tone: ResponseTone
  ): string[] {
    const tags: string[] = [];
    
    tags.push(structure, tone);
    
    if (context.questionClassification) {
      tags.push(context.questionClassification.type);
      tags.push(context.questionClassification.category);
    }
    
    // Add skill-based tags
    context.matchingSkills.slice(0, 3).forEach(skill => {
      tags.push(skill.name.toLowerCase());
    });
    
    return tags;
  }

  private generateReasoning(
    structure: ResponseStructure, 
    tone: ResponseTone, 
    context: PersonalizationContext
  ): string {
    const reasons: string[] = [];
    
    switch (structure) {
      case 'STAR':
        reasons.push('Uses STAR method for behavioral questions');
        break;
      case 'technical':
        reasons.push('Focuses on technical expertise and problem-solving');
        break;
      case 'storytelling':
        reasons.push('Uses narrative approach to engage the interviewer');
        break;
      default:
        reasons.push('Direct and straightforward approach');
    }
    
    switch (tone) {
      case 'concise':
        reasons.push('Concise format respects interviewer\'s time');
        break;
      case 'detailed':
        reasons.push('Detailed response demonstrates thorough knowledge');
        break;
      case 'balanced':
        reasons.push('Balanced approach provides adequate detail without being verbose');
        break;
    }
    
    if (context.userProfile.seniority === 'senior' || context.userProfile.seniority === 'lead') {
      reasons.push('Tailored for senior-level expectations');
    }
    
    return reasons.join('. ');
  }
}