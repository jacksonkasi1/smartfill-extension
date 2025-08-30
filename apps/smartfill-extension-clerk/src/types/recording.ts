export interface RecordingSession {
  id: string;
  name: string;
  domain: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  steps: RecordingStep[];
}

export interface RecordingStep {
  id: string;
  type: 'input' | 'click' | 'select' | 'wait';
  selector: string;
  value?: string;
  timestamp: number;
}

export interface RecordingState {
  isRecording: boolean;
  isPlaying: boolean;
  currentSession?: RecordingSession;
  sessions: RecordingSession[];
}