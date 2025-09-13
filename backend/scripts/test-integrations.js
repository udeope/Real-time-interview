const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testIntegrations() {
  console.log('🔧 Testing Integration Database Persistence...\n');

  try {
    // Test user creation
    console.log('1. Creating test user...');
    const testUser = await prisma.user.create({
      data: {
        email: 'integration-test@example.com',
        name: 'Integration Test User',
        password: 'hashed_password',
      },
    });
    console.log(`✅ Created user: ${testUser.id}\n`);

    // Test LinkedIn integration
    console.log('2. Testing LinkedIn integration...');
    const linkedInIntegration = await prisma.userIntegration.create({
      data: {
        userId: testUser.id,
        integrationType: 'LINKEDIN',
        providerUserId: 'linkedin_user_123',
        accessToken: 'linkedin_access_token',
        scopes: ['r_liteprofile', 'r_emailaddress'],
        syncData: {
          profileId: 'linkedin_user_123',
          firstName: 'John',
          lastName: 'Doe',
          headline: 'Software Engineer',
        },
      },
    });
    console.log(`✅ Created LinkedIn integration: ${linkedInIntegration.id}`);

    // Test Google Calendar integration
    console.log('3. Testing Google Calendar integration...');
    const googleCalendarIntegration = await prisma.userIntegration.create({
      data: {
        userId: testUser.id,
        integrationType: 'GOOGLE_CALENDAR',
        accessToken: 'google_access_token',
        refreshToken: 'google_refresh_token',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      },
    });
    console.log(`✅ Created Google Calendar integration: ${googleCalendarIntegration.id}`);

    // Test calendar event
    console.log('4. Testing calendar event creation...');
    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        userId: testUser.id,
        integrationId: googleCalendarIntegration.id,
        externalId: 'google_event_123',
        title: 'Technical Interview - Software Engineer',
        description: 'Interview with ABC Company for Software Engineer position',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
        attendees: ['interviewer@company.com', 'hr@company.com'],
        location: 'Conference Room A',
        meetingUrl: 'https://meet.google.com/abc-def-ghi',
        isInterviewRelated: true,
        companyName: 'ABC Company',
        jobTitle: 'Software Engineer',
      },
    });
    console.log(`✅ Created calendar event: ${calendarEvent.id}`);

    // Test Zoom integration
    console.log('5. Testing Zoom integration...');
    const zoomIntegration = await prisma.userIntegration.create({
      data: {
        userId: testUser.id,
        integrationType: 'ZOOM',
        accessToken: 'zoom_access_token',
        refreshToken: 'zoom_refresh_token',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        scopes: ['meeting:read'],
      },
    });
    console.log(`✅ Created Zoom integration: ${zoomIntegration.id}`);

    // Test video meeting
    console.log('6. Testing video meeting creation...');
    const videoMeeting = await prisma.videoMeeting.create({
      data: {
        userId: testUser.id,
        integrationId: zoomIntegration.id,
        externalId: 'zoom_meeting_123',
        title: 'Final Round Interview',
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
        duration: 60,
        joinUrl: 'https://zoom.us/j/123456789',
        hostId: 'zoom_host_123',
        platform: 'zoom',
        isRecorded: false,
        participants: [
          { name: 'John Doe', email: 'john@example.com', role: 'participant' },
          { name: 'Jane Smith', email: 'jane@company.com', role: 'host' },
        ],
        isInterviewRelated: true,
      },
    });
    console.log(`✅ Created video meeting: ${videoMeeting.id}`);

    // Test integration queries
    console.log('\n7. Testing integration queries...');
    
    // Get user integrations
    const userIntegrations = await prisma.userIntegration.findMany({
      where: { userId: testUser.id },
      include: {
        calendarEvents: true,
        videoMeetings: true,
      },
    });
    console.log(`✅ Found ${userIntegrations.length} integrations for user`);

    // Get upcoming interviews
    const upcomingInterviews = await prisma.calendarEvent.findMany({
      where: {
        userId: testUser.id,
        isInterviewRelated: true,
        startTime: {
          gte: new Date(),
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
    console.log(`✅ Found ${upcomingInterviews.length} upcoming interviews`);

    // Get upcoming video interviews
    const upcomingVideoInterviews = await prisma.videoMeeting.findMany({
      where: {
        userId: testUser.id,
        isInterviewRelated: true,
        startTime: {
          gte: new Date(),
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
    console.log(`✅ Found ${upcomingVideoInterviews.length} upcoming video interviews`);

    // Test integration stats
    console.log('\n8. Testing integration stats...');
    const [totalIntegrations, activeIntegrations, calendarEventsCount, videoMeetingsCount] = await Promise.all([
      prisma.userIntegration.count({
        where: { userId: testUser.id },
      }),
      prisma.userIntegration.count({
        where: { userId: testUser.id, isActive: true },
      }),
      prisma.calendarEvent.count({
        where: { userId: testUser.id },
      }),
      prisma.videoMeeting.count({
        where: { userId: testUser.id },
      }),
    ]);

    console.log(`✅ Integration stats:`);
    console.log(`   - Total integrations: ${totalIntegrations}`);
    console.log(`   - Active integrations: ${activeIntegrations}`);
    console.log(`   - Calendar events: ${calendarEventsCount}`);
    console.log(`   - Video meetings: ${videoMeetingsCount}`);

    // Test sync status update
    console.log('\n9. Testing sync status update...');
    await prisma.userIntegration.update({
      where: {
        userId_integrationType: {
          userId: testUser.id,
          integrationType: 'LINKEDIN',
        },
      },
      data: {
        lastSync: new Date(),
        syncData: {
          profileId: 'linkedin_user_123',
          positionsCount: 3,
          skillsCount: 15,
          lastSyncedAt: new Date(),
        },
      },
    });
    console.log(`✅ Updated LinkedIn sync status`);

    // Test integration deactivation
    console.log('\n10. Testing integration deactivation...');
    await prisma.userIntegration.update({
      where: {
        userId_integrationType: {
          userId: testUser.id,
          integrationType: 'ZOOM',
        },
      },
      data: {
        isActive: false,
      },
    });
    console.log(`✅ Deactivated Zoom integration`);

    // Verify deactivation
    const deactivatedIntegration = await prisma.userIntegration.findUnique({
      where: {
        userId_integrationType: {
          userId: testUser.id,
          integrationType: 'ZOOM',
        },
      },
    });
    console.log(`✅ Zoom integration active status: ${deactivatedIntegration.isActive}`);

    console.log('\n🎉 All integration tests passed successfully!');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    throw error;
  } finally {
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Delete in correct order due to foreign key constraints
      await prisma.calendarEvent.deleteMany({
        where: { userId: { contains: 'integration-test' } },
      });
      
      await prisma.videoMeeting.deleteMany({
        where: { userId: { contains: 'integration-test' } },
      });
      
      await prisma.userIntegration.deleteMany({
        where: { userId: { contains: 'integration-test' } },
      });
      
      await prisma.user.deleteMany({
        where: { email: 'integration-test@example.com' },
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
  testIntegrations()
    .then(() => {
      console.log('\n✅ Integration test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Integration test failed:', error);
      process.exit(1);
    });
}

module.exports = { testIntegrations };