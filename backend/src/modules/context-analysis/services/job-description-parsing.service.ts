import { Injectable, Logger } from '@nestjs/common';
import { JobContext, RequirementMatch, Skill, Experience } from '../interfaces/context-analysis.interface';

@Injectable()
export class JobDescriptionParsingService {
  private readonly logger = new Logger(JobDescriptionParsingService.name);

  async extractJobContext(jobDescription: string): Promise<JobContext> {
    try {
      this.logger.debug(`Parsing job description: ${jobDescription.substring(0, 100)}...`);

      const normalizedDescription = jobDescription.toLowerCase();

      // Extract basic information
      const title = this.extractJobTitle(jobDescription);
      const company = this.extractCompanyName(jobDescription);
      const requirements = this.extractRequirements(jobDescription);
      const companyValues = this.extractCompanyValues(jobDescription);
      const interviewType = this.determineInterviewType(jobDescription);
      const seniority = this.extractSeniority(jobDescription);
      const industry = this.extractIndustry(jobDescription);
      const location = this.extractLocation(jobDescription);
      const salary = this.extractSalary(jobDescription);
      const benefits = this.extractBenefits(jobDescription);

      const jobContext: JobContext = {
        title,
        company,
        description: jobDescription,
        requirements,
        companyValues,
        interviewType,
        seniority,
        industry,
        location,
        salary,
        benefits
      };

      this.logger.debug(`Job context extracted successfully`);
      return jobContext;

    } catch (error) {
      this.logger.error(`Error parsing job description: ${error.message}`, error.stack);
      throw error;
    }
  }

  async matchRequirements(
    jobContext: JobContext,
    userSkills: Skill[],
    userExperience: Experience[]
  ): Promise<RequirementMatch[]> {
    try {
      this.logger.debug(`Matching requirements for job: ${jobContext.title}`);

      const matches: RequirementMatch[] = [];

      for (const requirement of jobContext.requirements) {
        const matchingSkills = this.findMatchingSkills(requirement, userSkills);
        const matchingExperiences = this.findMatchingExperiences(requirement, userExperience);
        const matchScore = this.calculateMatchScore(requirement, matchingSkills, matchingExperiences);
        const gaps = this.identifyGaps(requirement, matchingSkills, matchingExperiences);

        matches.push({
          requirement,
          matchingSkills,
          matchingExperiences,
          matchScore,
          gaps
        });
      }

      // Sort by match score (highest first)
      matches.sort((a, b) => b.matchScore - a.matchScore);

      this.logger.debug(`Requirements matching completed. Found ${matches.length} matches`);
      return matches;

    } catch (error) {
      this.logger.error(`Error matching requirements: ${error.message}`, error.stack);
      return [];
    }
  }

