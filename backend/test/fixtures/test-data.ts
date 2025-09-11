export const mockUsers = [
  {
    id: 'user-1',
    email: 'john.doe@example.com',
    name: 'John Doe',
    subscriptionTier: 'pro',
  },
  {
    id: 'user-2',
    email: 'jane.smith@example.com',
    name: 'Jane Smith',
    subscriptionTier: 'free',
  },
  {
    id: 'user-3',
    email: 'senior.dev@example.com',
    name: 'Senior Developer',
    subscriptionTier: 'enterprise',
  },
];

export const mockUserProfiles = [
  {
    userId: 'user-1',
    experience: [
      {
        company: 'Tech Innovations Inc',
        role: 'Senior Full Stack Developer',
        duration: '3 years',
        achievements: [
          'Led development of microservices architecture serving 1M+ users',
          'Reduced API response time by 40% through optimization',
          'Mentored 5 junior developers',
        ],
        technologies: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS'],
      },
      {
        company: 'Startup Solutions',
        role: 'Full Stack Developer',
        duration: '2 years',
        achievements: [
          'Built MVP from scratch using React and Node.js',
          'Implemented CI/CD pipeline reducing deployment time by 60%',
        ],
        technologies: ['React', 'Node.js', 'MongoDB', 'Docker'],
      },
    ],
    skills: [
      { name: 'JavaScript', level: 'expert' },
      { name: 'TypeScript', level: 'advanced' },
      { name: 'React', level: 'expert' },
      { name: 'Node.js', level: 'advanced' },
      { name: 'PostgreSQL', level: 'intermediate' },
      { name: 'AWS', level: 'intermediate' },
    ],
    industries: ['technology', 'fintech', 'e-commerce'],
    seniority: 'senior',
  },
  {
    userId: 'user-2',
    experience: [
      {
        company: 'Digital Agency',
        role: 'Frontend Developer',
        duration: '1.5 years',
        achievements: [
          'Developed responsive web applications for 10+ clients',
          'Improved website performance by 30%',
        ],
        technologies: ['HTML', 'CSS', 'JavaScript', 'React', 'Sass'],
      },
    ],
    skills: [
      { name: 'HTML', level: 'expert' },
      { name: 'CSS', level: 'advanced' },
      { name: 'JavaScript', level: 'intermediate' },
      { name: 'React', level: 'intermediate' },
    ],
    industries: ['marketing', 'design'],
    seniority: 'mid',
  },
];

export const mockJobContexts = [
  {
    title: 'Senior Full Stack Developer',
    company: 'Innovation Tech Corp',
    description: 'We are looking for an experienced full stack developer to join our growing team. You will be responsible for developing scalable web applications using modern technologies.',
    requirements: [
      '5+ years of experience in web development',
      'Strong proficiency in JavaScript and TypeScript',
      'Experience with React and Node.js',
      'Knowledge of database design and optimization',
      'Experience with cloud platforms (AWS, Azure, or GCP)',
      'Strong problem-solving skills',
    ],
    companyValues: ['Innovation', 'Collaboration', 'Excellence', 'Growth'],
    interviewType: 'technical',
    seniority: 'senior',
  },
  {
    title: 'Frontend Developer',
    company: 'Creative Solutions Ltd',
    description: 'Join our creative team to build beautiful and functional user interfaces for our clients.',
    requirements: [
      '2+ years of frontend development experience',
      'Proficiency in HTML, CSS, and JavaScript',
      'Experience with React or Vue.js',
      'Understanding of responsive design principles',
      'Knowledge of version control (Git)',
    ],
    companyValues: ['Creativity', 'Quality', 'Client Focus'],
    interviewType: 'mixed',
    seniority: 'mid',
  },
  {
    title: 'Team Lead - Software Engineering',
    company: 'Leadership Dynamics',
    description: 'Lead a team of talented engineers while contributing to technical architecture and mentoring.',
    requirements: [
      '7+ years of software development experience',
      '2+ years of team leadership experience',
      'Strong technical background in multiple technologies',
      'Excellent communication and mentoring skills',
      'Experience with agile methodologies',
    ],
    companyValues: ['Leadership', 'Mentorship', 'Technical Excellence'],
    interviewType: 'behavioral',
    seniority: 'lead',
  },
];

