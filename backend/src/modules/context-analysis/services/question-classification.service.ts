import { Injectable, Logger } from '@nestjs/common';
import { QuestionClassification, JobContext } from '../interfaces/context-analysis.interface';

@Injectable()
export class QuestionClassificationService {
  private readonly logger = new Logger(QuestionClassificationService.name);

  // Technical question patterns
  private readonly technicalPatterns = {
    programming: [
      /algorithm/i, /data structure/i, /complexity/i, /big o/i, /optimization/i,
      /code/i, /function/i, /class/i, /method/i, /variable/i, /loop/i,
      /recursion/i, /sorting/i, /searching/i, /tree/i, /graph/i, /array/i,
      /string/i, /hash/i, /stack/i, /queue/i, /linked list/i
    ],
    systemDesign: [
      /system design/i, /architecture/i, /scalability/i, /load balancing/i,
      /database design/i, /microservices/i, /api design/i, /caching/i,
      /distributed/i, /high availability/i, /fault tolerance/i
    ],
    technology: [
      /framework/i, /library/i, /tool/i, /platform/i, /language/i,
      /javascript/i, /python/i, /java/i, /react/i, /node/i, /sql/i,
      /aws/i, /docker/i, /kubernetes/i, /git/i
    ]
  };

  // Behavioral question patterns
  private readonly behavioralPatterns = {
    leadership: [
      /lead/i, /manage/i, /team/i, /mentor/i, /coach/i, /delegate/i,
      /motivate/i, /inspire/i, /conflict/i, /decision/i
    ],
    problemSolving: [
      /problem/i, /challenge/i, /difficult/i, /obstacle/i, /solution/i,
      /approach/i, /strategy/i, /overcome/i, /resolve/i
    ],
    communication: [
      /communicate/i, /explain/i, /present/i, /stakeholder/i, /client/i,
      /feedback/i, /collaborate/i, /negotiate/i
    ],
    adaptability: [
      /change/i, /adapt/i, /learn/i, /new/i, /different/i, /flexible/i,
      /pivot/i, /adjust/i
    ]
  };

  // Situational question patterns
  private readonly situationalPatterns = {
    hypothetical: [
      /what would you/i, /how would you/i, /if you were/i, /suppose/i,
      /imagine/i, /scenario/i, /situation/i
    ],
    prioritization: [
      /prioritize/i, /urgent/i, /deadline/i, /multiple/i, /competing/i,
      /time management/i, /schedule/i
    ],
    ethics: [
      /ethical/i, /moral/i, /right/i, /wrong/i, /honest/i, /integrity/i,
      /confidential/i, /privacy/i
    ]
  };

  // Cultural fit patterns
  private readonly culturalPatterns = {
    values: [
      /values/i, /culture/i, /fit/i, /environment/i, /work style/i,
      /company/i, /mission/i, /vision/i
    ],
    motivation: [
      /motivate/i, /drive/i, /passion/i, /interest/i, /why/i, /goal/i,
      /career/i, /future/i
    ],
    workLife: [
      /work.life/i, /balance/i, /remote/i, /flexible/i, /hours/i,
      /overtime/i, /stress/i
    ]
  };

  async classifyQuestion(
    question: string,
    context?: string,
    jobContext?: JobContext
  ): Promise<QuestionClassification> {
    try {
      this.logger.debug(`Classifying question: ${question.substring(0, 100)}...`);

      const normalizedQuestion = question.toLowerCase();
      const fullText = context ? `${question} ${context}` : question;

      // Analyze question patterns
      const technicalScore = this.calculatePatternScore(normalizedQuestion, this.technicalPatterns);
      const behavioralScore = this.calculatePatternScore(normalizedQuestion, this.behavioralPatterns);
      const situationalScore = this.calculatePatternScore(normalizedQuestion, this.situationalPatterns);
      const culturalScore = this.calculatePatternScore(normalizedQuestion, this.culturalPatterns);

      // Determine primary type
      const scores = {
        technical: technicalScore,
        behavioral: behavioralScore,
        situational: situationalScore,
        cultural: culturalScore
      };

      const primaryType = Object.entries(scores).reduce((a, b) => 
        scores[a[0]] > scores[b[0]] ? a : b
      )[0] as 'technical' | 'behavioral' | 'situational' | 'cultural';

      // Determine category and subcategories
      const category = this.determineCategory(normalizedQuestion, primaryType);
      const subCategories = this.determineSubCategories(normalizedQuestion, primaryType);

      // Determine difficulty based on job context and question complexity
      const difficulty = this.determineDifficulty(question, jobContext);

      // Check if STAR method is recommended
      const requiresSTAR = this.shouldUseSTAR(primaryType, normalizedQuestion);

      // Extract keywords
      const keywords = this.extractKeywords(question);

      // Calculate confidence based on pattern matches and context
      const confidence = this.calculateConfidence(scores, primaryType, jobContext);

      const classification: QuestionClassification = {
        type: primaryType,
        category,
        difficulty,
        requiresSTAR,
        confidence,
        keywords,
        subCategories
      };

      this.logger.debug(`Question classified as: ${JSON.stringify(classification)}`);
      return classification;

    } catch (error) {
      this.logger.error(`Error classifying question: ${error.message}`, error.stack);
      
      // Return default classification on error
      return {
        type: 'behavioral',
        category: 'general',
        difficulty: 'mid',
        requiresSTAR: true,
        confidence: 0.3,
        keywords: this.extractKeywords(question),
        subCategories: []
      };
    }
  }

