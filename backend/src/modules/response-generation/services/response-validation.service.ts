import { Injectable, Logger } from '@nestjs/common';
import { ResponseValidationResult } from '../interfaces/response-generation.interface';

@Injectable()
export class ResponseValidationService {
  private readonly logger = new Logger(ResponseValidationService.name);
  
  // Average speaking rate: 150 words per minute
  private readonly WORDS_PER_MINUTE = 150;
  private readonly WORDS_PER_SECOND = this.WORDS_PER_MINUTE / 60;

  /**
   * Validate response length and optimize if needed
   */
  async validateResponse(
    response: string, 
    maxDurationSeconds: number = 90
  ): Promise<ResponseValidationResult> {
    try {
      const wordCount = this.countWords(response);
      const estimatedDuration = this.estimateDuration(wordCount);
      const issues: string[] = [];
      let optimizedResponse: string | undefined;

      // Check duration constraint
      if (estimatedDuration > maxDurationSeconds) {
        issues.push(`Response is too long (${Math.round(estimatedDuration)}s vs ${maxDurationSeconds}s limit)`);
        optimizedResponse = await this.optimizeLength(response, maxDurationSeconds);
      }

      // Check minimum length
      const minDurationSeconds = 30;
      if (estimatedDuration < minDurationSeconds) {
        issues.push(`Response is too short (${Math.round(estimatedDuration)}s vs ${minDurationSeconds}s minimum)`);
        optimizedResponse = await this.expandResponse(response, minDurationSeconds);
      }

      // Check for other quality issues
      const qualityIssues = this.checkQualityIssues(response);
      issues.push(...qualityIssues);

      return {
        isValid: issues.length === 0,
        estimatedDurationSeconds: estimatedDuration,
        wordCount,
        issues,
        optimizedResponse
      };
    } catch (error) {
      this.logger.error('Error validating response:', error);
      return {
        isValid: false,
        estimatedDurationSeconds: 0,
        wordCount: 0,
        issues: ['Validation error occurred'],
        optimizedResponse: undefined
      };
    }
  }

  /**
   * Optimize response length to fit within duration constraints
   */
  async optimizeLength(
    response: string, 
    maxDurationSeconds: number
  ): Promise<string> {
    const maxWords = Math.floor(maxDurationSeconds * this.WORDS_PER_SECOND);
    const currentWordCount = this.countWords(response);
    
    if (currentWordCount <= maxWords) {
      return response;
    }

    // Strategy 1: Remove filler words and redundancy
    let optimized = this.removeFiller(response);
    
    // Strategy 2: Condense sentences
    optimized = this.condenseSentences(optimized);
    
    // Strategy 3: Prioritize key content
    optimized = this.prioritizeKeyContent(optimized, maxWords);
    
    return optimized;
  }

  /**
   * Expand response to meet minimum duration requirements
   */
  async expandResponse(
    response: string, 
    minDurationSeconds: number
  ): Promise<string> {
    const minWords = Math.ceil(minDurationSeconds * this.WORDS_PER_SECOND);
    const currentWordCount = this.countWords(response);
    
    if (currentWordCount >= minWords) {
      return response;
    }

    // Strategy 1: Add specific examples
    let expanded = this.addSpecificExamples(response);
    
    // Strategy 2: Add context and background
    expanded = this.addContext(expanded);
    
    // Strategy 3: Add transition phrases
    expanded = this.addTransitions(expanded);
    
    return expanded;
  }

  /**
   * Check for common quality issues in responses
   */
  checkQualityIssues(response: string): string[] {
    const issues: string[] = [];
    
    // Check for repetitive content
    if (this.hasRepetitiveContent(response)) {
      issues.push('Response contains repetitive content');
    }
    
    // Check for vague language
    if (this.hasVagueLanguage(response)) {
      issues.push('Response uses vague or generic language');
    }
    
    // Check for proper structure
    if (!this.hasProperStructure(response)) {
      issues.push('Response lacks clear structure');
    }
    
    // Check for specific examples
    if (!this.hasSpecificExamples(response)) {
      issues.push('Response could benefit from specific examples');
    }
    
    // Check for action-oriented language
    if (!this.hasActionOrientedLanguage(response)) {
      issues.push('Response should include more action-oriented language');
    }
    
    return issues;
  }

  /**
   * Estimate speaking duration based on word count
   */
  estimateDuration(wordCount: number): number {
    return wordCount / this.WORDS_PER_SECOND;
  }

  /**
   * Count words in response
   */
  countWords(response: string): number {
    return response.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Get optimal word count range for given duration
   */
  getOptimalWordRange(durationSeconds: number): { min: number; max: number } {
    const baseWords = durationSeconds * this.WORDS_PER_SECOND;
    return {
      min: Math.floor(baseWords * 0.8), // 20% buffer below
      max: Math.ceil(baseWords * 1.2)   // 20% buffer above
    };
  }

  private removeFiller(response: string): string {
    const fillerWords = [
      'um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally',
      'obviously', 'clearly', 'definitely', 'absolutely', 'totally',
      'really', 'very', 'quite', 'rather', 'somewhat', 'kind of', 'sort of'
    ];
    
    let cleaned = response;
    fillerWords.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    });
    
