/**
 * Memorama - Juego de Memoria PWA
 * Lógica principal del juego
 */

// ========================================
// CONFIGURACIÓN Y ESTADO
// ========================================

const EMOJIS = [
    '🐶', '🐱', '🐭', '🐹',
    '🐰', '🦊', '🐻', '🐼'
];

const GAME_CONFIG = {
    pairs: 8,
    columns: 4
};

// Estado del juego
let gameState = {
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    moves: 0,
    timer: 0,
    timerInterval: null,
    gameStarted: false,
    gameEnded: false,
    canFlip: true
};

// Elementos del DOM
const elements = {
    gameBoard: document.getElementById('gameBoard'),
    moves: document.getElementById('moves'),
    pairs: document.getElementById('pairs'),
    timer: document.getElementById('timer'),
    newGameBtn: document.getElementById('newGameBtn'),
    installBtn: document.getElementById('installBtn'),
    gameInfo: document.getElementById('gameInfo'),
    winModal: document.getElementById('winModal'),
    finalMoves: document.getElementById('finalMoves'),
    finalTime: document.getElementById('finalTime'),
    playAgainBtn: document.getElementById('playAgainBtn')
};

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================

/**
 * Mezcla un array usando el algoritmo Fisher-Yates
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Formatea el tiempo en MM:SS
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Genera un ID único para las cartas
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ========================================
// INICIALIZACIÓN DEL JUEGO
// ========================================

/**
 * Crea el array de cartas para el juego
 */
function createCards() {
    // Duplicar los emojis para crear pares
    const cardValues = [...EMOJIS, ...EMOJIS];
    const shuffledValues = shuffleArray(cardValues);

    gameState.cards = shuffledValues.map((value, index) => ({
        id: generateId(),
        value: value,
        index: index,
        isFlipped: false,
        isMatched: false
    }));
}

/**
 * Renderiza el tablero de juego
 */
function renderBoard() {
    elements.gameBoard.innerHTML = '';

    gameState.cards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.cardId = card.id;
        cardElement.dataset.index = index;
        cardElement.setAttribute('role', 'button');
        cardElement.setAttribute('tabindex', '0');
        cardElement.setAttribute('aria-label', card.isFlipped || card.isMatched ? `Carta: ${card.value}` : 'Carta boca abajo');
        cardElement.setAttribute('aria-pressed', card.isFlipped || card.isMatched);

        if (card.isFlipped || card.isMatched) {
            cardElement.classList.add('flipped');
        }
        if (card.isMatched) {
            cardElement.classList.add('matched');
        }

        cardElement.innerHTML = `
            <div class="card-inner">
                <div class="card-face card-back" aria-hidden="true">?</div>
                <div class="card-face card-front" aria-hidden="true">${card.value}</div>
            </div>
        `;

        // Evento clic
        cardElement.addEventListener('click', () => handleCardClick(card.id));

        // Evento teclado (Enter/Espacio)
        cardElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick(card.id);
            }
        });

        elements.gameBoard.appendChild(cardElement);
    });
}

/**
 * Inicializa un nuevo juego
 */
function initGame() {
    // Resetear estado
    gameState = {
        cards: [],
        flippedCards: [],
        matchedPairs: 0,
        moves: 0,
        timer: 0,
        timerInterval: null,
        gameStarted: false,
        gameEnded: false,
        canFlip: true
    };

    // Crear cartas y renderizar
    createCards();
    renderBoard();

    // Actualizar UI
    updateStats();
    updateTimerDisplay();
    elements.gameInfo.innerHTML = '<p>Encuentra todas las parejas haciendo clic en las cartas.</p>';
    elements.winModal.hidden = true;
    elements.newGameBtn.textContent = '🔄 Nuevo Juego';
}

// ========================================
// LÓGICA DEL JUEGO
// ========================================

/**
 * Maneja el clic en una carta
 */
function handleCardClick(cardId) {
    // Validaciones
    if (!gameState.canFlip) return;
    if (gameState.gameEnded) return;

    const card = gameState.cards.find(c => c.id === cardId);
    if (!card) return;
    if (card.isFlipped || card.isMatched) return;

    // Iniciar temporizador en el primer movimiento
    if (!gameState.gameStarted) {
        startTimer();
        gameState.gameStarted = true;
    }

    // Voltear la carta
    flipCard(cardId);
    gameState.flippedCards.push(cardId);

    // Verificar si hay dos cartas volteadas
    if (gameState.flippedCards.length === 2) {
        gameState.canFlip = false;
        gameState.moves++;
        updateStats();

        setTimeout(() => {
            checkMatch();
        }, 800);
    }
}

/**
 * Voltea una carta (animación)
 */
function flipCard(cardId) {
    const card = gameState.cards.find(c => c.id === cardId);
    if (!card) return;

    card.isFlipped = true;

    const cardElement = elements.gameBoard.querySelector(`[data-card-id="${cardId}"]`);
    if (cardElement) {
        cardElement.classList.add('flipped');
        cardElement.setAttribute('aria-label', `Carta: ${card.value}`);
        cardElement.setAttribute('aria-pressed', 'true');
    }
}

/**
 * Vuelve a poner boca abajo las cartas que no coinciden
 */