export const mockQuestions = {
  technical: [
    'Can you explain how React hooks work and provide an example?',
    'How would you optimize a slow database query?',
    'Describe the difference between REST and GraphQL APIs',
    'What is your approach to handling errors in asynchronous JavaScript code?',
    'How would you implement authentication in a web application?',
    'Explain the concept of microservices and their benefits',
    'What are the key principles of responsive web design?',
    'How do you ensure code quality in your projects?',
  ],
  behavioral: [
    'Tell me about a time when you had to work with a difficult team member',
    'Describe a situation where you had to meet a tight deadline',
    'Give me an example of when you had to learn a new technology quickly',
    'Tell me about a project you\'re particularly proud of',
    'Describe a time when you had to give constructive feedback to a colleague',
    'How do you handle disagreements with your manager or team lead?',
    'Tell me about a mistake you made and how you handled it',
    'Describe a time when you had to adapt to a significant change at work',
  ],
  situational: [
    'How would you handle a situation where you disagree with a technical decision?',
    'What would you do if you discovered a security vulnerability in production?',
    'How would you approach onboarding a new team member?',
    'What would you do if a project was falling behind schedule?',
    'How would you handle a situation where requirements keep changing?',
    'What would you do if you found a bug in code written by a senior colleague?',
  ],
  cultural: [
    'Why do you want to work for our company?',
    'How do you stay updated with new technologies and industry trends?',
    'What motivates you in your work?',
    'How do you handle work-life balance?',
    'What are your career goals for the next 5 years?',
    'How do you prefer to receive feedback?',
  ],
};

export const mockResponses = {
  technical: [
    {
      id: 'tech-1',
      content: 'React hooks are functions that allow you to use state and other React features in functional components. For example, useState allows you to add state to a functional component: const [count, setCount] = useState(0). This creates a state variable count with an initial value of 0 and a setter function setCount to update it.',
      structure: 'direct',
      estimatedDuration: 45,
      confidence: 0.95,
      tags: ['react', 'hooks', 'javascript'],
    },
    {
      id: 'tech-2',
      content: 'To optimize a slow database query, I would first analyze the query execution plan to identify bottlenecks. Common optimization techniques include adding appropriate indexes, rewriting complex joins, using query hints when necessary, and considering denormalization for read-heavy operations. I would also monitor query performance over time to ensure optimizations remain effective.',
      structure: 'direct',
      estimatedDuration: 60,
      confidence: 0.92,
      tags: ['database', 'optimization', 'performance'],
    },
  ],
  behavioral: [
    {
      id: 'behav-1',
      content: 'In my previous role at Tech Corp, I worked with a team member who was consistently missing deadlines and not communicating blockers. I approached this by first having a private conversation to understand if there were any underlying issues. I discovered they were struggling with a new technology. I offered to pair program with them and set up regular check-ins. This improved their performance significantly and strengthened our working relationship.',
      structure: 'STAR',
      estimatedDuration: 75,
      confidence: 0.88,
      tags: ['teamwork', 'communication', 'mentoring'],
    },
  ],
};

export const mockTranscriptionResults = [
  {
    text: 'Tell me about your experience with React development',
    confidence: 0.96,
    isFinal: true,
    timestamp: Date.now(),
    speakerId: 'interviewer',
  },
  {
    text: 'How would you handle a situation where you disagree with your manager',
    confidence: 0.94,
    isFinal: true,
    timestamp: Date.now(),
    speakerId: 'interviewer',
  },
  {
    text: 'What is your understanding of microservices architecture',
    confidence: 0.98,
    isFinal: true,
    timestamp: Date.now(),
    speakerId: 'interviewer',
  },
];