    // Clean up extra spaces
    return cleaned.replace(/\s+/g, ' ').trim();
  }

  private condenseSentences(response: string): string {
    return response
      // Remove redundant phrases
      .replace(/in order to/g, 'to')
      .replace(/due to the fact that/g, 'because')
      .replace(/at this point in time/g, 'now')
      .replace(/in the event that/g, 'if')
      .replace(/for the purpose of/g, 'to')
      // Combine short sentences
      .replace(/\. ([A-Z][^.]*\.) ([A-Z])/g, ', $1 $2')
      // Remove excessive adjectives
      .replace(/\b(very|extremely|incredibly|absolutely|completely)\s+/g, '');
  }

  private prioritizeKeyContent(response: string, maxWords: number): string {
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Score sentences by importance (keywords, length, position)
    const scoredSentences = sentences.map((sentence, index) => ({
      sentence: sentence.trim(),
      score: this.scoreSentenceImportance(sentence, index, sentences.length)
    }));
    
    // Sort by score and select top sentences within word limit
    scoredSentences.sort((a, b) => b.score - a.score);
    
    let selectedSentences: string[] = [];
    let currentWordCount = 0;
    
    for (const { sentence } of scoredSentences) {
      const sentenceWordCount = this.countWords(sentence);
      if (currentWordCount + sentenceWordCount <= maxWords) {
        selectedSentences.push(sentence);
        currentWordCount += sentenceWordCount;
      }
    }
    
    // Reorder sentences to maintain logical flow
    return this.reorderSentences(selectedSentences, sentences).join('. ') + '.';
  }

  private addSpecificExamples(response: string): string {
    // Add placeholder for specific examples if none exist
    if (!this.hasSpecificExamples(response)) {
      const sentences = response.split(/[.!?]+/);
      const insertPoint = Math.floor(sentences.length / 2);
      
      sentences.splice(
        insertPoint, 
        0, 
        ' For example, in a recent project, I successfully implemented a solution that resulted in measurable improvements'
      );
      
      return sentences.join('.').replace(/\.+/g, '.').trim();
    }
    
    return response;
  }

  private addContext(response: string): string {
    // Add contextual information at the beginning
    const contextPhrases = [
      'In my experience,',
      'Throughout my career,',
      'Based on my background in',
      'Drawing from my expertise,'
    ];
    
    const randomContext = contextPhrases[Math.floor(Math.random() * contextPhrases.length)];
    
    if (!response.toLowerCase().startsWith(randomContext.toLowerCase())) {
      return `${randomContext} ${response.charAt(0).toLowerCase() + response.slice(1)}`;
    }
    
    return response;
  }

  private addTransitions(response: string): string {
    const transitions = [
      'Additionally,',
      'Furthermore,',
      'Moreover,',
      'As a result,',
      'Consequently,',
      'In particular,'
    ];
    
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length > 1) {
      const midPoint = Math.floor(sentences.length / 2);
      const transition = transitions[Math.floor(Math.random() * transitions.length)];
      
      sentences[midPoint] = ` ${transition} ${sentences[midPoint].trim()}`;
    }
    
    return sentences.join('. ') + '.';
  }

  private hasRepetitiveContent(response: string): boolean {
    const words = response.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();
    
    words.forEach(word => {
      if (word.length > 3) { // Only check meaningful words
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });
    
    // Check if any word appears more than 3 times
    return Array.from(wordFreq.values()).some(count => count > 3);
  }

  private hasVagueLanguage(response: string): boolean {
    const vagueWords = [
      'things', 'stuff', 'something', 'someone', 'somewhere',
      'good', 'bad', 'nice', 'great', 'awesome', 'amazing',
      'a lot', 'many', 'some', 'various', 'different'
    ];
    
    const lowerResponse = response.toLowerCase();
    return vagueWords.some(word => lowerResponse.includes(word));
  }

  private hasProperStructure(response: string): boolean {
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Check for minimum sentence count
    if (sentences.length < 2) return false;
    
    // Check for logical connectors
    const connectors = ['because', 'therefore', 'however', 'additionally', 'furthermore', 'as a result'];
    const hasConnectors = connectors.some(connector => 
      response.toLowerCase().includes(connector)
    );
    
    return hasConnectors;
  }

  private hasSpecificExamples(response: string): boolean {
    const exampleIndicators = [
      'for example', 'for instance', 'specifically', 'in particular',
      'such as', 'including', 'like when', 'one time'
    ];
    
    const lowerResponse = response.toLowerCase();
    return exampleIndicators.some(indicator => lowerResponse.includes(indicator));
  }

  private hasActionOrientedLanguage(response: string): boolean {
    const actionWords = [
      'implemented', 'developed', 'created', 'managed', 'led', 'designed',
      'built', 'improved', 'optimized', 'solved', 'achieved', 'delivered',
      'coordinated', 'executed', 'established', 'initiated'
    ];
    
    const lowerResponse = response.toLowerCase();
    return actionWords.some(action => lowerResponse.includes(action));
  }

  private scoreSentenceImportance(sentence: string, index: number, totalSentences: number): number {
    let score = 0;
    
    // Position scoring (first and last sentences are important)
    if (index === 0 || index === totalSentences - 1) {
      score += 3;
    } else if (index === 1 || index === totalSentences - 2) {
      score += 2;
    }
    
    // Length scoring (moderate length preferred)
    const wordCount = this.countWords(sentence);
    if (wordCount >= 10 && wordCount <= 20) {
      score += 2;
    } else if (wordCount >= 5 && wordCount <= 30) {
      score += 1;
    }
    
    // Keyword scoring
    const importantKeywords = [
      'achieved', 'resulted', 'improved', 'successful', 'led', 'managed',
      'developed', 'created', 'implemented', 'solved', 'delivered'
    ];
    
    const lowerSentence = sentence.toLowerCase();
    importantKeywords.forEach(keyword => {
      if (lowerSentence.includes(keyword)) {
        score += 1;
      }
    });
    
    return score;
  }

  private reorderSentences(selectedSentences: string[], originalSentences: string[]): string[] {
    // Maintain original order as much as possible
    return selectedSentences.sort((a, b) => {
      const indexA = originalSentences.findIndex(s => s.trim() === a);
      const indexB = originalSentences.findIndex(s => s.trim() === b);
      return indexA - indexB;
    });
  }
}