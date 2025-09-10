import { Injectable, Logger } from '@nestjs/common';
import { 
  STARComponent, 
  Experience, 
  ResponseOption,
  QuestionClassification 
} from '../interfaces/response-generation.interface';

@Injectable()
export class STARStructureService {
  private readonly logger = new Logger(STARStructureService.name);

  /**
   * Apply STAR method structure to a response using relevant experiences
   */
  async applySTARStructure(
    content: string, 
    experiences: Experience[], 
    questionClassification?: QuestionClassification
  ): Promise<string> {
    try {
      // Find the most relevant experience for the question
      const relevantExperience = this.findMostRelevantExperience(
        experiences, 
        questionClassification
      );

      if (!relevantExperience) {
        return this.applyGenericSTARStructure(content);
      }

      const starComponents = this.extractSTARComponents(content, relevantExperience);
      return this.formatSTARResponse(starComponents);
    } catch (error) {
      this.logger.error('Error applying STAR structure:', error);
      return content; // Return original content if STAR structuring fails
    }
  }

  /**
   * Determine if a question requires STAR method based on classification
   */
  requiresSTARMethod(questionClassification: QuestionClassification): boolean {
    return questionClassification.requiresSTAR || 
           questionClassification.type === 'behavioral' ||
           questionClassification.keywords.some(keyword => 
             this.getBehavioralKeywords().includes(keyword.toLowerCase())
           );
  }

  /**
   * Extract STAR components from content and experience
   */
  extractSTARComponents(content: string, experience: Experience): STARComponent {
    // Use the experience to build realistic STAR components
    const situation = this.extractSituation(content, experience);
    const task = this.extractTask(content, experience);
    const action = this.extractAction(content, experience);
    const result = this.extractResult(content, experience);

    return { situation, task, action, result };
  }

  /**
   * Format STAR components into a cohesive response
   */
  formatSTARResponse(components: STARComponent): string {
    const { situation, task, action, result } = components;
    
    let response = '';
    
    if (situation) {
      response += `**Situation:** ${situation}\n\n`;
    }
    
    if (task) {
      response += `**Task:** ${task}\n\n`;
    }
    
    if (action) {
      response += `**Action:** ${action}\n\n`;
    }
    
    if (result) {
      response += `**Result:** ${result}`;
    }
    
    return response.trim();
  }

  /**
   * Create STAR template for response generation
   */
  createSTARTemplate(
    questionType: string, 
    experience: Experience
  ): string {
    const templates = this.getSTARTemplates();
    const template = templates[questionType] || templates.default;
    
    return template
      .replace('{company}', experience.company)
      .replace('{role}', experience.role)
      .replace('{duration}', experience.duration)
      .replace('{achievement}', experience.achievements[0] || 'a significant project')
      .replace('{technology}', experience.technologies[0] || 'relevant tools');
  }

  /**
   * Validate STAR response structure
   */
  validateSTARStructure(response: string): {
    isValid: boolean;
    missingComponents: string[];
    suggestions: string[];
  } {
    const components = ['situation', 'task', 'action', 'result'];
    const missingComponents: string[] = [];
    const suggestions: string[] = [];
    
    components.forEach(component => {
      const regex = new RegExp(`\\*\\*${component}:?\\*\\*`, 'i');
      if (!regex.test(response)) {
        missingComponents.push(component);
        suggestions.push(`Add a clear ${component} section to strengthen your response`);
      }
    });
    
    const isValid = missingComponents.length === 0;
    
    if (!isValid) {
      suggestions.push('Consider using the STAR method: Situation, Task, Action, Result');
    }
    
    return {
      isValid,
      missingComponents,
      suggestions
    };
  }

  private findMostRelevantExperience(
    experiences: Experience[], 
    questionClassification?: QuestionClassification
  ): Experience | null {
    if (experiences.length === 0) return null;
    
    if (!questionClassification) {
      return experiences[0]; // Return most recent experience
    }
    
    // Score experiences based on relevance to question keywords
    const scoredExperiences = experiences.map(exp => ({
      experience: exp,
      score: this.calculateExperienceRelevance(exp, questionClassification)
    }));
    
    // Sort by score and return the most relevant
    scoredExperiences.sort((a, b) => b.score - a.score);
    return scoredExperiences[0].experience;
  }

