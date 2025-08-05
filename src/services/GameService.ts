import { MatchService } from './MatchService';
import { QuizService } from './QuizService';
import { generateCode } from '../utils/generateCode';

export class GameService {
  /**
   * Inizializza una partita completa con quiz
   */
  static async initializeGame(quizId: number): Promise<{ match: any; quiz: any }> {
    // Verifica che il quiz esista e abbia domande
    const quiz = await QuizService.getQuizWithQuestions(quizId);
    if (!quiz) {
      throw new Error('Quiz non trovato');
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      throw new Error('Il quiz non ha domande');
    }

    // Genera un codice unico per la partita
    let code: string;
    let existingMatch;

    do {
      code = generateCode();
      existingMatch = await MatchService.findMatchByCode(code);
    } while (existingMatch);

    // Crea la partita
    const match = await MatchService.createMatch(code, quizId);

    return { match, quiz };
  }

  /**
   * Avvia una partita
   */
  static async startGame(matchId: number): Promise<any> {
        const match = await MatchService.startMatch(matchId);
    if (!match) {
      throw new Error('Partita non trovata o non avviabile');
    }
    return match;
  }

  /**
   * Verifica se una partita può iniziare
   */
  static async canStartGame(matchId: number): Promise<{ canStart: boolean; reason?: string }> {
    const players = await MatchService.getMatchPlayers(matchId);
    
    if (players.length === 0) {
      return { canStart: false, reason: 'Nessun giocatore nella partita' };
    }

    if (players.length === 1) {
      return { canStart: false, reason: 'Servono almeno 2 giocatori per iniziare' };
    }

    const allReady = players.every(player => player.is_ready);
    if (!allReady) {
      return { canStart: false, reason: 'Non tutti i giocatori sono pronti' };
    }

    return { canStart: true };
  }

  /**
   * Trova una partita tramite codice
   */
  static async findGameByCode(code: string): Promise<any> {
    const match = await MatchService.findMatchByCode(code);
    if (!match) {
      throw new Error('Partita non trovata');
    }
    return match;
  }

  /**
   * Aggiunge un giocatore a una partita
   */
  static async addPlayerToGame(matchId: number, nickname: string, socketId: string): Promise<any> {
    const player = await MatchService.addPlayerToMatch(matchId, nickname, socketId);
    if (!player) {
      throw new Error('Impossibile aggiungere il giocatore alla partita');
    }
    return player;
  }

  /**
   * Ottiene i giocatori di una partita
   */
  static async getGamePlayers(matchId: number): Promise<any[]> {
    const players = await MatchService.getMatchPlayers(matchId);
    if (!players || players.length === 0) {
      throw new Error('Nessun giocatore trovato per questa partita');
    }
    return players;
  }

  /**
   * Imposta un giocatore come pronto
   */
  static async setPlayerReady(matchId: number, socketId: string, isReady: boolean): Promise<any> {
   const player = MatchService.setPlayerReady(matchId, socketId, isReady);
    if (!player) {
      throw new Error('Impossibile impostare il giocatore come pronto');
    }
    return player;
  }

  /**
   * Verifica se tutti i giocatori sono pronti
   */
  static async areAllPlayersReady(matchId: number): Promise<boolean> {
    const players = await MatchService.getMatchPlayers(matchId);
    if (!players || players.length === 0) {
      throw new Error('Nessun giocatore trovato per questa partita');
    }
    return players.every(player => player.is_ready);
  }

  /**
   * Salva la risposta di un giocatore
   */
  static async submitPlayerAnswer(
    playerId: number, 
    questionId: number, 
    answerId: number, 
    timeTaken: number): Promise<any> {
    const result = await MatchService.submitPlayerAnswer(playerId, questionId, answerId,timeTaken);
    if (!result) {
      throw new Error('Impossibile inviare la risposta del giocatore');
    }
    return result;
  };

  /**
   * Controlla se tutti i giocatori hanno risposto a una domanda
   */
  static async haveAllPlayersAnswered(matchId: number, questionId: number): Promise<boolean> {
    return await MatchService.haveAllPlayersAnswered(matchId, questionId);
  }

  /**
   * Rimuove un giocatore da una partita
   */
  static async removePlayer(matchId: number, socketId: string): Promise<any> {
    const player = await MatchService.removePlayer(matchId, socketId);
    if (!player) {
      throw new Error('Impossibile rimuovere il giocatore dalla partita');
    }
    return player;
  }

  /**
   * Ottiene la domanda corrente di una partita
   */
  static async getCurrentQuestion(matchId: number): Promise<any> {
    const question = await MatchService.getCurrentQuestion(matchId);
    if (!question) {
      throw new Error('Domanda corrente non trovata');
    }
    return question;
  }

  /**
   * Ottiene i risultati di una domanda
   */
  static async getQuestionResults(matchId: number, questionId: number): Promise<any> {
    const results = await MatchService.getQuestionResults(matchId, questionId);
    if (!results) {
      throw new Error('Risultati della domanda non trovati');
    }
    return results;
  }
  /**
   * Ottiene i risultati finali di una partita
   */
  static async getFinalResults(matchId: number): Promise<any> {
    const results = await MatchService.getFinalResults(matchId);
    if (!results) {
      throw new Error('Risultati finali della partita non trovati');
    }
    return results;
  }
  /**
   * Termina una partita
   */
  static async endMatch(matchId: number): Promise<any> {
    const result = await MatchService.endMatch(matchId);
    if (!result) {
      throw new Error('Impossibile terminare la partita');
    }
    return result;
  }

