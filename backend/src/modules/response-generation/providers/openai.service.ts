import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { 
  PersonalizationContext, 
  ResponseOption, 
  ResponseGenerationOptions,
  ResponseStructure,
  ResponseTone 
} from '../interfaces/response-generation.interface';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OpenAI API key not configured. Response generation will be limited.');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    });
  }

  async generateResponses(
    question: string,
    context: PersonalizationContext,
    options: ResponseGenerationOptions = {}
  ): Promise<ResponseOption[]> {
    try {
      const prompt = this.buildPrompt(question, context, options);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response content received from OpenAI');
      }

      const parsedResponse = JSON.parse(responseContent);
      return this.formatResponseOptions(parsedResponse.responses || []);
    } catch (error) {
      this.logger.error('Error generating responses with OpenAI:', error);
      return this.getFallbackResponses(question, context);
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert interview coach helping candidates prepare thoughtful, professional responses to interview questions. 

Your task is to generate 2-3 different response options for interview questions, each with a different approach and tone. Consider the candidate's background, the job context, and the type of question being asked.

For behavioral questions, use the STAR method (Situation, Task, Action, Result) when appropriate.
For technical questions, focus on demonstrating knowledge and problem-solving skills.
For situational questions, show analytical thinking and decision-making abilities.

Response Guidelines:
- Keep responses between 60-90 seconds when spoken (approximately 150-225 words)
- Make responses authentic and specific to the candidate's experience
- Vary the tone: one concise, one detailed, one balanced
- Include specific examples and quantifiable results when possible
- Avoid generic or cliché responses
- Ensure responses align with the company culture and values

Always respond with a JSON object containing a "responses" array with the following structure:
{
  "responses": [
    {
      "content": "The actual response text",
      "structure": "STAR|direct|technical|storytelling",
      "tone": "concise|detailed|balanced",
      "estimatedDuration": 75,
      "confidence": 0.85,
      "tags": ["leadership", "problem-solving"],
      "reasoning": "Why this approach works for this question"
    }
  ]
}`;
  }

  private buildPrompt(
    question: string,
    context: PersonalizationContext,
    options: ResponseGenerationOptions
  ): string {
    const { userProfile, jobContext, questionClassification, relevantExperiences } = context;
    
    let prompt = `Interview Question: "${question}"\n\n`;
    
    // Add job context
    prompt += `Job Context:\n`;
    prompt += `- Position: ${jobContext.title} at ${jobContext.company}\n`;
    prompt += `- Industry: ${jobContext.industry}\n`;
    prompt += `- Seniority: ${jobContext.seniority}\n`;
    prompt += `- Interview Type: ${jobContext.interviewType}\n\n`;
    
    // Add question classification
    if (questionClassification) {
      prompt += `Question Analysis:\n`;
      prompt += `- Type: ${questionClassification.type}\n`;
      prompt += `- Category: ${questionClassification.category}\n`;
      prompt += `- Requires STAR: ${questionClassification.requiresSTAR}\n`;
      prompt += `- Keywords: ${questionClassification.keywords.join(', ')}\n\n`;
    }
    
    // Add candidate profile
    prompt += `Candidate Profile:\n`;
    prompt += `- Seniority Level: ${userProfile.seniority}\n`;
    prompt += `- Industries: ${userProfile.industries.join(', ')}\n`;
    prompt += `- Communication Style: ${userProfile.preferences.communicationStyle}\n`;
    prompt += `- Preferred Response Style: ${userProfile.preferences.preferredResponseStyle}\n\n`;
    
    // Add relevant experiences
    if (relevantExperiences.length > 0) {
      prompt += `Relevant Experience:\n`;
      relevantExperiences.slice(0, 3).forEach((exp, index) => {
        prompt += `${index + 1}. ${exp.role} at ${exp.company} (${exp.duration})\n`;
        prompt += `   Achievements: ${exp.achievements.slice(0, 2).join(', ')}\n`;
        if (exp.technologies.length > 0) {
          prompt += `   Technologies: ${exp.technologies.slice(0, 5).join(', ')}\n`;
        }
      });
      prompt += '\n';
    }
    
    // Add key skills
    const topSkills = context.matchingSkills
      .filter(skill => skill.level === 'advanced' || skill.level === 'expert')
      .slice(0, 5)
      .map(skill => skill.name);
    
    if (topSkills.length > 0) {
      prompt += `Key Skills: ${topSkills.join(', ')}\n\n`;
    }
    
    // Add generation options
    prompt += `Generation Requirements:\n`;
    prompt += `- Generate ${options.responseCount || 3} different response options\n`;
    prompt += `- Maximum duration: ${options.maxDuration || 90} seconds\n`;
    
    if (options.preferredTones?.length) {
      prompt += `- Preferred tones: ${options.preferredTones.join(', ')}\n`;
    }
    
    if (options.excludeStructures?.length) {
      prompt += `- Avoid structures: ${options.excludeStructures.join(', ')}\n`;
    }
    
    prompt += `- Include reasoning for each response approach\n`;
    
    return prompt;
  }

  private formatResponseOptions(responses: any[]): ResponseOption[] {
    return responses.map((response, index) => ({
      id: `openai-${Date.now()}-${index}`,
      content: response.content || '',
      structure: this.validateStructure(response.structure),
      estimatedDuration: response.estimatedDuration || 75,
      confidence: Math.min(Math.max(response.confidence || 0.7, 0), 1),
      tags: Array.isArray(response.tags) ? response.tags : [],
      tone: this.validateTone(response.tone),
      reasoning: response.reasoning || ''
    }));
  }

  private validateStructure(structure: string): ResponseStructure {
    const validStructures: ResponseStructure[] = ['STAR', 'direct', 'technical', 'storytelling'];
    return validStructures.includes(structure as ResponseStructure) 
      ? structure as ResponseStructure 
      : 'direct';
  }

  private validateTone(tone: string): ResponseTone {
    const validTones: ResponseTone[] = ['concise', 'detailed', 'balanced'];
    return validTones.includes(tone as ResponseTone) 
      ? tone as ResponseTone 
      : 'balanced';
  }

  /**
   * Generate a custom response for any prompt (used for practice feedback)
   */
  async generateCustomResponse(prompt: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert interview coach providing detailed, constructive feedback.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || 'Unable to generate response';
    } catch (error) {
      this.logger.error('OpenAI API error in generateCustomResponse:', error);
      throw new Error('Failed to generate custom response');
    }
  }

  private getFallbackResponses(question: string, context: PersonalizationContext): ResponseOption[] {
    // Provide basic fallback responses when OpenAI is not available
    const fallbackContent = `I'd approach this question by drawing from my experience in ${context.userProfile.industries[0] || 'the industry'}. Based on my background as a ${context.userProfile.seniority} professional, I would focus on demonstrating my relevant skills and experience that align with the ${context.jobContext.title} role.`;
    
    return [
      {
        id: `fallback-${Date.now()}-1`,
        content: fallbackContent,
        structure: 'direct',
        estimatedDuration: 60,
        confidence: 0.5,
        tags: ['fallback'],
        tone: 'balanced',
        reasoning: 'Fallback response when AI service is unavailable'
      }
    ];
  }
}