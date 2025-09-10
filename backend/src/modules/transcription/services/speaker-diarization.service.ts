import { Injectable, Logger } from '@nestjs/common';
import { ISpeakerDiarization, SpeakerInfo, TranscriptionResult, TranscriptionConfig } from '../interfaces/transcription.interface';

@Injectable()
export class SpeakerDiarizationService implements ISpeakerDiarization {
  private readonly logger = new Logger(SpeakerDiarizationService.name);
  private readonly speakerProfiles = new Map<string, SpeakerProfile>();

  async identifySpeakers(audioData: Buffer, config: TranscriptionConfig): Promise<SpeakerInfo[]> {
    try {
      if (!config.enableSpeakerDiarization) {
        return [];
      }

      // Basic speaker diarization implementation
      // In a production environment, you would use specialized libraries
      // like pyannote.audio, speechbrain, or cloud services
      
      const speakers = await this.performBasicDiarization(audioData);
      return speakers;
    } catch (error) {
      this.logger.error('Error identifying speakers', error);
      return [];
    }
  }

  assignSpeakerToTranscription(transcription: TranscriptionResult, speakers: SpeakerInfo[]): TranscriptionResult {
    try {
      if (!speakers || speakers.length === 0) {
        return transcription;
      }

      // Find the speaker that overlaps most with the transcription time
      const transcriptionStart = transcription.startTime || 0;
      const transcriptionEnd = transcription.endTime || transcriptionStart + 1;

      let bestMatch: SpeakerInfo | null = null;
      let maxOverlap = 0;

      for (const speaker of speakers) {
        const overlapStart = Math.max(transcriptionStart, speaker.startTime);
        const overlapEnd = Math.min(transcriptionEnd, speaker.endTime);
        const overlap = Math.max(0, overlapEnd - overlapStart);

        if (overlap > maxOverlap) {
          maxOverlap = overlap;
          bestMatch = speaker;
        }
      }

      if (bestMatch && maxOverlap > 0) {
        return {
          ...transcription,
          speakerId: bestMatch.speakerId,
          metadata: {
            ...transcription.metadata,
            speakerConfidence: bestMatch.confidence,
            speakerName: bestMatch.name,
          },
        };
      }

      return transcription;
    } catch (error) {
      this.logger.error('Error assigning speaker to transcription', error);
      return transcription;
    }
  }

  async updateSpeakerProfile(speakerId: string, audioData: Buffer, metadata?: any): Promise<void> {
    try {
      const features = await this.extractSpeakerFeatures(audioData);
      
      const existingProfile = this.speakerProfiles.get(speakerId);
      if (existingProfile) {
        // Update existing profile with new features
        existingProfile.features = this.mergeSpeakerFeatures(existingProfile.features, features);
        existingProfile.sampleCount++;
        existingProfile.lastUpdated = new Date();
      } else {
        // Create new speaker profile
        this.speakerProfiles.set(speakerId, {
          speakerId,
          features,
          sampleCount: 1,
          metadata: metadata || {},
          createdAt: new Date(),
          lastUpdated: new Date(),
        });
      }
    } catch (error) {
      this.logger.error('Error updating speaker profile', error);
    }
  }

  async getSpeakerProfile(speakerId: string): Promise<SpeakerProfile | null> {
    return this.speakerProfiles.get(speakerId) || null;
  }

  async identifySpeakerFromProfile(audioData: Buffer): Promise<string | null> {
    try {
      const features = await this.extractSpeakerFeatures(audioData);
      
      let bestMatch: string | null = null;
      let highestSimilarity = 0;
      const threshold = 0.7; // Minimum similarity threshold

      for (const [speakerId, profile] of this.speakerProfiles) {
        const similarity = this.calculateSpeakerSimilarity(features, profile.features);
        
        if (similarity > highestSimilarity && similarity > threshold) {
          highestSimilarity = similarity;
          bestMatch = speakerId;
        }
      }

      return bestMatch;
    } catch (error) {
      this.logger.error('Error identifying speaker from profile', error);
      return null;
    }
  }

