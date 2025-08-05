import db from '../db/db';
import { Match, Player, PlayerAnswer, QuestionForClient } from '../types/index';
import { calculatePoints } from '../utils/generateCode';

export class MatchService {
  /**
   * Crea una nuova partita
   */
  static async createMatch(code: string, quizId?: number): Promise<Match> {
    const [match] = await db('matches')
      .insert({ 
        code, 
        quiz_id: quizId,
        status: 'waiting' 
      })
      .returning('*');
    return match;
  }

  /**
   * Trova una partita tramite codice
   */
  static async findMatchByCode(code: string): Promise<Match | null> {
    const match = await db('matches').where({ code }).first();
    return match || null;
  }

  /**
   * Trova una partita tramite ID
   */
  static async findMatchById(matchId: number): Promise<Match | null> {
    const match = await db('matches').where({ id: matchId }).first();
    return match || null;
  }

  /**
   * Aggiunge un giocatore alla partita
   */
  static async addPlayerToMatch(matchId: number, nickname: string, socketId: string): Promise<Player> {
    // Verifica se il nickname è già utilizzato in questa partita
    const existingPlayer = await db('players')
      .where({ match_id: matchId, nickname })
      .first();

    if (existingPlayer) {
      throw new Error('Nickname già utilizzato in questa partita');
    }

    const [player] = await db('players')
      .insert({
        nickname,
        match_id: matchId,
        socket_id: socketId,
        score: 0,
        is_ready: false
      })
      .returning('*');
    
    return player;
  }

  /**
   * Ottiene tutti i giocatori di una partita
   */
  static async getMatchPlayers(matchId: number): Promise<Player[]> {
    return await db('players').where({ match_id: matchId });
  }

  /**
   * Ottiene un giocatore tramite socket ID
   */
  static async getPlayerBySocketId(socketId: string): Promise<Player | null> {
    const player = await db('players').where({ socket_id: socketId }).first();
    return player || null;
  }

  /**
   * Imposta un giocatore come pronto
   */
  static async setPlayerReady(matchId: number, socketId: string, ready: boolean): Promise<Player | null> {
    const [player] = await db('players')
      .where({ match_id: matchId, socket_id: socketId })
      .update({ is_ready: ready })
      .returning('*');
    
    return player || null;
  }

  /**
   * Verifica se tutti i giocatori sono pronti
   */
  static async areAllPlayersReady(matchId: number): Promise<boolean> {
    const players = await db('players').where({ match_id: matchId });
    return players.length > 0 && players.every(player => player.is_ready);
  }

  /**
   * Avvia una partita
   */
  static async startMatch(matchId: number): Promise<Match> {
    const [match] = await db('matches')
      .where({ id: matchId })
      .update({ 
        status: 'in_progress', 
        started_at: new Date(),
        current_question: 1 
      })
      .returning('*');
    
    return match;
  }

  /**
   * Ottiene la domanda corrente di una partita
   */
  static async getCurrentQuestion(matchId: number): Promise<QuestionForClient | null> {
    const match = await db('matches').where({ id: matchId }).first();
    if (!match || !match.quiz_id) return null;

    const question = await db('questions')
      .where({ quiz_id: match.quiz_id, order: match.current_question })
      .first();

    if (!question) return null;

    const answers = await db('answers')
      .where({ question_id: question.id })
      .orderBy('order');

    const quiz = await db('quizzes').where({ id: match.quiz_id }).first();
    const totalQuestions = await db('questions')
      .where({ quiz_id: match.quiz_id })
      .count('* as count')
      .first();

    return {
      id: question.id,
      question_text: question.question_text,
      question_type: question.question_type,
      answers: answers.map(answer => ({
        id: answer.id,
        answer_text: answer.answer_text,
        order: answer.order
      })),
      timeLimit: quiz?.time_per_question * 1000 || 30000, // converti in millisecondi
      questionNumber: match.current_question,
      totalQuestions: Number(totalQuestions?.count) || 0
    };
  }

  /**
   * Verifica se un giocatore ha già risposto a una domanda
   */
  static async hasPlayerAnswered(playerId: number, questionId: number): Promise<boolean> {
    const answer = await db('player_answers')
      .where({ player_id: playerId, question_id: questionId })
      .first();
    
    return !!answer;
  }

