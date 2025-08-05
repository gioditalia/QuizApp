import { Server, Socket } from "socket.io";
import { GameService } from './services/GameService';

interface SocketData {
  matchId?: number;
  playerId?: number;
  nickname?: string;
}

export default function setupSocket(io: Server) {
  io.on('connection', (socket: Socket<any, any, any, SocketData>) => {
    console.log(`Client connesso: ${socket.id}`);

    // Giocatore si unisce a una partita
    socket.on('joinMatch', async (data: { code: string; nickname: string }) => {
      try {
        const match = await GameService.findGameByCode(data.code);
        
        if (!match) {
          socket.emit('error', 'Partita non trovata');
          return;
        }

        if (match.status !== 'waiting') {
          socket.emit('error', 'La partita è già iniziata o terminata');
          return;
        }

        // Aggiungi il giocatore alla partita
        const player = await GameService.addPlayerToGame(
          match.id, 
          data.nickname, 
          socket.id
        );

        // Salva i dati del socket
        socket.data.matchId = match.id;
        socket.data.playerId = player.id;
        socket.data.nickname = data.nickname;

        // Unisciti alla room della partita
        socket.join(data.code);

        // Notifica tutti i giocatori
        socket.to(data.code).emit('playerJoined', data.nickname);
        
        // Invia la lista aggiornata dei giocatori
        const players = await GameService.getGamePlayers(match.id);
        io.to(data.code).emit('playersUpdate', players.map(p => ({
          nickname: p.nickname,
          score: p.score,
          isReady: p.is_ready
        })));

        console.log(`Player ${data.nickname} joined match ${data.code}`);
      } catch (error: any) {
        socket.emit('error', error.message || 'Errore nell\'unirsi alla partita');
      }
    });

    // Giocatore si dichiara pronto
    socket.on('setPlayerReady', async (data: { matchCode: string }) => {
      try {
        if (!socket.data.matchId || !socket.data.playerId) {
          socket.emit('error', 'Non sei in una partita');
          return;
        }

        const player = await GameService.setPlayerReady(
          socket.data.matchId, 
          socket.id, 
          true
        );

        if (player) {
          // Notifica tutti i giocatori
          io.to(data.matchCode).emit('playerReady', {
            nickname: player.nickname,
            ready: true
          });

          // Controlla se tutti i giocatori sono pronti
          const allReady = await GameService.areAllPlayersReady(socket.data.matchId);
          const canStart = await GameService.canStartGame(socket.data.matchId);
          if (allReady && canStart.canStart) {
            // Avvia automaticamente la partita dopo 3 secondi
            setTimeout(async () => {
              await startMatch(data.matchCode, socket.data.matchId!);
            }, 3000);
          }
        }
      } catch (error: any) {
        socket.emit('error', error.message || 'Errore nel settare ready');
      }
    });

    // Avvia la partita manualmente
    socket.on('startMatch', async (data: { matchCode: string }) => {
      try {
        if (!socket.data.matchId) {
          socket.emit('error', 'Non sei in una partita');
          return;
        }

        await startMatch(data.matchCode, socket.data.matchId);
      } catch (error: any) {
        socket.emit('error', error.message || 'Errore nell\'avviare la partita');
      }
    });

    // Giocatore invia una risposta
    socket.on('submitAnswer', async (data: {
      matchCode: string;
      questionId: number;
      answerId: number;
      timeTaken: number;
    }) => {
      try {
        if (!socket.data.matchId || !socket.data.playerId) {
          socket.emit('error', 'Non sei in una partita');
          return;
        }

        // Salva la risposta
        await GameService.submitPlayerAnswer(
          socket.data.playerId,
          data.questionId,
          data.answerId,
          data.timeTaken
        );

        console.log(`Player ${socket.data.nickname} submitted answer for question ${data.questionId}`);

        // Controlla se tutti hanno risposto
        const allAnswered = await GameService.haveAllPlayersAnswered(
          socket.data.matchId,
          data.questionId
        );

        if (allAnswered) {
          // Mostra i risultati della domanda
          await showQuestionResults(data.matchCode, socket.data.matchId, data.questionId);
        }
      } catch (error: any) {
        socket.emit('error', error.message || 'Errore nell\'inviare la risposta');
      }
    });

    // Disconnessione
    socket.on('disconnect', async () => {
      try {
        if (socket.data.matchId && socket.data.nickname) {
          // Rimuovi il giocatore dalla partita
          await GameService.removePlayer(socket.data.matchId, socket.id);
          
          // Trova il codice della partita per notificare gli altri
          const match = await GameService.findGameByCode(''); // Questo necessita di un metodo per trovare per ID
          if (match) {
            socket.to(match.code).emit('playerLeft', socket.data.nickname);
          }
        }
      } catch (error) {
        console.error('Errore durante la disconnessione:', error);
      }
      
      console.log(`Client disconnesso: ${socket.id}`);
    });

    // Funzione helper per avviare una partita
    async function startMatch(matchCode: string, matchId: number) {
      try {
        // Avvia la partita
        await GameService.startGame(matchId);
        
        // Notifica l'inizio
        io.to(matchCode).emit('matchStarted');
        
        // Invia la prima domanda
        await sendCurrentQuestion(matchCode, matchId);
      } catch (error) {
        console.error('Errore nell\'avviare la partita:', error);
      }
    }

    // Funzione helper per inviare la domanda corrente
    async function sendCurrentQuestion(matchCode: string, matchId: number) {
      try {
        const question = await GameService.getCurrentQuestion(matchId);
        
        if (question) {
          io.to(matchCode).emit('newQuestion', question);
          
          // Imposta un timer per la domanda
          setTimeout(async () => {
            const allAnswered = await GameService.haveAllPlayersAnswered(
              matchId,
              question.id
            );
            
            if (!allAnswered) {
              // Tempo scaduto, mostra i risultati comunque
              await showQuestionResults(matchCode, matchId, question.id);
            }
          }, question.timeLimit);
        } else {
          // Non ci sono più domande, termina la partita
          await endMatch(matchCode, matchId);
        }
      } catch (error) {
        console.error('Errore nell\'inviare la domanda:', error);
      }
    }

    // Funzione helper per mostrare i risultati di una domanda
    async function showQuestionResults(matchCode: string, matchId: number, questionId: number) {
      try {
        const result = await GameService.handleQuestionEnd(matchId, questionId);
        
        // Invia i risultati della domanda
        io.to(matchCode).emit('questionResults', result.results);
        
        // Aspetta 3 secondi prima di procedere
        setTimeout(async () => {
          if (result.type === 'nextQuestion') {
            // Invia la prossima domanda
            io.to(matchCode).emit('newQuestion', result.nextQuestion);
            
            // Imposta il timer per la nuova domanda
            if (result.nextQuestion) {
              setTimeout(async () => {
                const allAnswered = await GameService.haveAllPlayersAnswered(
                  matchId,
                  result.nextQuestion!.id
                );
                
                if (!allAnswered) {
                  await showQuestionResults(matchCode, matchId, result.nextQuestion!.id);
                }
              }, result.nextQuestion.timeLimit);
            }
          } else if (result.type === 'matchEnd') {
            // Termina la partita
            io.to(matchCode).emit('matchEnded', result.finalResults);
          }
        }, 3000);
      } catch (error) {
        console.error('Errore nel mostrare i risultati:', error);
      }
    }

    // Funzione helper per terminare una partita
    async function endMatch(matchCode: string, matchId: number) {
      try {
        await GameService.endMatch(matchId);
        const finalResults = await GameService.getFinalResults(matchId);
        
        io.to(matchCode).emit('matchEnded', finalResults);
      } catch (error) {
        console.error('Errore nel terminare la partita:', error);
      }
    }
  });
}