  private async performBasicDiarization(audioData: Buffer): Promise<SpeakerInfo[]> {
    // This is a simplified implementation
    // In production, you would use proper speaker diarization algorithms
    
    const duration = this.estimateAudioDuration(audioData);
    const speakers: SpeakerInfo[] = [];

    // Simple heuristic: assume alternating speakers in segments
    const segmentDuration = 5; // 5 seconds per segment
    const numSegments = Math.ceil(duration / segmentDuration);

    for (let i = 0; i < numSegments; i++) {
      const startTime = i * segmentDuration;
      const endTime = Math.min((i + 1) * segmentDuration, duration);
      const speakerId = `speaker_${(i % 2) + 1}`; // Alternate between speaker_1 and speaker_2

      speakers.push({
        speakerId,
        confidence: 0.8, // Default confidence
        startTime,
        endTime,
      });
    }

    return speakers;
  }

  private async extractSpeakerFeatures(audioData: Buffer): Promise<SpeakerFeatures> {
    // Simplified feature extraction
    // In production, you would extract MFCC, spectral features, etc.
    
    return {
      pitch: this.estimatePitch(audioData),
      energy: this.calculateEnergy(audioData),
      spectralCentroid: this.calculateSpectralCentroid(audioData),
      zeroCrossingRate: this.calculateZeroCrossingRate(audioData),
    };
  }

  private mergeSpeakerFeatures(existing: SpeakerFeatures, newFeatures: SpeakerFeatures): SpeakerFeatures {
    // Simple averaging of features
    return {
      pitch: (existing.pitch + newFeatures.pitch) / 2,
      energy: (existing.energy + newFeatures.energy) / 2,
      spectralCentroid: (existing.spectralCentroid + newFeatures.spectralCentroid) / 2,
      zeroCrossingRate: (existing.zeroCrossingRate + newFeatures.zeroCrossingRate) / 2,
    };
  }

  private calculateSpeakerSimilarity(features1: SpeakerFeatures, features2: SpeakerFeatures): number {
    // Simple Euclidean distance-based similarity
    const pitchDiff = Math.abs(features1.pitch - features2.pitch) / Math.max(features1.pitch, features2.pitch);
    const energyDiff = Math.abs(features1.energy - features2.energy) / Math.max(features1.energy, features2.energy);
    const spectralDiff = Math.abs(features1.spectralCentroid - features2.spectralCentroid) / 
                        Math.max(features1.spectralCentroid, features2.spectralCentroid);
    const zcrDiff = Math.abs(features1.zeroCrossingRate - features2.zeroCrossingRate) / 
                   Math.max(features1.zeroCrossingRate, features2.zeroCrossingRate);

    const avgDiff = (pitchDiff + energyDiff + spectralDiff + zcrDiff) / 4;
    return Math.max(0, 1 - avgDiff);
  }

  private estimateAudioDuration(audioData: Buffer): number {
    // Rough estimation - in production, parse audio headers
    return audioData.length / 32000; // Assume 16kHz, 16-bit, mono
  }

  private estimatePitch(audioData: Buffer): number {
    // Simplified pitch estimation
    // In production, use autocorrelation or other pitch detection algorithms
    return 150 + Math.random() * 100; // Random pitch between 150-250 Hz
  }

  private calculateEnergy(audioData: Buffer): number {
    // Calculate RMS energy
    let sum = 0;
    for (let i = 0; i < audioData.length; i += 2) {
      const sample = audioData.readInt16LE(i);
      sum += sample * sample;
    }
    return Math.sqrt(sum / (audioData.length / 2));
  }

  private calculateSpectralCentroid(audioData: Buffer): number {
    // Simplified spectral centroid calculation
    // In production, use FFT and proper spectral analysis
    return 2000 + Math.random() * 1000; // Random value between 2-3 kHz
  }

  private calculateZeroCrossingRate(audioData: Buffer): number {
    // Calculate zero crossing rate
    let crossings = 0;
    let prevSample = 0;

    for (let i = 0; i < audioData.length; i += 2) {
      const sample = audioData.readInt16LE(i);
      if ((prevSample >= 0 && sample < 0) || (prevSample < 0 && sample >= 0)) {
        crossings++;
      }
      prevSample = sample;
    }

    return crossings / (audioData.length / 2);
  }
}

interface SpeakerProfile {
  speakerId: string;
  features: SpeakerFeatures;
  sampleCount: number;
  metadata: any;
  createdAt: Date;
  lastUpdated: Date;
}

interface SpeakerFeatures {
  pitch: number;
  energy: number;
  spectralCentroid: number;
  zeroCrossingRate: number;
}