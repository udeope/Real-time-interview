import { Injectable, Logger } from '@nestjs/common';
import { ResponseGenerationService } from '../../response-generation/response-generation.service';
import { QuestionClassificationService } from '../../context-analysis/services/question-classification.service';
import { PracticeFeedbackDto, QuestionType } from '../dto/practice.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private responseGenerationService: ResponseGenerationService,
    private questionClassificationService: QuestionClassificationService,
  ) {}

  async generateFeedback(
    question: string,
    response: string,
    questionType: QuestionType,
    duration: number,
    expectedStructure?: string,
    keyPoints?: string[],
  ): Promise<PracticeFeedbackDto> {
    this.logger.log(`Generating feedback for ${questionType} question`);

    try {
      // Analyze the response using AI
      const analysis = await this.analyzeResponse(
        question,
        response,
        questionType,
        duration,
        expectedStructure,
        keyPoints,
      );

      return {
        overallScore: analysis.overallScore,
        contentScore: analysis.contentScore,
        structureScore: analysis.structureScore,
        clarityScore: analysis.clarityScore,
        feedback: analysis.feedback,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        suggestions: analysis.suggestions,
      };
    } catch (error) {
      this.logger.error('Error generating feedback:', error);
      return this.generateFallbackFeedback(response, duration);
    }
  }

  private async analyzeResponse(
    question: string,
    response: string,
    questionType: QuestionType,
    duration: number,
    expectedStructure?: string,
    keyPoints?: string[],
  ): Promise<any> {
    const prompt = this.buildFeedbackPrompt(
      question,
      response,
      questionType,
      duration,
      expectedStructure,
      keyPoints,
    );

    // Use the response generation service to analyze the response
    const analysis = await this.responseGenerationService.generateCustomResponse(prompt);
    
    return this.parseFeedbackResponse(analysis);
  }

  private buildFeedbackPrompt(
    question: string,
    response: string,
    questionType: QuestionType,
    duration: number,
    expectedStructure?: string,
    keyPoints?: string[],
  ): string {
    const basePrompt = `
You are an expert interview coach analyzing a candidate's response to an interview question.

Question: "${question}"
Question Type: ${questionType}
Response Duration: ${duration} seconds
Expected Structure: ${expectedStructure || 'Not specified'}
Key Points to Cover: ${keyPoints?.join(', ') || 'Not specified'}

Candidate's Response: "${response}"

Please provide a comprehensive analysis in the following JSON format:
{
  "overallScore": <number 1-10>,
  "contentScore": <number 1-10>,
  "structureScore": <number 1-10>,
  "clarityScore": <number 1-10>,
  "feedback": "<detailed feedback paragraph>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": ["<improvement 1>", "<improvement 2>", ...],
  "suggestions": ["<suggestion 1>", "<suggestion 2>", ...]
}

Evaluation Criteria:
- Content Score: Relevance, accuracy, and depth of the response
- Structure Score: Organization and logical flow (STAR method for behavioral questions)
- Clarity Score: Communication effectiveness and articulation
- Overall Score: Weighted average considering all factors

Focus on:
1. How well the response answers the question
2. Use of specific examples and details
3. Professional communication style
4. Appropriate length and pacing
5. Demonstration of relevant skills/experience
`;

    if (questionType === QuestionType.BEHAVIORAL) {
      return basePrompt + `
Additional Behavioral Question Criteria:
- Situation: Clear context and background
- Task: Specific responsibilities and challenges
- Action: Detailed steps taken and decisions made
- Result: Measurable outcomes and lessons learned
`;
    }

    if (questionType === QuestionType.TECHNICAL) {
      return basePrompt + `
Additional Technical Question Criteria:
- Technical accuracy and depth
- Use of appropriate terminology
- Practical examples and applications
- Understanding of best practices
- Problem-solving approach
`;
    }

    return basePrompt;
  }

  private parseFeedbackResponse(aiResponse: string): any {
    try {
      // Extract JSON from the AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate and normalize scores
        return {
          overallScore: this.normalizeScore(parsed.overallScore),
          contentScore: this.normalizeScore(parsed.contentScore),
          structureScore: this.normalizeScore(parsed.structureScore),
          clarityScore: this.normalizeScore(parsed.clarityScore),
          feedback: parsed.feedback || 'Good response overall.',
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
          improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        };
      }
    } catch (error) {
      this.logger.error('Error parsing AI feedback response:', error);
    }

    // Fallback parsing
    return this.extractFeedbackFromText(aiResponse);
  }

  private extractFeedbackFromText(text: string): any {
    // Simple text-based extraction as fallback
    const scores = this.extractScoresFromText(text);
    
    return {
      overallScore: scores.overall,
      contentScore: scores.content,
      structureScore: scores.structure,
      clarityScore: scores.clarity,
      feedback: text.substring(0, 500) + '...',
      strengths: this.extractListFromText(text, 'strength'),
      improvements: this.extractListFromText(text, 'improvement'),
      suggestions: this.extractListFromText(text, 'suggestion'),
    };
  }

  private extractScoresFromText(text: string): any {
    const scoreRegex = /(\d+(?:\.\d+)?)\s*(?:\/\s*10|out of 10)/gi;
    const matches = text.match(scoreRegex);
    
    const defaultScore = 7;
    const scores = matches ? matches.map(m => parseFloat(m)) : [];
    
    return {
      overall: scores[0] || defaultScore,
      content: scores[1] || defaultScore,
      structure: scores[2] || defaultScore,
      clarity: scores[3] || defaultScore,
    };
  }

  private extractListFromText(text: string, type: string): string[] {
    const regex = new RegExp(`${type}s?:?\\s*([^\\n]*(?:\\n\\s*[-•*]\\s*[^\\n]*)*)`, 'i');
    const match = text.match(regex);
    
    if (match) {
      return match[1]
        .split(/\n\s*[-•*]\s*/)
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .slice(0, 3); // Limit to 3 items
    }
    
    return [];
  }

  private normalizeScore(score: any): number {
    const num = parseFloat(score);
    if (isNaN(num)) return 7; // Default score
    return Math.max(1, Math.min(10, num)); // Clamp between 1-10
  }

  private generateFallbackFeedback(response: string, duration: number): PracticeFeedbackDto {
    const wordCount = response.split(' ').length;
    const wordsPerSecond = wordCount / duration;
    
    let overallScore = 7;
    const strengths = ['Provided a complete response'];
    const improvements = [];
    const suggestions = [];

    // Basic analysis based on response characteristics
    if (duration < 30) {
      improvements.push('Consider providing more detailed examples');
      overallScore -= 1;
    } else if (duration > 180) {
      improvements.push('Try to be more concise in your responses');
      overallScore -= 0.5;
    }

    if (wordsPerSecond < 1) {
      improvements.push('Speak at a more natural pace');
    } else if (wordsPerSecond > 3) {
      improvements.push('Slow down to ensure clarity');
    }

    if (wordCount > 50) {
      strengths.push('Provided substantial detail');
    }

    suggestions.push('Practice structuring your responses with clear beginning, middle, and end');
    suggestions.push('Use specific examples to illustrate your points');

    return {
      overallScore: Math.max(1, Math.min(10, overallScore)),
      contentScore: 7,
      structureScore: 6,
      clarityScore: 7,
      feedback: `Your response was ${wordCount} words long and took ${duration} seconds. Consider the pacing and structure of your answer to make it more impactful.`,
      strengths,
      improvements,
      suggestions,
    };
  }

  async generateSessionSummary(responses: any[]): Promise<any> {
    if (responses.length === 0) {
      return {
        averageScore: 0,
        strongestAreas: [],
        improvementAreas: ['Complete more practice questions'],
        achievements: [],
      };
    }

    const totalScore = responses.reduce((sum, r) => sum + (r.overallScore || 0), 0);
    const averageScore = totalScore / responses.length;

    // Analyze patterns in feedback
    const allStrengths = responses.flatMap(r => r.strengths || []);
    const allImprovements = responses.flatMap(r => r.improvements || []);

    const strengthCounts = this.countOccurrences(allStrengths);
    const improvementCounts = this.countOccurrences(allImprovements);

    const strongestAreas = Object.entries(strengthCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([area]) => area);

    const improvementAreas = Object.entries(improvementCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([area]) => area);

    const achievements = [];
    if (averageScore >= 8) achievements.push('Excellent overall performance');
    if (responses.length >= 5) achievements.push('Completed comprehensive practice session');
    if (responses.some(r => r.structureScore >= 9)) achievements.push('Demonstrated strong response structure');

    return {
      averageScore,
      strongestAreas,
      improvementAreas,
      achievements,
    };
  }

  private countOccurrences(items: string[]): Record<string, number> {
    return items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}