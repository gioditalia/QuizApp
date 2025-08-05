import express from "express";
import gameRouter from "./game.js";
import quizRouter from "./quiz.js";


const apiRoutes = express.Router();

apiRoutes.use('/quiz', quizRouter);
apiRoutes.use('/game', gameRouter);

export default apiRoutes;