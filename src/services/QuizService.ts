import db from '../db/db';
import { Quiz, Question } from '../types/index';

export class QuizService {
  /**
   * Ottiene un quiz con le sue domande
   */
  static async getQuizWithQuestions(quizId: number): Promise<Quiz & { questions: Question[] } | null> {
    const quiz = await db('quizzes').where({ id: quizId }).first();
    if (!quiz) return null;

    const questions = await db('questions')
      .where({ quiz_id: quizId })
      .orderBy('order');

    for (const question of questions) {
      question.answers = await db('answers')
        .where({ question_id: question.id })
        .orderBy('order');
    }

    return { ...quiz, questions };
  }

  /**
   * Ottiene tutti i quiz disponibili
   */
  static async getAllQuizzes(): Promise<Quiz[]> {
    return await db('quizzes').orderBy('created_at', 'desc');
  }

  /**
   * Ottiene un quiz per ID
   */
  static async getQuizById(quizId: number): Promise<Quiz | null> {
    const quiz = await db('quizzes').where({ id: quizId }).first();
    return quiz || null;
  }

  /**
   * Crea un nuovo quiz
   */
  static async createQuiz(title: string, description?: string, timePerQuestion: number = 30): Promise<Quiz> {
    const [quiz] = await db('quizzes')
      .insert({
        title,
        description,
        time_per_question: timePerQuestion
      })
      .returning('*');

    return quiz;
  }

  /**
   * Aggiunge una domanda a un quiz
   */
  static async addQuestionToQuiz(
    quizId: number,
    questionText: string,
    questionType: 'true_false' | 'multiple_choice',
    order: number,
    points: number = 10
  ): Promise<Question> {
    const [question] = await db('questions')
      .insert({
        quiz_id: quizId,
        question_text: questionText,
        question_type: questionType,
        order,
        points
      })
      .returning('*');

    return question;
  }

  /**
   * Aggiunge risposte a una domanda
   */
  static async addAnswersToQuestion(
    questionId: number,
    answers: Array<{ text: string; isCorrect: boolean; order: number }>
  ): Promise<void> {
    const answersToInsert = answers.map(answer => ({
      question_id: questionId,
      answer_text: answer.text,
      is_correct: answer.isCorrect,
      order: answer.order
    }));

    await db('answers').insert(answersToInsert);
  }

  /**
   * Crea un quiz di esempio
   */
  static async createSampleQuiz(): Promise<Quiz> {
    const [quiz] = await db('quizzes')
      .insert({
        title: 'Quiz di Cultura Generale',
        description: 'Un quiz con domande di cultura generale',
        time_per_question: 30
      })
      .returning('*');

    // Domanda vero/falso
    const [question1] = await db('questions')
      .insert({
        quiz_id: quiz.id,
        question_text: 'Roma è la capitale d\'Italia?',
        question_type: 'true_false',
        order: 1,
        points: 10
      })
      .returning('*');

    await db('answers').insert([
      { question_id: question1.id, answer_text: 'Vero', is_correct: true, order: 1 },
      { question_id: question1.id, answer_text: 'Falso', is_correct: false, order: 2 }
    ]);

    // Domanda multiple choice
    const [question2] = await db('questions')
      .insert({
        quiz_id: quiz.id,
        question_text: 'Qual è il pianeta più vicino al Sole?',
        question_type: 'multiple_choice',
        order: 2,
        points: 10
      })
      .returning('*');

    await db('answers').insert([
      { question_id: question2.id, answer_text: 'Venere', is_correct: false, order: 1 },
      { question_id: question2.id, answer_text: 'Mercurio', is_correct: true, order: 2 },
      { question_id: question2.id, answer_text: 'Marte', is_correct: false, order: 3 },
      { question_id: question2.id, answer_text: 'Terra', is_correct: false, order: 4 }
    ]);

    // Domanda vero/falso aggiuntiva
    const [question3] = await db('questions')
      .insert({
        quiz_id: quiz.id,
        question_text: 'Il Sole è una stella?',
        question_type: 'true_false',
        order: 3,
        points: 10
      })
      .returning('*');

    await db('answers').insert([
      { question_id: question3.id, answer_text: 'Vero', is_correct: true, order: 1 },
      { question_id: question3.id, answer_text: 'Falso', is_correct: false, order: 2 }
    ]);

    // Domanda multiple choice aggiuntiva
    const [question4] = await db('questions')
      .insert({
        quiz_id: quiz.id,
        question_text: 'Quale di questi è il fiume più lungo del mondo?',
        question_type: 'multiple_choice',
        order: 4,
        points: 10
      })
      .returning('*');

    await db('answers').insert([
      { question_id: question4.id, answer_text: 'Nilo', is_correct: true, order: 1 },
      { question_id: question4.id, answer_text: 'Amazzonia', is_correct: false, order: 2 },
      { question_id: question4.id, answer_text: 'Mississippi', is_correct: false, order: 3 },
      { question_id: question4.id, answer_text: 'Yangtze', is_correct: false, order: 4 }
    ]);

    return quiz;
  }

  /**
   * Elimina un quiz e tutte le sue domande/risposte
   */
  static async deleteQuiz(quizId: number): Promise<void> {
    // Le foreign key con CASCADE si occuperanno della cancellazione delle entità correlate
    await db('quizzes').where({ id: quizId }).del();
  }

  /**
   * Conta il numero di domande in un quiz
   */
  static async getQuestionCount(quizId: number): Promise<number> {
    const result = await db('questions')
      .where({ quiz_id: quizId })
      .count('* as count')
      .first();
    
    return Number(result?.count) || 0;
  }
}