  private extractJobTitle(description: string): string {
    // Look for common job title patterns
    const titlePatterns = [
      /job title[:\s]+([^\n\r]+)/i,
      /position[:\s]+([^\n\r]+)/i,
      /role[:\s]+([^\n\r]+)/i,
      /we are looking for[:\s]+(?:a|an)\s+([^\n\r]+)/i,
      /hiring[:\s]+(?:a|an)\s+([^\n\r]+)/i
    ];

    for (const pattern of titlePatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: look for common job titles at the beginning
    const commonTitles = [
      'software engineer', 'frontend developer', 'backend developer', 'full stack developer',
      'data scientist', 'product manager', 'designer', 'devops engineer', 'qa engineer',
      'senior software engineer', 'junior developer', 'tech lead', 'engineering manager'
    ];

    const firstLine = description.split('\n')[0].toLowerCase();
    for (const title of commonTitles) {
      if (firstLine.includes(title)) {
        return title.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }
    }

    return 'Software Engineer'; // Default fallback
  }

  private extractCompanyName(description: string): string {
    // Look for company name patterns
    const companyPatterns = [
      /company[:\s]+([^\n\r]+)/i,
      /at\s+([A-Z][a-zA-Z\s&]+)(?:\s+we|,|\.|$)/,
      /join\s+([A-Z][a-zA-Z\s&]+)(?:\s+as|,|\.|$)/i
    ];

    for (const pattern of companyPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return 'Company'; // Default fallback
  }

  private extractRequirements(description: string): string[] {
    const requirements: string[] = [];
    
    // Look for requirements sections
    const requirementSections = [
      /requirements?[:\s]*\n([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i,
      /qualifications?[:\s]*\n([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i,
      /skills?[:\s]*\n([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i,
      /experience[:\s]*\n([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i,
      /must have[:\s]*\n([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i
    ];

    for (const pattern of requirementSections) {
      const match = description.match(pattern);
      if (match && match[1]) {
        const sectionRequirements = this.parseRequirementsList(match[1]);
        requirements.push(...sectionRequirements);
      }
    }

    // If no structured requirements found, extract from common patterns
    if (requirements.length === 0) {
      const fallbackRequirements = this.extractFallbackRequirements(description);
      requirements.push(...fallbackRequirements);
    }

    return [...new Set(requirements)]; // Remove duplicates
  }

  private parseRequirementsList(text: string): string[] {
    const requirements: string[] = [];
    
    // Split by bullet points, numbers, or line breaks
    const lines = text.split(/\n|•|·|\*|\d+\./).filter(line => line.trim());
    
    for (const line of lines) {
      const cleaned = line.trim();
      if (cleaned.length > 10 && cleaned.length < 200) {
        requirements.push(cleaned);
      }
    }

    return requirements;
  }

  private extractFallbackRequirements(description: string): string[] {
    const requirements: string[] = [];
    
    // Common requirement patterns
    const patterns = [
      /(\d+\+?\s*years?\s+(?:of\s+)?experience\s+(?:with|in)\s+[^.]+)/gi,
      /(proficient\s+(?:with|in)\s+[^.]+)/gi,
      /(experience\s+(?:with|in)\s+[^.]+)/gi,
      /(knowledge\s+of\s+[^.]+)/gi,
      /(familiar\s+with\s+[^.]+)/gi,
      /(bachelor'?s?\s+degree\s+[^.]*)/gi,
      /(master'?s?\s+degree\s+[^.]*)/gi
    ];

    for (const pattern of patterns) {
      const matches = description.match(pattern);
      if (matches) {
        requirements.push(...matches.map(match => match.trim()));
      }
    }

    return requirements;
  }

  private extractCompanyValues(description: string): string[] {
    const values: string[] = [];
    
    // Look for values/culture sections
    const valueSections = [
      /values?[:\s]*\n([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i,
      /culture[:\s]*\n([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i,
      /mission[:\s]*\n([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i,
      /what we believe[:\s]*\n([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i
    ];

    for (const pattern of valueSections) {
      const match = description.match(pattern);
      if (match && match[1]) {
        const sectionValues = this.parseValuesList(match[1]);
        values.push(...sectionValues);
      }
    }

    // Common values keywords
    const valueKeywords = [
      'innovation', 'collaboration', 'integrity', 'excellence', 'diversity',
      'inclusion', 'transparency', 'accountability', 'customer-focused',
      'quality', 'teamwork', 'growth', 'learning', 'agile', 'remote-friendly'
    ];

    const normalizedDescription = description.toLowerCase();
    for (const keyword of valueKeywords) {
      if (normalizedDescription.includes(keyword)) {
        values.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    }

    return [...new Set(values)];
  }

  private parseValuesList(text: string): string[] {
    return text.split(/\n|•|·|\*|\d+\./)
      .map(line => line.trim())
      .filter(line => line.length > 3 && line.length < 100);
  }

  private determineInterviewType(description: string): 'technical' | 'behavioral' | 'mixed' {
    const technicalKeywords = [
      'coding', 'algorithm', 'technical interview', 'whiteboard', 'system design',
      'programming', 'code review', 'technical assessment', 'live coding'
    ];

    const behavioralKeywords = [
      'behavioral', 'culture fit', 'team fit', 'values', 'soft skills',
      'communication', 'leadership', 'collaboration'
    ];

    const normalizedDescription = description.toLowerCase();
    
    const technicalCount = technicalKeywords.filter(keyword => 
      normalizedDescription.includes(keyword)
    ).length;

    const behavioralCount = behavioralKeywords.filter(keyword => 
      normalizedDescription.includes(keyword)
    ).length;

    if (technicalCount > behavioralCount && technicalCount > 0) return 'technical';
    if (behavioralCount > technicalCount && behavioralCount > 0) return 'behavioral';
    return 'mixed';
  }

  private extractSeniority(description: string): string {
    const seniorityKeywords = {
      'junior': ['junior', 'entry level', 'entry-level', 'graduate', 'new grad'],
      'mid': ['mid level', 'mid-level', 'intermediate', '2-4 years', '3-5 years'],
      'senior': ['senior', 'sr.', 'lead', 'principal', '5+ years', '7+ years', 'experienced'],
      'staff': ['staff', 'principal', 'architect', 'distinguished'],
      'executive': ['director', 'vp', 'cto', 'head of', 'chief']
    };

    const normalizedDescription = description.toLowerCase();
    
    for (const [level, keywords] of Object.entries(seniorityKeywords)) {
      for (const keyword of keywords) {
        if (normalizedDescription.includes(keyword)) {
          return level.charAt(0).toUpperCase() + level.slice(1);
        }
      }
    }

    return 'Mid'; // Default fallback
  }

  private extractIndustry(description: string): string {
    const industries = {
      'Technology': ['tech', 'software', 'saas', 'platform', 'digital', 'startup'],
      'Finance': ['fintech', 'banking', 'financial', 'investment', 'trading'],
      'Healthcare': ['healthcare', 'medical', 'pharma', 'biotech', 'health'],
      'E-commerce': ['e-commerce', 'ecommerce', 'retail', 'marketplace', 'shopping'],
      'Education': ['education', 'edtech', 'learning', 'university', 'school'],
      'Gaming': ['gaming', 'game', 'entertainment', 'mobile games'],
      'Media': ['media', 'advertising', 'marketing', 'content', 'social media'],
      'Transportation': ['transportation', 'logistics', 'delivery', 'mobility'],
      'Energy': ['energy', 'renewable', 'oil', 'gas', 'utilities'],
      'Manufacturing': ['manufacturing', 'industrial', 'automotive', 'aerospace']
    };

    const normalizedDescription = description.toLowerCase();
    
    for (const [industry, keywords] of Object.entries(industries)) {
      for (const keyword of keywords) {
        if (normalizedDescription.includes(keyword)) {
          return industry;
        }
      }
    }

    return 'Technology'; // Default fallback
  }

  private extractLocation(description: string): string | undefined {
    const locationPatterns = [
      /location[:\s]+([^\n\r]+)/i,
      /based in[:\s]+([^\n\r]+)/i,
      /office[:\s]+([^\n\r]+)/i,
      /(remote|hybrid|on-site)/i
    ];

    for (const pattern of locationPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private extractSalary(description: string): string | undefined {
    const salaryPatterns = [
      /salary[:\s]+([^\n\r]+)/i,
      /compensation[:\s]+([^\n\r]+)/i,
      /\$[\d,]+(?:\s*-\s*\$[\d,]+)?/g,
      /£[\d,]+(?:\s*-\s*£[\d,]+)?/g,
      /€[\d,]+(?:\s*-\s*€[\d,]+)?/g
    ];

    for (const pattern of salaryPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private extractBenefits(description: string): string[] {
    const benefits: string[] = [];
    
    const benefitKeywords = [
      'health insurance', 'dental', 'vision', '401k', 'retirement',
      'vacation', 'pto', 'flexible hours', 'remote work', 'work from home',
      'stock options', 'equity', 'bonus', 'gym membership', 'learning budget',
      'conference budget', 'professional development', 'maternity leave',
      'paternity leave', 'unlimited pto'
    ];

    const normalizedDescription = description.toLowerCase();
    
    for (const benefit of benefitKeywords) {
      if (normalizedDescription.includes(benefit)) {
        benefits.push(benefit.charAt(0).toUpperCase() + benefit.slice(1));
      }
    }

    return benefits;
  }

  private findMatchingSkills(requirement: string, userSkills: Skill[]): Skill[] {
    const normalizedRequirement = requirement.toLowerCase();
    const matchingSkills: Skill[] = [];

    for (const skill of userSkills) {
      const normalizedSkillName = skill.name.toLowerCase();
      
      // Direct name match
      if (normalizedRequirement.includes(normalizedSkillName)) {
        matchingSkills.push(skill);
        continue;
      }

      // Fuzzy matching for similar technologies
      if (this.isSimilarTechnology(normalizedSkillName, normalizedRequirement)) {
        matchingSkills.push(skill);
      }
    }

    return matchingSkills;
  }

  private findMatchingExperiences(requirement: string, userExperience: Experience[]): Experience[] {
    const normalizedRequirement = requirement.toLowerCase();
    const matchingExperiences: Experience[] = [];

    for (const exp of userExperience) {
      const expText = `${exp.role} ${exp.achievements.join(' ')} ${exp.technologies.join(' ')} ${exp.description || ''}`.toLowerCase();
      
      // Check if requirement keywords appear in experience
      const requirementWords = normalizedRequirement.split(/\s+/).filter(word => word.length > 2);
      const matchCount = requirementWords.filter(word => expText.includes(word)).length;
      
      if (matchCount >= Math.min(2, requirementWords.length * 0.3)) {
        matchingExperiences.push(exp);
      }
    }

    return matchingExperiences;
  }

  private calculateMatchScore(
    requirement: string,
    matchingSkills: Skill[],
    matchingExperiences: Experience[]
  ): number {
    let score = 0;

    // Score based on matching skills
    for (const skill of matchingSkills) {
      const levelScore = { beginner: 0.25, intermediate: 0.5, advanced: 0.75, expert: 1.0 };
      score += levelScore[skill.level] || 0.5;
    }

    // Score based on matching experiences
    score += matchingExperiences.length * 0.3;

    // Normalize to 0-1 range
    return Math.min(1.0, score);
  }

  private identifyGaps(
    requirement: string,
    matchingSkills: Skill[],
    matchingExperiences: Experience[]
  ): string[] {
    const gaps: string[] = [];

    // If no matching skills or experiences, the entire requirement is a gap
    if (matchingSkills.length === 0 && matchingExperiences.length === 0) {
      gaps.push(requirement);
      return gaps;
    }

    // Identify specific technology gaps
    const techKeywords = this.extractTechnicalKeywords(requirement);
    const userTech = matchingSkills.map(skill => skill.name.toLowerCase());
    
    for (const tech of techKeywords) {
      if (!userTech.some(userTechItem => 
        userTechItem.includes(tech) || this.isSimilarTechnology(userTechItem, tech)
      )) {
        gaps.push(`Missing experience with ${tech}`);
      }
    }

    return gaps;
  }

  private extractTechnicalKeywords(text: string): string[] {
    const techPatterns = [
      /\b(?:javascript|typescript|python|java|c#|go|rust|php|ruby|swift|kotlin)\b/gi,
      /\b(?:react|vue|angular|node\.?js|express|nestjs|django|flask|spring|laravel)\b/gi,
      /\b(?:postgresql|mysql|mongodb|redis|elasticsearch|cassandra)\b/gi,
      /\b(?:aws|azure|gcp|docker|kubernetes|terraform|jenkins|gitlab)\b/gi,
      /\b(?:git|agile|scrum|ci\/cd|devops|microservices|api|rest|graphql)\b/gi
    ];

    const keywords: string[] = [];
    
    for (const pattern of techPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        keywords.push(...matches.map(match => match.toLowerCase()));
      }
    }

    return [...new Set(keywords)];
  }

  private isSimilarTechnology(skill: string, requirement: string): boolean {
    const similarTech = {
      'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
      'typescript': ['ts'],
      'react': ['reactjs', 'react.js'],
      'vue': ['vuejs', 'vue.js'],
      'angular': ['angularjs'],
      'node.js': ['nodejs', 'node'],
      'postgresql': ['postgres', 'psql'],
      'mongodb': ['mongo'],
      'kubernetes': ['k8s'],
      'docker': ['containerization'],
      'aws': ['amazon web services'],
      'gcp': ['google cloud platform', 'google cloud']
    };

    for (const [tech, alternatives] of Object.entries(similarTech)) {
      if ((skill.includes(tech) || alternatives.some(alt => skill.includes(alt))) &&
          (requirement.includes(tech) || alternatives.some(alt => requirement.includes(alt)))) {
        return true;
      }
    }

    return false;
  }
}