export const mockInterviewSessions = [
  {
    id: 'session-1',
    userId: 'user-1',
    jobContext: mockJobContexts[0],
    status: 'active',
    startedAt: new Date(Date.now() - 1800000), // 30 minutes ago
    settings: {
      transcriptionProvider: 'google',
      responseStyle: 'professional',
      maxResponseLength: 90,
    },
  },
  {
    id: 'session-2',
    userId: 'user-2',
    jobContext: mockJobContexts[1],
    status: 'completed',
    startedAt: new Date(Date.now() - 7200000), // 2 hours ago
    endedAt: new Date(Date.now() - 3600000), // 1 hour ago
    settings: {
      transcriptionProvider: 'whisper',
      responseStyle: 'conversational',
      maxResponseLength: 75,
    },
  },
];

export const mockInteractions = [
  {
    id: 'interaction-1',
    sessionId: 'session-1',
    question: 'Tell me about your experience with React',
    questionType: 'technical',
    responses: mockResponses.technical,
    selectedResponse: mockResponses.technical[0].content,
    userFeedback: 5,
    timestamp: new Date(Date.now() - 900000), // 15 minutes ago
  },
  {
    id: 'interaction-2',
    sessionId: 'session-1',
    question: 'Describe a challenging project you worked on',
    questionType: 'behavioral',
    responses: mockResponses.behavioral,
    selectedResponse: mockResponses.behavioral[0].content,
    userFeedback: 4,
    timestamp: new Date(Date.now() - 600000), // 10 minutes ago
  },
];

export const mockSessionMetrics = [
  {
    id: 'metrics-1',
    sessionId: 'session-1',
    transcriptionLatencyMs: 850,
    responseGenerationMs: 1200,
    totalLatencyMs: 2050,
    transcriptionAccuracy: 0.96,
    userSatisfaction: 5,
    createdAt: new Date(),
  },
  {
    id: 'metrics-2',
    sessionId: 'session-2',
    transcriptionLatencyMs: 920,
    responseGenerationMs: 1100,
    totalLatencyMs: 2020,
    transcriptionAccuracy: 0.94,
    userSatisfaction: 4,
    createdAt: new Date(Date.now() - 3600000),
  },
];

// Audio test data (mock binary data)
export const mockAudioData = {
  shortClip: Buffer.from('mock-short-audio-data'),
  mediumClip: Buffer.from('mock-medium-audio-data'.repeat(100)),
  longClip: Buffer.from('mock-long-audio-data'.repeat(1000)),
  corruptedClip: Buffer.from('corrupted-audio-data'),
  silentClip: Buffer.alloc(1600), // Silent audio
};

// Performance test data
export const performanceTestData = {
  concurrentUsers: 50,
  testDuration: 300, // 5 minutes
  expectedLatency: {
    transcription: 1000, // 1 second
    responseGeneration: 1500, // 1.5 seconds
    endToEnd: 2000, // 2 seconds
  },
  expectedAccuracy: {
    transcription: 0.95, // 95%
    responseRelevance: 0.90, // 90%
  },
};

export function createMockUser(overrides: Partial<typeof mockUsers[0]> = {}) {
  return {
    ...mockUsers[0],
    ...overrides,
    id: `user-${Date.now()}-${Math.random()}`,
  };
}

export function createMockSession(overrides: Partial<typeof mockInterviewSessions[0]> = {}) {
  return {
    ...mockInterviewSessions[0],
    ...overrides,
    id: `session-${Date.now()}-${Math.random()}`,
  };
}

export function createMockInteraction(overrides: Partial<typeof mockInteractions[0]> = {}) {
  return {
    ...mockInteractions[0],
    ...overrides,
    id: `interaction-${Date.now()}-${Math.random()}`,
  };
}