function unflipCards(cardIds) {
    cardIds.forEach(cardId => {
        const card = gameState.cards.find(c => c.id === cardId);
        if (!card) return;

        card.isFlipped = false;

        const cardElement = elements.gameBoard.querySelector(`[data-card-id="${cardId}"]`);
        if (cardElement) {
            cardElement.classList.remove('flipped');
            cardElement.setAttribute('aria-label', 'Carta boca abajo');
            cardElement.setAttribute('aria-pressed', 'false');
        }
    });
}

/**
 * Verifica si las dos cartas volteadas coinciden
 */
function checkMatch() {
    const [firstId, secondId] = gameState.flippedCards;
    const firstCard = gameState.cards.find(c => c.id === firstId);
    const secondCard = gameState.cards.find(c => c.id === secondId);

    if (firstCard.value === secondCard.value) {
        // ¡Coinciden!
        handleMatch(firstId, secondId);
    } else {
        // No coinciden
        handleMismatch(firstId, secondId);
    }

    gameState.flippedCards = [];
    gameState.canFlip = true;
}

/**
 * Maneja cuando hay coincidencia
 */
function handleMatch(firstId, secondId) {
    const firstCard = gameState.cards.find(c => c.id === firstId);
    const secondCard = gameState.cards.find(c => c.id === secondId);

    firstCard.isMatched = true;
    secondCard.isMatched = true;
    firstCard.isFlipped = true;
    secondCard.isFlipped = true;

    gameState.matchedPairs++;

    const firstElement = elements.gameBoard.querySelector(`[data-card-id="${firstId}"]`);
    const secondElement = elements.gameBoard.querySelector(`[data-card-id="${secondId}"]`);

    if (firstElement) {
        firstElement.classList.add('matched');
        firstElement.setAttribute('aria-label', `Pareja encontrada: ${firstCard.value}`);
    }
    if (secondElement) {
        secondElement.classList.add('matched');
        secondElement.setAttribute('aria-label', `Pareja encontrada: ${secondCard.value}`);
    }

    updateStats();

    // Verificar victoria
    if (gameState.matchedPairs === GAME_CONFIG.pairs) {
        setTimeout(() => {
            handleWin();
        }, 500);
    }
}

/**
 * Maneja cuando no hay coincidencia
 */
function handleMismatch(firstId, secondId) {
    const firstElement = elements.gameBoard.querySelector(`[data-card-id="${firstId}"]`);
    const secondElement = elements.gameBoard.querySelector(`[data-card-id="${secondId}"]`);

    // Animación de "shake" para indicar error
    if (firstElement) firstElement.classList.add('shake');
    if (secondElement) secondElement.classList.add('shake');

    setTimeout(() => {
        if (firstElement) firstElement.classList.remove('shake');
        if (secondElement) secondElement.classList.remove('shake');
        unflipCards([firstId, secondId]);
    }, 400);
}

/**
 * Maneja la victoria
 */
function handleWin() {
    gameState.gameEnded = true;
    stopTimer();

    elements.finalMoves.textContent = gameState.moves;
    elements.finalTime.textContent = formatTime(gameState.timer);
    elements.winModal.hidden = false;

    // Anunciar victoria para lectores de pantalla
    elements.gameInfo.innerHTML = `<p>🎉 ¡Felicidades! Completaste el juego en ${gameState.moves} movimientos y ${formatTime(gameState.timer)}.</p>`;
}

// ========================================
// TEMPORIZADOR
// ========================================

/**
 * Inicia el temporizador
 */
function startTimer() {
    gameState.timerInterval = setInterval(() => {
        gameState.timer++;
        updateTimerDisplay();
    }, 1000);
}

/**
 * Detiene el temporizador
 */
function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

/**
 * Actualiza la visualización del temporizador
 */
function updateTimerDisplay() {
    elements.timer.textContent = formatTime(gameState.timer);
}

// ========================================
// ACTUALIZACIÓN DE UI
// ========================================

/**
 * Actualiza las estadísticas en pantalla
 */
function updateStats() {
    elements.moves.textContent = gameState.moves;
    elements.pairs.textContent = `${gameState.matchedPairs}/${GAME_CONFIG.pairs}`;
}

// ========================================
// EVENT LISTENERS
// ========================================

// Botón de nuevo juego
elements.newGameBtn.addEventListener('click', initGame);

// Botón de jugar de nuevo (modal)
elements.playAgainBtn.addEventListener('click', () => {
    elements.winModal.hidden = true;
    initGame();
});

// Cerrar modal con tecla Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !elements.winModal.hidden) {
        elements.winModal.hidden = true;
    }
});

// ========================================
// INICIALIZACIÓN
// ========================================

// Iniciar el juego al cargar
document.addEventListener('DOMContentLoaded', () => {
    initGame();

    // Registrar Service Worker si está disponible
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker registrado:', reg.scope))
            .catch(err => console.log('Error al registrar SW:', err));
    }
});

// Manejar visibilidad de la página (pausar timer si se oculta)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState.gameStarted && !gameState.gameEnded) {
        // Opcional: pausar timer cuando la pestaña no está visible
    }
});

// Prevenir zoom en doble clic en móvil
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, { passive: false });