  /**
   * Ottiene le statistiche di una partita
   */
  static async getGameStats(matchId: number): Promise<any> {
    const stats = await MatchService.getMatchStats(matchId);
    if (!stats) {
      throw new Error('Statistiche della partita non trovate');
    }
    return stats;
  }
  
  /**
   * Ottiene il riepilogo di una partita in corso
   */
  static async getGameSummary(matchId: number) {
    const match = await MatchService.findMatchById(matchId);
    if (!match) {
      throw new Error('Partita non trovata');
    }

    const players = await MatchService.getMatchPlayers(matchId);
    const currentQuestion = await MatchService.getCurrentQuestion(matchId);
    
    let quiz = null;
    if (match.quiz_id) {
      quiz = await QuizService.getQuizById(match.quiz_id);
    }

    return {
      match: {
        id: match.id,
        code: match.code,
        status: match.status,
        currentQuestion: match.current_question,
        startedAt: match.started_at,
        endedAt: match.ended_at
      },
      quiz: quiz ? {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        timePerQuestion: quiz.time_per_question
      } : null,
      players: players.map(p => ({
        id: p.id,
        nickname: p.nickname,
        score: p.score,
        isReady: p.is_ready,
        joinedAt: p.joined_at
      })),
      currentQuestion,
      totalPlayers: players.length,
      readyPlayers: players.filter(p => p.is_ready).length
    };
  }

  /**
   * Gestisce la logica di fine domanda
   */
  static async handleQuestionEnd(matchId: number, questionId: number) {
    // Ottieni i risultati della domanda
    const results = await MatchService.getQuestionResults(matchId, questionId);
    
    // Verifica se ci sono altre domande
    const hasMore = await MatchService.hasMoreQuestions(matchId);
    
    if (hasMore) {
      // Passa alla domanda successiva
      await MatchService.nextQuestion(matchId);
      const nextQuestion = await MatchService.getCurrentQuestion(matchId);
      return { type: 'nextQuestion', results, nextQuestion };
    } else {
      // Termina la partita
      await MatchService.endMatch(matchId);
      const finalResults = await MatchService.getFinalResults(matchId);
      return { type: 'matchEnd', results, finalResults };
    }
  }

  /**
   * Valida i dati di creazione di un quiz
   */
  static validateQuizData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Il titolo è obbligatorio');
    }

    if (data.timePerQuestion && (typeof data.timePerQuestion !== 'number' || data.timePerQuestion < 5 || data.timePerQuestion > 300)) {
      errors.push('Il tempo per domanda deve essere tra 5 e 300 secondi');
    }

    if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
      errors.push('Il quiz deve avere almeno una domanda');
    }

    if (data.questions) {
      data.questions.forEach((question: any, index: number) => {
        if (!question.question_text || typeof question.question_text !== 'string') {
          errors.push(`La domanda ${index + 1} deve avere un testo`);
        }

        if (!['true_false', 'multiple_choice'].includes(question.question_type)) {
          errors.push(`La domanda ${index + 1} deve essere di tipo 'true_false' o 'multiple_choice'`);
        }

        if (!question.answers || !Array.isArray(question.answers)) {
          errors.push(`La domanda ${index + 1} deve avere delle risposte`);
        } else {
          if (question.question_type === 'true_false' && question.answers.length !== 2) {
            errors.push(`La domanda vero/falso ${index + 1} deve avere esattamente 2 risposte`);
          }

          if (question.question_type === 'multiple_choice' && question.answers.length !== 4) {
            errors.push(`La domanda multipla ${index + 1} deve avere esattamente 4 risposte`);
          }

          const correctAnswers = question.answers.filter((a: any) => a.is_correct);
          if (correctAnswers.length !== 1) {
            errors.push(`La domanda ${index + 1} deve avere esattamente una risposta corretta`);
          }
        }
      });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Crea un quiz completo con domande e risposte
   */
  static async createCompleteQuiz(data: any) {
    // Valida i dati
    const validation = this.validateQuizData(data);
    if (!validation.valid) {
      throw new Error(`Dati del quiz non validi: ${validation.errors.join(', ')}`);
    }

    // Crea il quiz
    const quiz = await QuizService.createQuiz(
      data.title,
      data.description,
      data.timePerQuestion || 30
    );

    // Aggiungi le domande
    for (let i = 0; i < data.questions.length; i++) {
      const questionData = data.questions[i];
      
      const question = await QuizService.addQuestionToQuiz(
        quiz.id,
        questionData.question_text,
        questionData.question_type,
        i + 1,
        questionData.points || 10
      );

      // Aggiungi le risposte
      const answers = questionData.answers.map((answer: any, answerIndex: number) => ({
        text: answer.answer_text,
        isCorrect: answer.is_correct,
        order: answerIndex + 1
      }));

      await QuizService.addAnswersToQuestion(question.id, answers);
    }

    return quiz;
  }
}
