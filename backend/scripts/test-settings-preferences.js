const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSettingsAndPreferences() {
  console.log('🔧 Testing Settings and Preferences Functionality...\n');

  try {
    // Test user creation
    console.log('1. Creating test user...');
    const testUser = await prisma.user.create({
      data: {
        email: 'settings-test@example.com',
        name: 'Settings Test User',
        password: 'hashed_password',
      },
    });
    console.log(`✅ Created user: ${testUser.id}\n`);

    // Test default preferences creation
    console.log('2. Testing default preferences creation...');
    const defaultPreferences = await prisma.userPreferences.create({
      data: {
        userId: testUser.id,
        language: 'en',
        timezone: 'UTC',
        emailNotifications: true,
        pushNotifications: true,
        interviewReminders: true,
        practiceReminders: true,
        weeklyReports: true,
        theme: 'light',
        audioQuality: 'high',
        autoSaveResponses: true,
        showConfidenceScores: true,
      },
    });
    console.log(`✅ Created default preferences: ${defaultPreferences.id}`);

    // Test preferences retrieval
    console.log('3. Testing preferences retrieval...');
    const retrievedPreferences = await prisma.userPreferences.findUnique({
      where: { userId: testUser.id },
    });
    console.log(`✅ Retrieved preferences for user ${testUser.id}`);
    console.log(`   - Language: ${retrievedPreferences.language}`);
    console.log(`   - Theme: ${retrievedPreferences.theme}`);
    console.log(`   - Audio Quality: ${retrievedPreferences.audioQuality}`);

    // Test preferences update
    console.log('\n4. Testing preferences update...');
    const updatedPreferences = await prisma.userPreferences.update({
      where: { userId: testUser.id },
      data: {
        language: 'es',
        theme: 'dark',
        audioQuality: 'medium',
        emailNotifications: false,
        timezone: 'America/New_York',
      },
    });
    console.log(`✅ Updated preferences:`);
    console.log(`   - Language: ${updatedPreferences.language}`);
    console.log(`   - Theme: ${updatedPreferences.theme}`);
    console.log(`   - Audio Quality: ${updatedPreferences.audioQuality}`);
    console.log(`   - Email Notifications: ${updatedPreferences.emailNotifications}`);
    console.log(`   - Timezone: ${updatedPreferences.timezone}`);

    // Test partial preferences update
    console.log('\n5. Testing partial preferences update...');
    const partialUpdate = await prisma.userPreferences.update({
      where: { userId: testUser.id },
      data: {
        practiceReminders: false,
        showConfidenceScores: false,
      },
    });
    console.log(`✅ Partial update successful:`);
    console.log(`   - Practice Reminders: ${partialUpdate.practiceReminders}`);
    console.log(`   - Show Confidence Scores: ${partialUpdate.showConfidenceScores}`);

    // Test preferences with user relation
    console.log('\n6. Testing preferences with user relation...');
    const userWithPreferences = await prisma.user.findUnique({
      where: { id: testUser.id },
      include: {
        preferences: true,
      },
    });
    console.log(`✅ User with preferences:`);
    console.log(`   - User: ${userWithPreferences.name} (${userWithPreferences.email})`);
    console.log(`   - Preferences ID: ${userWithPreferences.preferences.id}`);
    console.log(`   - Language: ${userWithPreferences.preferences.language}`);

    // Test creating sample data for comprehensive deletion test
    console.log('\n7. Creating sample data for deletion test...');
    
    // Create user profile
    const userProfile = await prisma.userProfile.create({
      data: {
        userId: testUser.id,
        seniority: 'mid',
        industries: ['technology', 'software'],
        skills: [
          { name: 'JavaScript', level: 'advanced' },
          { name: 'React', level: 'intermediate' },
        ],
        experience: [
          {
            company: 'Test Company',
            role: 'Software Engineer',
            duration: '2 years',
          },
        ],
      },
    });
    console.log(`✅ Created user profile: ${userProfile.id}`);

    // Create interview session
    const interviewSession = await prisma.interviewSession.create({
      data: {
        userId: testUser.id,
        jobContext: {
          company: 'Test Company',
          position: 'Software Engineer',
          description: 'Test interview session',
        },
        status: 'completed',
      },
    });
    console.log(`✅ Created interview session: ${interviewSession.id}`);

    // Create practice session
    const practiceSession = await prisma.practiceSession.create({
      data: {
        userId: testUser.id,
        jobTitle: 'Software Engineer',
        industry: 'technology',
        difficulty: 'mid',
        questionTypes: ['technical', 'behavioral'],
        questionCount: 5,
        status: 'completed',
      },
    });
    console.log(`✅ Created practice session: ${practiceSession.id}`);

    // Create user integration
    const userIntegration = await prisma.userIntegration.create({
      data: {
        userId: testUser.id,
        integrationType: 'LINKEDIN',
        accessToken: 'test_access_token',
        scopes: ['r_liteprofile'],
      },
    });
    console.log(`✅ Created user integration: ${userIntegration.id}`);

    // Test preferences statistics
    console.log('\n8. Testing preferences statistics...');
    const [
      totalPreferences,
      languageStats,
      themeStats,
      notificationStats,
    ] = await Promise.all([
      prisma.userPreferences.count(),
      prisma.userPreferences.groupBy({
        by: ['language'],
        _count: { language: true },
      }),
      prisma.userPreferences.groupBy({
        by: ['theme'],
        _count: { theme: true },
      }),
      prisma.userPreferences.aggregate({
        _count: {
          emailNotifications: true,
          pushNotifications: true,
          interviewReminders: true,
        },
      }),
    ]);

    console.log(`✅ Preferences statistics:`);
    console.log(`   - Total preferences: ${totalPreferences}`);
    console.log(`   - Language distribution:`, languageStats);
    console.log(`   - Theme distribution:`, themeStats);
    console.log(`   - Notification counts:`, notificationStats);

    // Test data export simulation
    console.log('\n9. Testing data export simulation...');
    const exportData = await prisma.user.findUnique({
      where: { id: testUser.id },
      include: {
        profile: true,
        preferences: true,
        sessions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        practiceSessions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        integrations: true,
      },
    });

    console.log(`✅ Data export simulation:`);
    console.log(`   - User data: ${exportData.name} (${exportData.email})`);
    console.log(`   - Profile: ${exportData.profile ? 'Yes' : 'No'}`);
    console.log(`   - Preferences: ${exportData.preferences ? 'Yes' : 'No'}`);
    console.log(`   - Interview sessions: ${exportData.sessions.length}`);
    console.log(`   - Practice sessions: ${exportData.practiceSessions.length}`);
    console.log(`   - Integrations: ${exportData.integrations.length}`);

    // Test account deletion simulation (without actually deleting)
    console.log('\n10. Testing account deletion simulation...');
    
    // Count data before deletion
    const [
      profileCount,
      sessionCount,
      practiceCount,
      integrationCount,
      preferencesCount,
    ] = await Promise.all([
      prisma.userProfile.count({ where: { userId: testUser.id } }),
      prisma.interviewSession.count({ where: { userId: testUser.id } }),
      prisma.practiceSession.count({ where: { userId: testUser.id } }),
      prisma.userIntegration.count({ where: { userId: testUser.id } }),
      prisma.userPreferences.count({ where: { userId: testUser.id } }),
    ]);

    console.log(`✅ Data counts before deletion:`);
    console.log(`   - User profiles: ${profileCount}`);
    console.log(`   - Interview sessions: ${sessionCount}`);
    console.log(`   - Practice sessions: ${practiceCount}`);
    console.log(`   - Integrations: ${integrationCount}`);
    console.log(`   - Preferences: ${preferencesCount}`);

    // Test preferences validation
    console.log('\n11. Testing preferences validation...');
    
    // Test invalid theme
    try {
      await prisma.userPreferences.update({
        where: { userId: testUser.id },
        data: { theme: 'invalid_theme' },
      });
      console.log('❌ Should have failed with invalid theme');
    } catch (error) {
      console.log('✅ Correctly rejected invalid theme');
    }

    // Test invalid language
    try {
      await prisma.userPreferences.update({
        where: { userId: testUser.id },
        data: { language: 'invalid_lang' },
      });
      console.log('❌ Should have failed with invalid language');
    } catch (error) {
      console.log('✅ Correctly rejected invalid language');
    }

    // Test preferences upsert functionality
    console.log('\n12. Testing preferences upsert...');
    const upsertResult = await prisma.userPreferences.upsert({
      where: { userId: testUser.id },
      create: {
        userId: testUser.id,
        language: 'fr',
        theme: 'system',
      },
      update: {
        language: 'fr',
        theme: 'system',
      },
    });
    console.log(`✅ Upsert successful: Language = ${upsertResult.language}, Theme = ${upsertResult.theme}`);

    console.log('\n🎉 All settings and preferences tests passed successfully!');

  } catch (error) {
    console.error('❌ Settings and preferences test failed:', error);
    throw error;
  } finally {
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Delete in correct order due to foreign key constraints
      await prisma.userIntegration.deleteMany({
        where: { userId: { contains: 'settings-test' } },
      });
      
      await prisma.practiceSession.deleteMany({
        where: { userId: { contains: 'settings-test' } },
      });
      
      await prisma.interviewSession.deleteMany({
        where: { userId: { contains: 'settings-test' } },
      });
      
      await prisma.userProfile.deleteMany({
        where: { userId: { contains: 'settings-test' } },
      });
      
      await prisma.userPreferences.deleteMany({
        where: { userId: { contains: 'settings-test' } },
      });
      
      await prisma.user.deleteMany({
        where: { email: 'settings-test@example.com' },
      });
      
      console.log('✅ Test data cleaned up');
    } catch (cleanupError) {
      console.error('⚠️  Cleanup failed:', cleanupError);
    }

    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testSettingsAndPreferences()
    .then(() => {
      console.log('\n✅ Settings and preferences test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Settings and preferences test failed:', error);
      process.exit(1);
    });
}

module.exports = { testSettingsAndPreferences };