  /**
   * Salva la risposta di un giocatore
   */
  static async submitPlayerAnswer(
    playerId: number, 
    questionId: number, 
    answerId: number, 
    timeTaken: number
  ): Promise<PlayerAnswer> {
    // Verifica se il giocatore ha già risposto
    const hasAnswered = await this.hasPlayerAnswered(playerId, questionId);
    if (hasAnswered) {
      throw new Error('Hai già risposto a questa domanda');
    }

    // Verifica se la risposta è corretta
    const answer = await db('answers').where({ id: answerId }).first();
    const question = await db('questions').where({ id: questionId }).first();
    
    if (!answer || !question) {
      throw new Error('Risposta o domanda non trovata');
    }

    const isCorrect = answer.is_correct;
    const pointsEarned = isCorrect ? calculatePoints(question.points, 30000, timeTaken) : 0;

    // Salva la risposta
    const [playerAnswer] = await db('player_answers')
      .insert({
        player_id: playerId,
        question_id: questionId,
        answer_id: answerId,
        time_taken: timeTaken,
        points_earned: pointsEarned
      })
      .returning('*');

    // Aggiorna il punteggio del giocatore
    await db('players')
      .where({ id: playerId })
      .increment('score', pointsEarned);

    return playerAnswer;
  }

  /**
   * Verifica se tutti i giocatori hanno risposto alla domanda corrente
   */
  static async haveAllPlayersAnswered(matchId: number, questionId: number): Promise<boolean> {
    const players = await db('players').where({ match_id: matchId });
    const playerIds = players.map(p => p.id);
    
    if (playerIds.length === 0) return false;

    const answers = await db('player_answers')
      .where({ question_id: questionId })
      .whereIn('player_id', playerIds);
    
    return answers.length === playerIds.length;
  }

  /**
   * Ottiene i risultati di una domanda
   */
  static async getQuestionResults(matchId: number, questionId: number) {
    const players = await db('players').where({ match_id: matchId });
    const results = [];

    for (const player of players) {
      const playerAnswer = await db('player_answers')
        .where({ player_id: player.id, question_id: questionId })
        .first();

      if (playerAnswer) {
        const answer = await db('answers').where({ id: playerAnswer.answer_id }).first();
        
        results.push({
          playerId: player.id,
          nickname: player.nickname,
          answerId: playerAnswer.answer_id,
          answerText: answer?.answer_text || '',
          isCorrect: answer?.is_correct || false,
          pointsEarned: playerAnswer.points_earned,
          timeTaken: playerAnswer.time_taken
        });
      } else {
        // Giocatore non ha risposto
        results.push({
          playerId: player.id,
          nickname: player.nickname,
          answerId: null,
          answerText: 'Non ha risposto',
          isCorrect: false,
          pointsEarned: 0,
          timeTaken: 0
        });
      }
    }

    return results;
  }

  /**
   * Passa alla domanda successiva
   */
  static async nextQuestion(matchId: number): Promise<Match> {
    const [match] = await db('matches')
      .where({ id: matchId })
      .increment('current_question', 1)
      .returning('*');
    
    return match;
  }

  /**
   * Verifica se ci sono altre domande
   */
  static async hasMoreQuestions(matchId: number): Promise<boolean> {
    const match = await db('matches').where({ id: matchId }).first();
    if (!match || !match.quiz_id) return false;

    const totalQuestions = await db('questions')
      .where({ quiz_id: match.quiz_id })
      .count('* as count')
      .first();

    return match.current_question < Number(totalQuestions?.count || 0);
  }

  /**
   * Termina una partita
   */
  static async endMatch(matchId: number): Promise<Match> {
    const [match] = await db('matches')
      .where({ id: matchId })
      .update({ 
        status: 'completed', 
        ended_at: new Date() 
      })
      .returning('*');
    
    return match;
  }

  /**
   * Ottiene i risultati finali di una partita
   */
  static async getFinalResults(matchId: number) {
    const players = await db('players')
      .where({ match_id: matchId })
      .orderBy('score', 'desc');

    return players.map((player, index) => ({
      playerId: player.id,
      nickname: player.nickname,
      totalScore: player.score,
      position: index + 1
    }));
  }

  /**
   * Rimuove un giocatore dalla partita
   */
  static async removePlayer(matchId: number, socketId: string): Promise<Player | null> {
    const player = await db('players')
      .where({ match_id: matchId, socket_id: socketId })
      .first();

    if (player) {
      await db('players')
        .where({ match_id: matchId, socket_id: socketId })
        .del();
    }

    return player;
  }

  /**
   * Ottiene statistiche di una partita
   */
  static async getMatchStats(matchId: number) {
    const match = await db('matches').where({ id: matchId }).first();
    const players = await db('players').where({ match_id: matchId });
    const totalAnswers = await db('player_answers')
      .join('players', 'player_answers.player_id', 'players.id')
      .where('players.match_id', matchId)
      .count('* as count')
      .first();

    return {
      match,
      totalPlayers: players.length,
      totalAnswers: Number(totalAnswers?.count || 0),
      averageScore: players.length > 0 
        ? players.reduce((sum, p) => sum + p.score, 0) / players.length 
        : 0
    };
  }

  /**
   * Pulisce le partite vecchie (più di 24 ore)
   */
  static async cleanupOldMatches(): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const deletedCount = await db('matches')
      .where('created_at', '<', oneDayAgo)
      .del();

    return deletedCount;
  }
}