  private calculateExperienceRelevance(
    experience: Experience, 
    classification: QuestionClassification
  ): number {
    let score = 0;
    const keywords = classification.keywords.map(k => k.toLowerCase());
    
    // Check role title
    keywords.forEach(keyword => {
      if (experience.role.toLowerCase().includes(keyword)) score += 3;
    });
    
    // Check achievements
    experience.achievements.forEach(achievement => {
      keywords.forEach(keyword => {
        if (achievement.toLowerCase().includes(keyword)) score += 2;
      });
    });
    
    // Check technologies
    experience.technologies.forEach(tech => {
      keywords.forEach(keyword => {
        if (tech.toLowerCase().includes(keyword)) score += 1;
      });
    });
    
    return score;
  }

  private extractSituation(content: string, experience: Experience): string {
    // Extract or generate situation based on experience context
    return `During my time as ${experience.role} at ${experience.company}, I encountered a situation where...`;
  }

  private extractTask(content: string, experience: Experience): string {
    // Extract or generate task based on experience
    return `My responsibility was to address this challenge by leveraging my expertise in ${experience.technologies.slice(0, 2).join(' and ')}...`;
  }

  private extractAction(content: string, experience: Experience): string {
    // Extract or generate action based on achievements
    const achievement = experience.achievements[0];
    if (achievement) {
      return `I took a systematic approach by ${achievement.toLowerCase()}...`;
    }
    return `I implemented a solution by applying best practices and collaborating with the team...`;
  }

  private extractResult(content: string, experience: Experience): string {
    // Extract or generate result based on achievements
    const achievements = experience.achievements.slice(0, 2);
    if (achievements.length > 0) {
      return `As a result, ${achievements.join(' and ')}. This experience taught me valuable lessons about...`;
    }
    return `The outcome was successful, leading to improved processes and valuable learning experiences...`;
  }

  private applyGenericSTARStructure(content: string): string {
    // Apply basic STAR structure when no specific experience is available
    const sections = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sections.length < 4) {
      return content; // Not enough content to restructure
    }
    
    return `**Situation:** ${sections[0].trim()}.\n\n` +
           `**Task:** ${sections[1].trim()}.\n\n` +
           `**Action:** ${sections[2].trim()}.\n\n` +
           `**Result:** ${sections.slice(3).join('. ').trim()}.`;
  }

  private getBehavioralKeywords(): string[] {
    return [
      'tell me about a time',
      'describe a situation',
      'give me an example',
      'how did you handle',
      'what would you do if',
      'challenge',
      'conflict',
      'leadership',
      'teamwork',
      'problem',
      'mistake',
      'failure',
      'success',
      'achievement',
      'difficult',
      'pressure',
      'deadline'
    ];
  }

  private getSTARTemplates(): Record<string, string> {
    return {
      leadership: `**Situation:** While working as {role} at {company}, I was faced with a leadership challenge...\n\n**Task:** I needed to {achievement} while managing team dynamics...\n\n**Action:** I implemented a strategy using {technology} and focused on clear communication...\n\n**Result:** This approach led to successful project completion and improved team performance.`,
      
      problem_solving: `**Situation:** During my {duration} tenure as {role} at {company}, I encountered a complex technical problem...\n\n**Task:** My responsibility was to find a solution that would {achievement}...\n\n**Action:** I analyzed the issue systematically, utilized {technology}, and collaborated with stakeholders...\n\n**Result:** The solution I implemented resulted in {achievement} and provided valuable insights for future projects.`,
      
      teamwork: `**Situation:** As {role} at {company}, I was part of a diverse team working on {achievement}...\n\n**Task:** I needed to contribute effectively while ensuring team cohesion and project success...\n\n**Action:** I focused on clear communication, leveraged my expertise in {technology}, and supported team members...\n\n**Result:** Our collaborative effort led to {achievement} and strengthened our working relationships.`,
      
      default: `**Situation:** In my role as {role} at {company}, I was presented with an opportunity to {achievement}...\n\n**Task:** I was responsible for delivering results while maintaining quality standards...\n\n**Action:** I approached this systematically, utilizing {technology} and applying best practices...\n\n**Result:** The outcome exceeded expectations, resulting in {achievement} and valuable learning experiences.`
    };
  }
}