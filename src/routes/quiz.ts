import express from 'express';
import { QuizService } from '../services/QuizService';
import { validateQuizData } from '../middleware/validation';

const router = express.Router();

/**
 * @route GET /api/quiz
 * @description Ottiene tutti i quiz disponibili
 */
router.get('/', async (_req, res) => {
  try {
    const quizzes = await QuizService.getAllQuizzes();
    res.json({
      success: true,
      data: quizzes
    });
  } catch (error) {
    console.error('Errore nel recupero dei quiz:', error);
    res.status(500).json({ 
      success: false,
      error: 'Errore interno del server' 
    });
  }
});

/**
 * @route POST /api/quiz
 * @description Crea un nuovo quiz vuoto
 */
router.post('/', validateQuizData, async (req, res) => {
  try {
    const { title, description, timePerQuestion } = req.body;
    
    const quiz = await QuizService.createQuiz(title, description, timePerQuestion);
    res.status(201).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error('Errore nella creazione del quiz:', error);
    res.status(500).json({ 
      success: false,
      error: 'Errore interno del server' 
    });
  }
});

/**
 * @route GET /api/quiz/:id
 * @description Ottiene i dettagli di un quiz specifico
 */
router.get('/:id', async (req, res) => {
  try {
    const quizId = parseInt(req.params.id);
    
    if (isNaN(quizId)) {
      return res.status(400).json({ 
        success: false,
        error: 'ID quiz non valido' 
      });
    }

    const quiz = await QuizService.getQuizWithQuestions(quizId);
    
    if (!quiz) {
      return res.status(404).json({ 
        success: false,
        error: 'Quiz non trovato' 
      });
    }

    res.json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error('Errore nel recupero del quiz:', error);
    res.status(500).json({ 
      success: false,
      error: 'Errore interno del server' 
    });
  }
});

/**
 * @route POST /api/quiz/sample
 * @description Crea un quiz di esempio per testing
 */
router.post('/sample', async (_req, res) => {
  try {
    const quiz = await QuizService.createSampleQuiz();
    res.json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error('Errore nella creazione del quiz di esempio:', error);
    res.status(500).json({ 
      success: false,
      error: 'Errore interno del server' 
    });
  }
});

export default router;