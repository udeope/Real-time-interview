# AI Interview Assistant - Testing Suite

This directory contains comprehensive tests for the AI Interview Assistant backend application.

## Test Structure

```
test/
├── unit/                     # Unit tests for individual components
├── integration/              # Integration tests for service interactions
├── e2e/                     # End-to-end tests for complete workflows
├── performance/             # Performance and benchmark tests
├── load/                    # Load testing scripts
├── fixtures/                # Test data and mock objects
├── setup-*.ts              # Test environment setup files
└── jest-*.json             # Jest configuration files
```

## Test Types

### Unit Tests
- **Location**: `test/unit/`
- **Purpose**: Test individual services, controllers, and utilities in isolation
- **Run**: `npm run test`
- **Coverage**: Aim for >90% code coverage

### Integration Tests
- **Location**: `test/integration/`
- **Purpose**: Test interactions between services and external APIs
- **Run**: `npm run test:integration`
- **Focus**: Audio-to-response pipeline, database operations, API integrations

### End-to-End Tests
- **Location**: `test/e2e/`
- **Purpose**: Test complete user workflows and scenarios
- **Run**: `npm run test:e2e`
- **Scenarios**: Complete interview sessions, error handling, concurrent users

### Performance Tests
- **Location**: `test/performance/`
- **Purpose**: Validate latency and accuracy requirements
- **Run**: `npm run test:performance`
- **Benchmarks**: 
  - Transcription: <1s latency, >95% accuracy
  - Response generation: <1.5s latency
  - End-to-end: <2s total latency

### Load Tests
- **Location**: `test/load/`
- **Purpose**: Test system behavior under various load conditions
- **Run**: `npm run test:load`
- **Tool**: K6 for load testing
- **Scenarios**: Normal load, stress test, spike test

## Running Tests

### All Tests
```bash
npm run test:all
```

### Individual Test Suites
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Performance tests
npm run test:performance

# Load tests
npm run test:load
```

### Test Options
```bash
# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# Debug mode
npm run test:debug
```

## Test Requirements

### Performance Benchmarks
- **Transcription Latency**: <1000ms for audio clips up to 10 seconds
- **Response Generation**: <1500ms for complex responses
- **End-to-End Pipeline**: <2000ms from audio input to response output
- **Transcription Accuracy**: >95% Word Error Rate (WER)
- **Concurrent Users**: Support 50+ simultaneous sessions

### Quality Metrics
- **Code Coverage**: >90% for all core services
- **Test Reliability**: <1% flaky test rate
- **Performance Consistency**: <10% variance in latency measurements

## Test Data

### Mock Data
- **Users**: Various user profiles with different experience levels
- **Job Contexts**: Different job types and seniority levels
- **Questions**: Categorized by type (technical, behavioral, situational, cultural)
- **Audio Data**: Mock audio buffers for different scenarios

### Test Fixtures
Located in `test/fixtures/test-data.ts`:
- `mockUsers`: Sample user accounts
- `mockUserProfiles`: User experience and skills data
- `mockJobContexts`: Job descriptions and requirements
- `mockQuestions`: Interview questions by category
- `mockResponses`: Expected response formats
- `mockAudioData`: Audio test data

## Environment Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (for integration tests)
- Redis (for caching tests)
- K6 (for load testing)

### Test Database
Integration and E2E tests use a separate test database:
```bash
# Set up test database
npm run db:setup
```

### Environment Variables
Create `.env.test` file:
```env
DATABASE_URL="postgresql://test:test@localhost:5432/ai_interview_test"
REDIS_URL="redis://localhost:6379/1"
JWT_SECRET="test-jwt-secret"
OPENAI_API_KEY="test-openai-key"
GOOGLE_CLOUD_KEY_FILE="path/to/test-service-account.json"
```

## Writing Tests

### Unit Test Example
```typescript
describe('TranscriptionService', () => {
  let service: TranscriptionService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [TranscriptionService, /* mocked dependencies */],
    }).compile();

    service = module.get<TranscriptionService>(TranscriptionService);
  });

  it('should transcribe audio with high confidence', async () => {
    const result = await service.transcribeAudio(mockAudioData.shortClip);
    
    expect(result.text).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0.95);
  });
});
```

### Integration Test Example
```typescript
describe('Audio Pipeline Integration', () => {
  it('should process audio to response within 2 seconds', async () => {
    const startTime = Date.now();
    
    const transcription = await transcriptionService.transcribeAudio(audioBuffer);
    const context = await contextService.analyzeQuestion(transcription.text);
    const responses = await responseService.generateResponses(transcription.text, context);
    
    const totalTime = Date.now() - startTime;
    
    expect(totalTime).toBeLessThan(2000);
    expect(responses).toHaveLength.greaterThan(0);
  });
});
```

### Performance Test Example
```typescript
describe('Performance Benchmarks', () => {
  it('should maintain latency under load', async () => {
    const promises = Array(10).fill(null).map(() => 
      service.processRequest(mockData)
    );
    
    const results = await Promise.all(promises);
    
    results.forEach(result => {
      expect(result.latency).toBeLessThan(1000);
    });
  });
});
```

## Continuous Integration

### GitHub Actions
Tests run automatically on:
- Pull requests
- Pushes to main branch
- Nightly performance benchmarks

### Test Pipeline
1. **Unit Tests**: Fast feedback on code changes
2. **Integration Tests**: Validate service interactions
3. **E2E Tests**: Ensure user workflows work
4. **Performance Tests**: Validate latency requirements
5. **Load Tests**: Check system scalability

### Quality Gates
- All tests must pass
- Code coverage >90%
- Performance benchmarks met
- No security vulnerabilities

## Troubleshooting

### Common Issues

#### Test Database Connection
```bash
# Reset test database
npm run db:reset

# Check connection
npm run db:studio
```

#### Performance Test Failures
- Check system resources (CPU, memory)
- Verify external API availability
- Review test timeouts

#### Flaky Tests
- Add proper wait conditions
- Use deterministic test data
- Mock external dependencies

### Debug Mode
```bash
# Run specific test in debug mode
npm run test:debug -- --testNamePattern="specific test"
```

### Logs and Monitoring
- Test logs: `logs/test.log`
- Performance metrics: `test-results/performance.json`
- Coverage reports: `coverage/lcov-report/index.html`

## Contributing

### Adding New Tests
1. Follow existing test structure and naming conventions
2. Include both positive and negative test cases
3. Add performance benchmarks for new features
4. Update test documentation

### Test Guidelines
- Write descriptive test names
- Use arrange-act-assert pattern
- Mock external dependencies
- Test edge cases and error conditions
- Maintain test independence

### Performance Testing
- Always include latency measurements
- Test with realistic data volumes
- Validate accuracy requirements
- Document performance expectations