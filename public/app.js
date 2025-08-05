// App State
let gameState = {
    socket: null,
    currentScreen: 'home',
    matchCode: '',
    matchId: null,
    nickname: '',
    isReady: false,
    currentQuestion: null,
    timer: null,
    questionStartTime: null
};

// API Base URL
const API_BASE = window.location.origin + '/api';

// DOM Elements
const screens = {
    home: document.getElementById('home-screen'),
    createGame: document.getElementById('create-game-screen'),
    joinGame: document.getElementById('join-game-screen'),
    lobby: document.getElementById('lobby-screen'),
    game: document.getElementById('game-screen'),
    results: document.getElementById('results-screen')
};

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadQuizzes();
    showScreen('home');
});

// Event Listeners Setup
function setupEventListeners() {
    // Navigation
    document.getElementById('create-game-btn').addEventListener('click', () => showScreen('createGame'));
    document.getElementById('join-game-btn').addEventListener('click', () => showScreen('joinGame'));
    document.getElementById('back-to-home').addEventListener('click', () => showScreen('home'));
    document.getElementById('back-to-home-2').addEventListener('click', () => showScreen('home'));
    document.getElementById('home-btn').addEventListener('click', () => showScreen('home'));
    document.getElementById('new-game-btn').addEventListener('click', () => showScreen('home'));

    // Create Game
    document.getElementById('create-sample-quiz-btn').addEventListener('click', createSampleQuiz);
    document.getElementById('create-match-btn').addEventListener('click', createMatch);
    document.getElementById('start-as-host-btn').addEventListener('click', startAsHost);
    document.getElementById('quiz-select').addEventListener('change', function() {
        document.getElementById('create-match-btn').disabled = !this.value;
    });

    // Join Game
    document.getElementById('join-match-btn').addEventListener('click', joinMatch);
    document.getElementById('match-code-input').addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    // Lobby
    document.getElementById('ready-btn').addEventListener('click', setReady);

    // Error handling
    document.getElementById('close-error').addEventListener('click', hideError);
}

// Screen Management
function showScreen(screenName) {
    // Hide all screens
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    
    // Show target screen
    screens[screenName].classList.add('active');
    gameState.currentScreen = screenName;

    // Screen-specific initialization
    if (screenName === 'home') {
        resetGameState();
    }
}

function resetGameState() {
    if (gameState.socket) {
        gameState.socket.disconnect();
        gameState.socket = null;
    }
    
    gameState.matchCode = '';
    gameState.matchId = null;
    gameState.nickname = '';
    gameState.isReady = false;
    gameState.currentQuestion = null;
    
    if (gameState.timer) {
        clearInterval(gameState.timer);
        gameState.timer = null;
    }

    // Reset forms
    document.getElementById('match-code-input').value = '';
    document.getElementById('nickname-input').value = '';
    document.getElementById('ready-btn').textContent = 'Sono Pronto!';
    document.getElementById('ready-btn').classList.remove('btn-secondary');
    document.getElementById('ready-btn').classList.add('btn-success');
    
    hideLoading();
}

// Loading and Error Management
function showLoading(text = 'Caricamento...') {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-toast').style.display = 'flex';
    
    // Auto hide after 5 seconds
    setTimeout(hideError, 5000);
}

function hideError() {
    document.getElementById('error-toast').style.display = 'none';
}

// API Calls
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(API_BASE + endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Errore del server');
        }

        return data.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Quiz Management
async function loadQuizzes() {
    try {
        const quizzes = await apiCall('/quiz');
        const select = document.getElementById('quiz-select');
        
        select.innerHTML = '<option value="">Seleziona un quiz...</option>';
        
        quizzes.forEach(quiz => {
            const option = document.createElement('option');
            option.value = quiz.id;
            option.textContent = `${quiz.title} (${quiz.description || 'Nessuna descrizione'})`;
            select.appendChild(option);
        });
        
        document.getElementById('create-match-btn').disabled = true;
    } catch (error) {
        showError('Errore nel caricamento dei quiz: ' + error.message);
    }
}

async function createSampleQuiz() {
    try {
        showLoading('Creando quiz di esempio...');
        await apiCall('/quiz/sample', { method: 'POST' });
        await loadQuizzes();
        hideLoading();
        showError('Quiz di esempio creato con successo!');
    } catch (error) {
        hideLoading();
        showError('Errore nella creazione del quiz: ' + error.message);
    }
}

