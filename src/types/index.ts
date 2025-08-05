export interface Quiz {
  id: number;
  title: string;
  description?: string;
  time_per_question: number;
  created_at: Date;
}

export interface Question {
  id: number;
  quiz_id: number;
  question_text: string;
  question_type: 'true_false' | 'multiple_choice';
  order: number;
  points: number;
  created_at: Date;
  answers?: Answer[];
}

export interface Answer {
  id: number;
  question_id: number;
  answer_text: string;
  is_correct: boolean;
  order: number;
}

export interface Match {
  id: number;
  code: string;
  quiz_id?: number;
  status: 'waiting' | 'in_progress' | 'completed';
  current_question: number;
  created_at: Date;
  started_at?: Date;
  ended_at?: Date;
}

export interface Player {
  id: number;
  nickname: string;
  score: number;
  match_id: number;
  socket_id?: string;
  is_ready: boolean;
  joined_at: Date;
}

export interface PlayerAnswer {
  id: number;
  player_id: number;
  question_id: number;
  answer_id: number;
  time_taken: number;
  points_earned: number;
  answered_at: Date;
}

// Socket event types
export interface SocketEvents {
  // Client to Server
  joinMatch: (data: { code: string; nickname: string }) => void;
  setPlayerReady: (data: { matchCode: string }) => void;
  startMatch: (data: { matchCode: string }) => void;
  submitAnswer: (data: { 
    matchCode: string; 
    questionId: number; 
    answerId: number; 
    timeTaken: number 
  }) => void;
  disconnect: () => void;

  // Server to Client
  playerJoined: (nickname: string) => void;
  playerLeft: (nickname: string) => void;
  playerReady: (data: { nickname: string; ready: boolean }) => void;
  matchStarted: () => void;
  newQuestion: (question: QuestionForClient) => void;
  questionResults: (results: QuestionResult[]) => void;
  matchEnded: (finalResults: PlayerScore[]) => void;
  error: (message: string) => void;
}

export interface QuestionForClient {
  id: number;
  question_text: string;
  question_type: 'true_false' | 'multiple_choice';
  answers: ClientAnswer[];
  timeLimit: number; // in millisecondi
  questionNumber: number;
  totalQuestions: number;
}

export interface ClientAnswer {
  id: number;
  answer_text: string;
  order: number;
}

export interface QuestionResult {
  playerId: number;
  nickname: string;
  answerId: number;
  isCorrect: boolean;
  pointsEarned: number;
  timeTaken: number;
}

export interface PlayerScore {
  playerId: number;
  nickname: string;
  totalScore: number;
  position: number;
}
