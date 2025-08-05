import express from 'express';
import { GameService } from '../services/GameService';
import { validateCompleteQuizData, validateGameCode } from '../middleware/validation';

const router = express.Router();

/**
 * @route POST /api/game/create
 * @description Crea una partita con quiz inizializzato
 */
router.post('/create', async (req, res) => {
  try {
    const { quizId } = req.body;
    
    if (!quizId || isNaN(parseInt(quizId))) {
      return res.status(400).json({ 
        success: false,
        error: 'ID del quiz obbligatorio e deve essere numerico' 
      });
    }

    const game = await GameService.initializeGame(parseInt(quizId));
    res.json({
      success: true,
      data: {
        matchCode: game.match.code,
        matchId: game.match.id,
        quiz: {
          id: game.quiz.id,
          title: game.quiz.title,
          description: game.quiz.description,
          totalQuestions: game.quiz.questions.length,
          timePerQuestion: game.quiz.time_per_question
        }
      }
    });
  } catch (error: any) {
    console.error('Errore nella creazione del gioco:', error);
    res.status(400).json({ 
      success: false,
      error: error.message || 'Errore interno del server' 
    });
  }
});

/**
 * @route GET /api/game/summary/:id
 * @description Ottiene il riepilogo completo di una partita
 */
router.get('/summary/:id', async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    
    if (isNaN(matchId)) {
      return res.status(400).json({ 
        success: false,
        error: 'ID partita non valido' 
      });
    }

    const summary = await GameService.getGameSummary(matchId);
    res.json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    console.error('Errore nel recupero del riepilogo:', error);
    res.status(404).json({ 
      success: false,
      error: error.message || 'Errore interno del server' 
    });
  }
});

/**
 * @route POST /api/game/quiz/complete
 * @description Crea un quiz completo con domande e risposte
 */
router.post('/quiz/complete', validateCompleteQuizData, async (req, res) => {
  try {
    const quiz = await GameService.createCompleteQuiz(req.body);
    res.status(201).json({
      success: true,
      data: quiz
    });
  } catch (error: any) {
    console.error('Errore nella creazione del quiz completo:', error);
    res.status(400).json({ 
      success: false,
      error: error.message || 'Errore interno del server' 
    });
  }
});

/**
 * @route GET /api/match/check/:code
 * @description Verifica se una partita esiste e ottiene i dettagli
 */
router.get('/check/:code', validateGameCode, async (req, res) => {
  try {
    const { code } = req.params;
    const match = await GameService.findGameByCode(code);
    
    if (!match) {
      return res.status(404).json({ 
        success: false,
        error: 'Partita non trovata' 
      });
    }

    const players = await GameService.getGamePlayers(match.id);

    res.json({
      success: true,
      data: {
        match: {
          id: match.id,
          code: match.code,
          status: match.status,
          currentQuestion: match.current_question
        },
        players: players.map(p => ({
          nickname: p.nickname,
          score: p.score,
          isReady: p.is_ready
        }))
      }
    });
  } catch (error) {
    console.error('Errore nel controllo della partita:', error);
    res.status(500).json({ 
      success: false,
      error: 'Errore interno del server' 
    });
  }
});

/**
 * @route GET /api/match/stats/:id
 * @description Ottiene le statistiche di una partita
 */
router.get('/stats/:id', async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    
    if (isNaN(matchId)) {
      return res.status(400).json({ 
        success: false,
        error: 'ID partita non valido' 
      });
    }

    const stats = await GameService.getGameStats(matchId);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Errore nel recupero delle statistiche:', error);
    res.status(500).json({ 
      success: false,
      error: 'Errore interno del server' 
    });
  }
});

export default router;