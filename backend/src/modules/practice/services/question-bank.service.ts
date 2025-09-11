import { Injectable, Logger } from '@nestjs/common';
import { PracticeRepository } from '../practice.repository';
import { QuestionType, DifficultyLevel, PracticeQuestionDto } from '../dto/practice.dto';

@Injectable()
export class QuestionBankService {
  private readonly logger = new Logger(QuestionBankService.name);

  constructor(private practiceRepository: PracticeRepository) {}

  async generateQuestionsForSession(
    jobTitle: string,
    industry: string,
    difficulty: DifficultyLevel,
    questionTypes: QuestionType[],
    count: number,
  ): Promise<PracticeQuestionDto[]> {
    this.logger.log(`Generating ${count} questions for ${jobTitle} in ${industry}`);

    // Get questions from database
    const questions = await this.practiceRepository.getQuestionsByFilters(
      questionTypes,
      industry,
      difficulty,
      count * 2, // Get more than needed for variety
    );

    // If not enough questions in database, generate some dynamically
    if (questions.length < count) {
      this.logger.warn(`Only ${questions.length} questions found, generating additional ones`);
      const additionalQuestions = await this.generateDynamicQuestions(
        jobTitle,
        industry,
        difficulty,
        questionTypes,
        count - questions.length,
      );
      questions.push(...additionalQuestions);
    }

    // Shuffle and select the required number
    const shuffled = this.shuffleArray(questions);
    const selected = shuffled.slice(0, count);

    return selected.map(q => ({
      id: q.id,
      question: q.question,
      type: q.type as QuestionType,
      category: q.category,
      difficulty: q.difficulty as DifficultyLevel,
      expectedStructure: q.expectedStructure,
      keyPoints: q.keyPoints as string[],
      timeLimit: q.timeLimit,
    }));
  }

  private async generateDynamicQuestions(
    jobTitle: string,
    industry: string,
    difficulty: DifficultyLevel,
    questionTypes: QuestionType[],
    count: number,
  ): Promise<any[]> {
    const questions = [];

    for (const type of questionTypes) {
      const questionsForType = Math.ceil(count / questionTypes.length);
      
      for (let i = 0; i < questionsForType && questions.length < count; i++) {
        const question = this.generateQuestionByType(type, jobTitle, industry, difficulty);
        questions.push(question);
      }
    }

    return questions;
  }

  private generateQuestionByType(
    type: QuestionType,
    jobTitle: string,
    industry: string,
    difficulty: DifficultyLevel,
  ): any {
    const baseQuestion = {
      id: `generated-${Date.now()}-${Math.random()}`,
      type,
      industry,
      difficulty,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    switch (type) {
      case QuestionType.TECHNICAL:
        return {
          ...baseQuestion,
          question: this.generateTechnicalQuestion(jobTitle, difficulty),
          category: 'Technical Skills',
          expectedStructure: 'Technical explanation with examples',
          keyPoints: ['Technical accuracy', 'Practical examples', 'Best practices'],
          timeLimit: 240,
          tags: ['technical', jobTitle.toLowerCase()],
        };

      case QuestionType.BEHAVIORAL:
        return {
          ...baseQuestion,
          question: this.generateBehavioralQuestion(jobTitle),
          category: 'Behavioral',
          expectedStructure: 'STAR method',
          keyPoints: ['Situation', 'Task', 'Action', 'Result'],
          timeLimit: 180,
          tags: ['behavioral', 'experience'],
        };

      case QuestionType.SITUATIONAL:
        return {
          ...baseQuestion,
          question: this.generateSituationalQuestion(jobTitle, industry),
          category: 'Problem Solving',
          expectedStructure: 'Problem analysis and solution approach',
          keyPoints: ['Problem identification', 'Solution approach', 'Implementation'],
          timeLimit: 200,
          tags: ['situational', 'problem-solving'],
        };

      case QuestionType.CULTURAL:
        return {
          ...baseQuestion,
          question: this.generateCulturalQuestion(industry),
          category: 'Cultural Fit',
          expectedStructure: 'Personal values and alignment',
          keyPoints: ['Values alignment', 'Company culture', 'Personal motivation'],
          timeLimit: 120,
          tags: ['cultural', 'values'],
        };

      default:
        return baseQuestion;
    }
  }

  private generateTechnicalQuestion(jobTitle: string, difficulty: DifficultyLevel): string {
    const technicalQuestions = {
      junior: [
        `What are the key responsibilities of a ${jobTitle}?`,
        `Explain the basic concepts you would use daily as a ${jobTitle}.`,
        `What tools and technologies are essential for a ${jobTitle}?`,
      ],
      mid: [
        `How would you approach a complex problem in your role as a ${jobTitle}?`,
        `Describe the best practices you follow as a ${jobTitle}.`,
        `What are the most challenging aspects of being a ${jobTitle}?`,
      ],
      senior: [
        `How would you mentor a junior ${jobTitle} in your team?`,
        `What architectural decisions would you make as a senior ${jobTitle}?`,
        `How do you stay updated with the latest trends in your field as a ${jobTitle}?`,
      ],
    };

    const questions = technicalQuestions[difficulty] || technicalQuestions.mid;
    return questions[Math.floor(Math.random() * questions.length)];
  }

  private generateBehavioralQuestion(jobTitle: string): string {
    const behavioralQuestions = [
      'Tell me about a time when you had to work under pressure.',
      'Describe a situation where you had to learn something new quickly.',
      'Give me an example of when you had to work with a difficult colleague.',
      'Tell me about a project you are particularly proud of.',
      'Describe a time when you had to make a difficult decision.',
      'Tell me about a time when you failed and how you handled it.',
    ];

    return behavioralQuestions[Math.floor(Math.random() * behavioralQuestions.length)];
  }

  private generateSituationalQuestion(jobTitle: string, industry: string): string {
    const situationalQuestions = [
      `How would you handle a situation where a project deadline is at risk in your role as a ${jobTitle}?`,
      `What would you do if you disagreed with your manager's approach to a project?`,
      `How would you prioritize multiple urgent tasks as a ${jobTitle}?`,
      `What would you do if you discovered a mistake in your work after it was already delivered?`,
      `How would you handle a situation where you need to work with limited resources?`,
    ];

    return situationalQuestions[Math.floor(Math.random() * situationalQuestions.length)];
  }

  private generateCulturalQuestion(industry: string): string {
    const culturalQuestions = [
      'What motivates you in your work?',
      'How do you handle work-life balance?',
      'What type of work environment do you thrive in?',
      'How do you approach teamwork and collaboration?',
      'What are your long-term career goals?',
      'How do you handle feedback and criticism?',
    ];

    return culturalQuestions[Math.floor(Math.random() * culturalQuestions.length)];
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async getQuestionsByCategory(category: string, limit = 10) {
    return this.practiceRepository.getQuestionsByFilters(
      [QuestionType.TECHNICAL, QuestionType.BEHAVIORAL, QuestionType.SITUATIONAL, QuestionType.CULTURAL],
      'General',
      DifficultyLevel.MID,
      limit,
    );
  }

  async addCustomQuestion(questionData: any) {
    // This would be implemented to allow adding custom questions to the bank
    this.logger.log('Adding custom question to bank');
    // Implementation would go here
  }
}