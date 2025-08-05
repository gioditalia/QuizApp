# Quiz App - Backend

Backend per un'applicazione di quiz in tempo reale multi-giocatore con Socket.IO.

## Caratteristiche

- 🎮 Quiz in tempo reale tra più giocatori
- ❓ Due tipologie di domande: Vero/Falso e Risposta Multipla (4 opzioni)
- 🏆 Sistema di punteggio basato su correttezza e velocità di risposta
- 💾 Database PostgreSQL con Knex.js
- 🌐 WebSocket con Socket.IO per comunicazione real-time
- 🔧 TypeScript per type safety

## Tecnologie Utilizzate

- **Node.js** con **Express.js**
- **Socket.IO** per WebSocket real-time
- **PostgreSQL** con **Knex.js** per il database
- **TypeScript** per la tipizzazione
- **Docker** per la containerizzazione

## Setup e Installazione

### 1. Clona il repository
```bash
git clone <repository-url>
cd QuizApp
```

### 2. Installa le dipendenze
```bash
npm install
```

### 3. Configura il database
Copia il file `.env.example` in `.env` e configura la tua stringa di connessione PostgreSQL:
```bash
cp .env.example .env
```

Modifica il file `.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/quiz_app
PORT=3000
```

### 4. Esegui le migrazioni
```bash
npm run migrate
```

### 5. Avvia il server
```bash
# Modalità sviluppo
npm run dev

# Modalità produzione
npm run build
npm start
```

## API Endpoints

### Match Management
- `POST /api/match/create` - Crea una nuova partita
- `POST /api/match/create-game` - Crea una partita con quiz inizializzato
- `GET /api/match/check/:code` - Verifica se una partita esiste
- `GET /api/match/summary/:id` - Ottiene riepilogo completo di una partita
- `GET /api/match/stats/:id` - Ottiene statistiche di una partita

### Quiz Management
- `GET /api/match/quizzes` - Ottiene tutti i quiz disponibili
- `POST /api/match/quiz` - Crea un nuovo quiz vuoto
- `POST /api/match/quiz/complete` - Crea un quiz completo con domande
- `POST /api/match/quiz/sample` - Crea un quiz di esempio
- `GET /api/match/quiz/:id` - Ottieni dettagli di un quiz

### Health Check
- `GET /health` - Controllo stato del server

## Eventi Socket.IO

### Eventi Client → Server
- `joinMatch` - Unisciti a una partita
  ```json
  { "code": "ABC123", "nickname": "PlayerName" }
  ```
- `setPlayerReady` - Imposta giocatore come pronto
  ```json
  { "matchCode": "ABC123" }
  ```
- `startMatch` - Avvia partita manualmente
  ```json
  { "matchCode": "ABC123" }
  ```
- `submitAnswer` - Invia risposta
  ```json
  { 
    "matchCode": "ABC123", 
    "questionId": 1, 
    "answerId": 2, 
    "timeTaken": 5000 
  }
  ```

### Eventi Server → Client
- `playerJoined` - Nuovo giocatore si è unito
- `playerLeft` - Giocatore ha lasciato
- `playerReady` - Giocatore è pronto
- `matchStarted` - Partita iniziata
- `newQuestion` - Nuova domanda
- `questionResults` - Risultati domanda
- `matchEnded` - Partita terminata
- `error` - Errore

## Struttura Database

### Tabelle Principali
- `matches` - Partite
- `players` - Giocatori
- `quizzes` - Quiz
- `questions` - Domande
- `answers` - Risposte
- `player_answers` - Risposte dei giocatori
- `match_questions` - Relazione partite-domande

## Esempio di Utilizzo

### 1. Crea un quiz di esempio
```bash
curl -X POST http://localhost:3000/api/match/quiz/sample
```

### 2. Crea una nuova partita
```bash
curl -X POST http://localhost:3000/api/match/create \\
  -H "Content-Type: application/json" \\
  -d '{"quizId": 1}'
```

### 3. Connettiti via WebSocket
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Unisciti a una partita
socket.emit('joinMatch', { 
  code: 'ABC123', 
  nickname: 'PlayerName' 
});

// Ascolta eventi
socket.on('playerJoined', (nickname) => {
  console.log(`${nickname} si è unito alla partita`);
});

socket.on('newQuestion', (question) => {
  console.log('Nuova domanda:', question);
});
```

## Sistema di Punteggio

I punti vengono calcolati in base a:
- **Correttezza della risposta** (risposta sbagliata = 0 punti)
- **Velocità di risposta** (più veloce = più punti bonus)

Formula: `punti = punti_base * (0.5 + 0.5 * (tempo_limite - tempo_impiegato) / tempo_limite)`

## Sviluppo

### Struttura del Progetto
```
src/
├── index.ts              # Entry point
├── socket.ts             # Gestione WebSocket
├── db/
│   ├── db.ts            # Configurazione database
│   └── knexfile.ts      # Configurazione Knex
├── migrations/          # Migrazioni database
├── routes/              # API routes
├── services/            # Logica business
│   ├── MatchService.ts  # Gestione partite
│   ├── QuizService.ts   # Gestione quiz
│   └── GameService.ts   # Logica di gioco
├── types/               # Definizioni TypeScript
└── utils/               # Utilities
```

### Comandi Utili
```bash
# Avvia in modalità sviluppo
npm run dev

# Build per produzione
npm run build

# Esegui migrazioni
npm run migrate

# Lint e format (se configurati)
npm run lint
npm run format
```

## Docker

Per utilizzare Docker:

```bash
# Build dell'immagine
docker build -t quiz-app .

# Avvia il container
docker run -p 3000:3000 --env-file .env quiz-app
```

## Contributi

1. Fork del progetto
2. Crea un branch per la feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## Licenza

Questo progetto è sotto licenza MIT. Vedi il file `LICENSE` per i dettagli.
