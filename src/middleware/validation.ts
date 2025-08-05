import { Request, Response, NextFunction } from 'express';

export const validateGameCode = (req: Request, res: Response, next: NextFunction) => {
  const { code } = req.params;
  
  if (!code || code.length !== 6) {
    return res.status(400).json({ 
      success: false,
      error: 'Codice partita deve essere di 6 caratteri' 
    });
  }
  
  next();
};

export const validateQuizData = (req: Request, res: Response, next: NextFunction) => {
  const { title } = req.body;
  
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Il titolo è obbligatorio' 
    });
  }
  
  next();
};

export const validateCompleteQuizData = (req: Request, res: Response, next: NextFunction) => {
  const { title, questions } = req.body;
  
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Il titolo è obbligatorio' 
    });
  }
  
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Almeno una domanda è obbligatoria' 
    });
  }
  
  next();
};