// Match Management
async function createMatch() {
    try {
        const quizId = document.getElementById('quiz-select').value;
        if (!quizId) {
            showError('Seleziona un quiz prima di creare la partita');
            return;
        }

        showLoading('Creando partita...');
        
        const result = await apiCall('/game/create', {
            method: 'POST',
            body: JSON.stringify({ quizId: parseInt(quizId) })
        });

        gameState.matchCode = result.matchCode;
        gameState.matchId = result.matchId;

        document.getElementById('created-match-code').textContent = result.matchCode;
        document.getElementById('match-created').style.display = 'block';
        document.getElementById('create-match-btn').style.display = 'none';

        hideLoading();
    } catch (error) {
        hideLoading();
        showError('Errore nella creazione della partita: ' + error.message);
    }
}

function startAsHost() {
    const nickname = prompt('Inserisci il tuo nickname:');
    if (nickname && nickname.trim()) {
        gameState.nickname = nickname.trim();
        connectToMatch();
    }
}

async function joinMatch() {
    const matchCode = document.getElementById('match-code-input').value.trim();
    const nickname = document.getElementById('nickname-input').value.trim();

    if (!matchCode || matchCode.length !== 6) {
        showError('Inserisci un codice partita valido (6 caratteri)');
        return;
    }

    if (!nickname) {
        showError('Inserisci il tuo nickname');
        return;
    }

    try {
        showLoading('Verificando partita...');

        // Check if game exists
        await apiCall(`/game/check/${matchCode}`);
        
        gameState.matchCode = matchCode;
        gameState.nickname = nickname;
        
        hideLoading();
        connectToMatch();
    } catch (error) {
        hideLoading();
        showError('Errore: ' + error.message);
    }
}

// Socket Connection
function connectToMatch() {
    showLoading('Connessione alla partita...');
    
    gameState.socket = io();
    
    gameState.socket.on('connect', () => {
        console.log('Connected to server');
        gameState.socket.emit('joinMatch', {
            code: gameState.matchCode,
            nickname: gameState.nickname
        });
    });

    gameState.socket.on('playerJoined', (nickname) => {
        console.log(`${nickname} si è unito alla partita`);
        // The playersUpdate event will handle the UI update
    });

    gameState.socket.on('playersUpdate', (players) => {
        updatePlayersList(players);
    });

    gameState.socket.on('playerLeft', (nickname) => {
        console.log(`${nickname} ha lasciato la partita`);
    });

    gameState.socket.on('playerReady', (data) => {
        console.log(`${data.nickname} è pronto: ${data.ready}`);
        // This will be handled by playersUpdate
    });

    gameState.socket.on('matchStarted', () => {
        console.log('Partita iniziata!');
        showScreen('game');
    });

    gameState.socket.on('newQuestion', (question) => {
        console.log('Nuova domanda:', question);
        displayQuestion(question);
    });

    gameState.socket.on('questionResults', (results) => {
        console.log('Risultati domanda:', results);
        // Could show intermediate results here
    });

    gameState.socket.on('matchEnded', (finalResults) => {
        console.log('Partita terminata:', finalResults);
        displayFinalResults(finalResults);
    });

    gameState.socket.on('error', (message) => {
        hideLoading();
        showError(message);
    });

    // Successfully joined
    gameState.socket.on('playersUpdate', (players) => {
        hideLoading();
        showScreen('lobby');
        document.getElementById('lobby-match-code').textContent = gameState.matchCode;
        updatePlayersList(players);
    });
}

// Lobby Management
function updatePlayersList(players) {
    const playersList = document.getElementById('players-list');
    const playerCount = document.getElementById('player-count');
    
    playerCount.textContent = players.length;
    
    playersList.innerHTML = players.map(player => `
        <div class="player-item ${player.isReady ? 'ready' : ''}">
            <span class="player-name">${player.nickname}</span>
            <span class="player-status ${player.isReady ? 'ready' : ''}">
                ${player.isReady ? '✅ Pronto' : '⏳ In attesa'}
            </span>
        </div>
    `).join('');

    // Update ready status message
    const readyCount = players.filter(p => p.isReady).length;
    const statusEl = document.getElementById('ready-status');
    
    if (readyCount === players.length && players.length > 1) {
        statusEl.textContent = 'Tutti pronti! La partita inizierà a breve...';
        statusEl.style.color = '#28a745';
    } else if (players.length < 2) {
        statusEl.textContent = 'Servono almeno 2 giocatori per iniziare';
        statusEl.style.color = '#dc3545';
    } else {
        statusEl.textContent = `${readyCount}/${players.length} giocatori pronti`;
        statusEl.style.color = '#6c757d';
    }
}

