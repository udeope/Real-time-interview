import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../config/prisma.service';
import { IntegrationType, UserIntegration, CalendarEvent, VideoMeeting } from '@prisma/client';

export interface CreateIntegrationDto {
  userId: string;
  integrationType: IntegrationType;
  providerUserId?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
  syncData?: any;
}

export interface UpdateIntegrationDto {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  isActive?: boolean;
  lastSync?: Date;
  syncData?: any;
}

export interface CreateCalendarEventDto {
  userId: string;
  integrationId: string;
  externalId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  meetingUrl?: string;
  isInterviewRelated?: boolean;
  companyName?: string;
  jobTitle?: string;
}

export interface CreateVideoMeetingDto {
  userId: string;
  integrationId: string;
  externalId: string;
  title: string;
  startTime: Date;
  duration: number;
  joinUrl: string;
  hostId?: string;
  platform: string;
  isRecorded?: boolean;
  recordingUrl?: string;
  participants?: any;
  isInterviewRelated?: boolean;
}

@Injectable()
export class IntegrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // User Integration Management
  async createIntegration(data: CreateIntegrationDto): Promise<UserIntegration> {
    return this.prisma.userIntegration.create({
      data,
    });
  }

  async findIntegrationByUserAndType(
    userId: string,
    integrationType: IntegrationType,
  ): Promise<UserIntegration | null> {
    return this.prisma.userIntegration.findUnique({
      where: {
        userId_integrationType: {
          userId,
          integrationType,
        },
      },
    });
  }

  async findUserIntegrations(userId: string): Promise<UserIntegration[]> {
    return this.prisma.userIntegration.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findIntegrationsByType(integrationType: IntegrationType): Promise<UserIntegration[]> {
    return this.prisma.userIntegration.findMany({
      where: {
        integrationType,
        isActive: true,
      },
    });
  }

  async updateIntegration(
    userId: string,
    integrationType: IntegrationType,
    data: UpdateIntegrationDto,
  ): Promise<UserIntegration> {
    return this.prisma.userIntegration.update({
      where: {
        userId_integrationType: {
          userId,
          integrationType,
        },
      },
      data,
    });
  }

  async deactivateIntegration(
    userId: string,
    integrationType: IntegrationType,
  ): Promise<UserIntegration> {
    return this.prisma.userIntegration.update({
      where: {
        userId_integrationType: {
          userId,
          integrationType,
        },
      },
      data: {
        isActive: false,
      },
    });
  }

  async deleteIntegration(
    userId: string,
    integrationType: IntegrationType,
  ): Promise<void> {
    await this.prisma.userIntegration.delete({
      where: {
        userId_integrationType: {
          userId,
          integrationType,
        },
      },
    });
  }

  // Calendar Events Management
  async createCalendarEvent(data: CreateCalendarEventDto): Promise<CalendarEvent> {
    return this.prisma.calendarEvent.create({
      data,
    });
  }

  async upsertCalendarEvent(data: CreateCalendarEventDto): Promise<CalendarEvent> {
    return this.prisma.calendarEvent.upsert({
      where: {
        integrationId_externalId: {
          integrationId: data.integrationId,
          externalId: data.externalId,
        },
      },
      create: data,
      update: {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        attendees: data.attendees,
        location: data.location,
        meetingUrl: data.meetingUrl,
        isInterviewRelated: data.isInterviewRelated,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        updatedAt: new Date(),
      },
    });
  }

  async findCalendarEvents(
    userId: string,
    startTime?: Date,
    endTime?: Date,
    interviewOnly?: boolean,
  ): Promise<CalendarEvent[]> {
    const where: any = { userId };

    if (startTime || endTime) {
      where.startTime = {};
      if (startTime) where.startTime.gte = startTime;
      if (endTime) where.startTime.lte = endTime;
    }

    if (interviewOnly) {
      where.isInterviewRelated = true;
    }

    return this.prisma.calendarEvent.findMany({
      where,
      orderBy: {
        startTime: 'asc',
      },
      include: {
        integration: true,
      },
    });
  }

  async findUpcomingInterviews(userId: string): Promise<CalendarEvent[]> {
    return this.prisma.calendarEvent.findMany({
      where: {
        userId,
        isInterviewRelated: true,
        startTime: {
          gte: new Date(),
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      include: {
        integration: true,
      },
    });
  }

  async deleteCalendarEventsByIntegration(integrationId: string): Promise<void> {
    await this.prisma.calendarEvent.deleteMany({
      where: {
        integrationId,
      },
    });
  }

  // Video Meetings Management
  async createVideoMeeting(data: CreateVideoMeetingDto): Promise<VideoMeeting> {
    return this.prisma.videoMeeting.create({
      data,
    });
  }

  async upsertVideoMeeting(data: CreateVideoMeetingDto): Promise<VideoMeeting> {
    return this.prisma.videoMeeting.upsert({
      where: {
        integrationId_externalId: {
          integrationId: data.integrationId,
          externalId: data.externalId,
        },
      },
      create: data,
      update: {
        title: data.title,
        startTime: data.startTime,
        duration: data.duration,
        joinUrl: data.joinUrl,
        hostId: data.hostId,
        platform: data.platform,
        isRecorded: data.isRecorded,
        recordingUrl: data.recordingUrl,
        participants: data.participants,
        isInterviewRelated: data.isInterviewRelated,
        updatedAt: new Date(),
      },
    });
  }

  async findVideoMeetings(
    userId: string,
    startTime?: Date,
    endTime?: Date,
    interviewOnly?: boolean,
  ): Promise<VideoMeeting[]> {
    const where: any = { userId };

    if (startTime || endTime) {
      where.startTime = {};
      if (startTime) where.startTime.gte = startTime;
      if (endTime) where.startTime.lte = endTime;
    }

    if (interviewOnly) {
      where.isInterviewRelated = true;
    }

    return this.prisma.videoMeeting.findMany({
      where,
      orderBy: {
        startTime: 'asc',
      },
      include: {
        integration: true,
      },
    });
  }

  async findUpcomingVideoInterviews(userId: string): Promise<VideoMeeting[]> {
    return this.prisma.videoMeeting.findMany({
      where: {
        userId,
        isInterviewRelated: true,
        startTime: {
          gte: new Date(),
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      include: {
        integration: true,
      },
    });
  }

  async deleteVideoMeetingsByIntegration(integrationId: string): Promise<void> {
    await this.prisma.videoMeeting.deleteMany({
      where: {
        integrationId,
      },
    });
  }

  // Sync and Status Management
  async updateLastSync(
    userId: string,
    integrationType: IntegrationType,
    syncData?: any,
  ): Promise<void> {
    await this.prisma.userIntegration.update({
      where: {
        userId_integrationType: {
          userId,
          integrationType,
        },
      },
      data: {
        lastSync: new Date(),
        syncData,
      },
    });
  }

  async findIntegrationsNeedingRefresh(): Promise<UserIntegration[]> {
    return this.prisma.userIntegration.findMany({
      where: {
        isActive: true,
        expiresAt: {
          lte: new Date(Date.now() + 5 * 60 * 1000), // Expires in next 5 minutes
        },
        refreshToken: {
          not: null,
        },
      },
    });
  }

  async getIntegrationStats(userId: string): Promise<any> {
    const [totalIntegrations, activeIntegrations, calendarEvents, videoMeetings] = await Promise.all([
      this.prisma.userIntegration.count({
        where: { userId },
      }),
      this.prisma.userIntegration.count({
        where: { userId, isActive: true },
      }),
      this.prisma.calendarEvent.count({
        where: { userId },
      }),
      this.prisma.videoMeeting.count({
        where: { userId },
      }),
    ]);

    return {
      totalIntegrations,
      activeIntegrations,
      calendarEvents,
      videoMeetings,
      lastSync: await this.prisma.userIntegration.findFirst({
        where: { userId, isActive: true },
        orderBy: { lastSync: 'desc' },
        select: { lastSync: true },
      }),
    };
  }
}