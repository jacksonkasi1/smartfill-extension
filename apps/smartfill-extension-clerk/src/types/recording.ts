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
  type: 'input' | 'click' | 'select' | 'keydown' | 'focus' | 'mousedown' | 'scroll' | 'modal' | 'submit' | 'wait';
  selector: string;
  value?: string;
  timestamp: number;
  data?: any; // Additional data for complex interactions (mouse position, key codes, etc.)
}

export interface RecordingState {
  isRecording: boolean;
  isPlaying: boolean;
  currentSession?: RecordingSession;
  sessions: RecordingSession[];
}