function setReady() {
    if (!gameState.isReady) {
        gameState.socket.emit('setPlayerReady', {
            matchCode: gameState.matchCode
        });
        
        gameState.isReady = true;
        const btn = document.getElementById('ready-btn');
        btn.textContent = 'Pronto! ✅';
        btn.classList.remove('btn-success');
        btn.classList.add('btn-secondary');
        btn.disabled = true;
    }
}

// Game Management
function displayQuestion(question) {
    gameState.currentQuestion = question;
    gameState.questionStartTime = Date.now();
    
    document.getElementById('question-number').textContent = question.questionNumber;
    document.getElementById('total-questions').textContent = question.totalQuestions;
    document.getElementById('question-text').textContent = question.question_text;
    
    const answersContainer = document.getElementById('answers-container');
    answersContainer.innerHTML = question.answers.map(answer => `
        <button class="answer-btn" data-answer-id="${answer.id}">
            ${answer.answer_text}
        </button>
    `).join('');

    // Add click handlers to answer buttons
    answersContainer.querySelectorAll('.answer-btn').forEach(btn => {
        btn.addEventListener('click', () => selectAnswer(btn));
    });

    // Start timer
    startQuestionTimer(question.timeLimit);
    
    // Hide waiting message
    document.getElementById('waiting-message').style.display = 'none';
}

function selectAnswer(buttonEl) {
    if (!gameState.currentQuestion) return;
    
    // Remove previous selections
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.classList.remove('selected');
        btn.disabled = false;
    });
    
    // Mark selected
    buttonEl.classList.add('selected');
    
    // Disable all buttons
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.disabled = true;
    });
    
    // Calculate time taken
    const timeTaken = Date.now() - gameState.questionStartTime;
    const answerId = parseInt(buttonEl.dataset.answerId);
    
    // Submit answer
    gameState.socket.emit('submitAnswer', {
        matchCode: gameState.matchCode,
        questionId: gameState.currentQuestion.id,
        answerId: answerId,
        timeTaken: timeTaken
    });
    
    // Show waiting message
    document.getElementById('waiting-message').style.display = 'block';
    
    // Stop timer
    if (gameState.timer) {
        clearInterval(gameState.timer);
        gameState.timer = null;
    }
}

function startQuestionTimer(duration) {
    if (gameState.timer) {
        clearInterval(gameState.timer);
    }
    
    let timeLeft = Math.floor(duration / 1000);
    const timerText = document.getElementById('timer-text');
    const timerCircle = document.getElementById('timer-circle');
    
    // Update timer display
    function updateTimer() {
        timerText.textContent = timeLeft;
        
        // Update circle color based on time left
        const percentage = (timeLeft / Math.floor(duration / 1000)) * 100;
        const degrees = (percentage / 100) * 360;
        
        if (percentage > 50) {
            timerCircle.style.background = `conic-gradient(#28a745 ${degrees}deg, #e9ecef ${degrees}deg)`;
        } else if (percentage > 25) {
            timerCircle.style.background = `conic-gradient(#ffc107 ${degrees}deg, #e9ecef ${degrees}deg)`;
        } else {
            timerCircle.style.background = `conic-gradient(#dc3545 ${degrees}deg, #e9ecef ${degrees}deg)`;
        }
        
        timeLeft--;
        
        if (timeLeft < 0) {
            clearInterval(gameState.timer);
            gameState.timer = null;
            
            // Time's up - disable all answers if none selected
            const selectedAnswer = document.querySelector('.answer-btn.selected');
            if (!selectedAnswer) {
                document.querySelectorAll('.answer-btn').forEach(btn => {
                    btn.disabled = true;
                });
                document.getElementById('waiting-message').style.display = 'block';
            }
        }
    }
    
    updateTimer(); // Initial call
    gameState.timer = setInterval(updateTimer, 1000);
}

// Results Management
function displayFinalResults(results) {
    showScreen('results');
    
    const resultsContainer = document.getElementById('final-results');
    
    resultsContainer.innerHTML = results.map(result => `
        <div class="result-item position-${result.position}">
            <div class="position">${getPositionEmoji(result.position)}${result.position}</div>
            <div class="player-info">
                <div class="player-name-result">${result.nickname}</div>
                <div class="player-score">${result.totalScore} punti</div>
            </div>
        </div>
    `).join('');
}

function getPositionEmoji(position) {
    switch(position) {
        case 1: return '🥇 ';
        case 2: return '🥈 ';
        case 3: return '🥉 ';
        default: return '';
    }
}

// Utility Functions
function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    return seconds === 1 ? '1 secondo' : `${seconds} secondi`;
}