  private calculatePatternScore(text: string, patterns: Record<string, RegExp[]>): number {
    let totalScore = 0;
    let totalPatterns = 0;

    for (const [category, categoryPatterns] of Object.entries(patterns)) {
      for (const pattern of categoryPatterns) {
        totalPatterns++;
        if (pattern.test(text)) {
          totalScore += 1;
        }
      }
    }

    return totalPatterns > 0 ? totalScore / totalPatterns : 0;
  }

  private determineCategory(question: string, type: string): string {
    switch (type) {
      case 'technical':
        if (this.technicalPatterns.programming.some(p => p.test(question))) return 'programming';
        if (this.technicalPatterns.systemDesign.some(p => p.test(question))) return 'system-design';
        if (this.technicalPatterns.technology.some(p => p.test(question))) return 'technology';
        return 'general-technical';

      case 'behavioral':
        if (this.behavioralPatterns.leadership.some(p => p.test(question))) return 'leadership';
        if (this.behavioralPatterns.problemSolving.some(p => p.test(question))) return 'problem-solving';
        if (this.behavioralPatterns.communication.some(p => p.test(question))) return 'communication';
        if (this.behavioralPatterns.adaptability.some(p => p.test(question))) return 'adaptability';
        return 'general-behavioral';

      case 'situational':
        if (this.situationalPatterns.hypothetical.some(p => p.test(question))) return 'hypothetical';
        if (this.situationalPatterns.prioritization.some(p => p.test(question))) return 'prioritization';
        if (this.situationalPatterns.ethics.some(p => p.test(question))) return 'ethics';
        return 'general-situational';

      case 'cultural':
        if (this.culturalPatterns.values.some(p => p.test(question))) return 'values';
        if (this.culturalPatterns.motivation.some(p => p.test(question))) return 'motivation';
        if (this.culturalPatterns.workLife.some(p => p.test(question))) return 'work-life';
        return 'general-cultural';

      default:
        return 'general';
    }
  }

  private determineSubCategories(question: string, type: string): string[] {
    const subCategories: string[] = [];

    // Add specific subcategories based on detected patterns
    if (type === 'technical') {
      if (/frontend|ui|ux|react|vue|angular/i.test(question)) subCategories.push('frontend');
      if (/backend|server|api|database/i.test(question)) subCategories.push('backend');
      if (/devops|deployment|ci\/cd|docker/i.test(question)) subCategories.push('devops');
      if (/mobile|ios|android|react native/i.test(question)) subCategories.push('mobile');
    }

    if (type === 'behavioral') {
      if (/team|collaboration/i.test(question)) subCategories.push('teamwork');
      if (/deadline|pressure|stress/i.test(question)) subCategories.push('pressure-handling');
      if (/mistake|failure|error/i.test(question)) subCategories.push('failure-handling');
    }

    return subCategories;
  }

  private determineDifficulty(question: string, jobContext?: JobContext): 'junior' | 'mid' | 'senior' {
    // Base difficulty on job context seniority
    if (jobContext?.seniority) {
      const seniority = jobContext.seniority.toLowerCase();
      if (seniority.includes('senior') || seniority.includes('lead') || seniority.includes('principal')) {
        return 'senior';
      }
      if (seniority.includes('mid') || seniority.includes('intermediate')) {
        return 'mid';
      }
      if (seniority.includes('junior') || seniority.includes('entry')) {
        return 'junior';
      }
    }

    // Analyze question complexity
    const complexityIndicators = [
      /architecture/i, /design patterns/i, /scalability/i, /performance/i,
      /optimization/i, /trade.?offs/i, /strategy/i, /leadership/i,
      /mentor/i, /manage/i, /complex/i, /advanced/i
    ];

    const juniorIndicators = [
      /basic/i, /simple/i, /beginner/i, /learn/i, /first time/i,
      /introduction/i, /getting started/i
    ];

    if (complexityIndicators.some(pattern => pattern.test(question))) {
      return 'senior';
    }

    if (juniorIndicators.some(pattern => pattern.test(question))) {
      return 'junior';
    }

    return 'mid'; // Default to mid-level
  }

  private shouldUseSTAR(type: string, question: string): boolean {
    // STAR method is primarily for behavioral questions
    if (type === 'behavioral') return true;

    // Some situational questions also benefit from STAR
    if (type === 'situational' && /experience|time when|example/i.test(question)) {
      return true;
    }

    // Technical questions asking for examples
    if (type === 'technical' && /example|experience|project|implemented/i.test(question)) {
      return true;
    }

    return false;
  }

  private extractKeywords(question: string): string[] {
    // Remove common words and extract meaningful keywords
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'among', 'is', 'are',
      'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
      'what', 'when', 'where', 'why', 'how', 'who', 'which', 'that', 'this',
      'these', 'those', 'you', 'your', 'we', 'our', 'they', 'their', 'it', 'its'
    ]);

    return question
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .slice(0, 10); // Limit to top 10 keywords
  }

  private calculateConfidence(
    scores: Record<string, number>,
    primaryType: string,
    jobContext?: JobContext
  ): number {
    const primaryScore = scores[primaryType];
    const secondaryScore = Math.max(...Object.values(scores).filter(score => score !== primaryScore));
    
    // Base confidence on the difference between primary and secondary scores
    let confidence = Math.min(0.9, Math.max(0.3, primaryScore));

    // Boost confidence if there's a clear winner
    if (primaryScore > secondaryScore + 0.2) {
      confidence += 0.1;
    }

    // Boost confidence if job context aligns with question type
    if (jobContext?.interviewType === primaryType || 
        (jobContext?.interviewType === 'mixed' && primaryScore > 0.3)) {
      confidence += 0.1;
    }

    return Math.min(0.95, Math.max(0.2, confidence));
  }
}