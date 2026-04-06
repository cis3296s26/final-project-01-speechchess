function toggleSubMenu(button){
    // Access the next element sibling, which is the submenu. Button and submenu are sibling elements as they're the same hierarchy level within the same li element.
    button.nextElementSibling.classList.toggle('show')
    // Rotate the svg arrow from down to up as the submenu is now open.
    button.classList.toggle('rotate')
} 

function home(button){
    window.location.href="/"
}

// All the calls for window redireciton to the user_authentication directory html files
function getStarted(button){
    window.location.href="user_authentication/get_started"
}

function login(button){
    window.location.href="user_authentication/login"
}

function signUp(button){
    window.location.href="user_authentication/signup"
}

function profile(button){
    window.location.href="user_authentication/profile"
}

// All the calls for window redirection to the play directory html files
function playExample(button){
    const destination = "play/play"
    sessionStorage.setItem("speechChessAutoStart", "1")
    sessionStorage.setItem("speechChessPlayIntro", "1")
    sessionStorage.setItem("speechChessPlayMusic", "1")

    if (!("speechSynthesis" in window)) {
        window.location.href = destination
        return
    }

    const intro = new SpeechSynthesisUtterance(
        "Welcome to Speech Chess. Say Speech Chess, then your move, then submit move."
    )

    let redirected = false
    const goToPlayPage = function () {
        if (redirected) {
            return
        }

        redirected = true
        window.location.href = destination
    }

    intro.onend = goToPlayPage
    intro.onerror = goToPlayPage

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(intro)
    setTimeout(goToPlayPage, 6000)
}

function playOnline(button){
    window.location.href="play/play_online"
}

function playAI(button){
    window.location.href="play/play_ai"
}

function playFriends(button){
    window.location.href="play/play_friends"
}

function stats(button){
    window.location.href="play/stats"
}

function history(button){
    window.location.href="play/history"
}

// All the calls for window redirection to the puzzles directory html files
function puzzlesDaily(button){
    window.location.href="puzzles/daily_puzzle"
}

function puzzlesAll(button){
    window.location.href="puzzles/all_puzzles"
}

// Rest of the calls for window redirection to the sidebar html files
function learn(button){
    window.location.href="sidebar/learn"
}

function community(button){
    window.location.href="sidebar/community"
}

function settings(button){
    window.location.href="sidebar/settings"
}

function support(button){
    window.location.href="sidebar/support"
}


// Promote to queen, knight, bisop, rook
let promoResolve = null;

function createPromotionModal() {
    if (document.getElementById('promo-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'promo-overlay';
    overlay.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000; align-items:center; justify-content:center;';

    overlay.innerHTML = `
        <div style="background:black; border-radius:12px; padding:1.5rem 2rem; text-align:center;">
            <p style="font-weight:500; margin:0 0 1rem;">Promote pawn to:</p>
            <div style="display:flex; gap:12px; justify-content:center;">
                <button onclick="resolvePromotion('q')"><img src="/static/chess/img/chesspieces/alpha/wQ.png" width="40"><br>Queen</button>
                <button onclick="resolvePromotion('r')"><img src="/static/chess/img/chesspieces/alpha/wR.png" width="40"><br>Rook</button>
                <button onclick="resolvePromotion('b')"><img src="/static/chess/img/chesspieces/alpha/wB.png" width="40"><br>Bishop</button>
                <button onclick="resolvePromotion('n')"><img src="/static/chess/img/chesspieces/alpha/wN.png" width="40"><br>Knight</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}

function askPromotion() {
    createPromotionModal();
    return new Promise(resolve => {
        promoResolve = resolve;
        document.getElementById('promo-overlay').style.display = 'flex';
    });
}

function resolvePromotion(piece) {
    document.getElementById('promo-overlay').style.display = 'none';
    if (promoResolve) promoResolve(piece);
}


//Chess Board
function initChessGame(config) {
    const elementId  = config.elementId  || "board";
    const pieceTheme = config.pieceTheme || "/static/chess/img/chesspieces/wikipedia/{piece}.png";
    const onPromotion = config.onPromotion || (() => askPromotion());

    let currentFen = config.fen || "start";

    function toDisplayFen(fen) {
        if (!fen || fen === "start") return "start";
        return fen.includes(" ") ? fen.split(" ")[0] : fen;
    }

    async function handleDrop(source, target, piece) {
        if (!config.onDrop) return "snapback";

        const isWhitePawn = piece === "wP" && target[1] === "8";
        const isBlackPawn = piece === "bP" && target[1] === "1";

        let move = source + target;

        if (isWhitePawn || isBlackPawn) {
            const promoChoice = await onPromotion(isWhitePawn ? "white" : "black");
            move += promoChoice;
        }

        return config.onDrop(source, target, piece, move);
    }

    const board = Chessboard(elementId, {
        draggable:  config.draggable !== false,
        position:   toDisplayFen(currentFen),
        orientation: config.orientation || "white",
        pieceTheme: pieceTheme,
        onDrop:     handleDrop,
        onSnapEnd:  () => board.position(toDisplayFen(currentFen))
    });

    return {
        setPosition(fen) {
            currentFen = fen || "start";
            board.position(toDisplayFen(currentFen));
        },
        getBoard() {
            return board;
        }
    };
}

//refresh chess board
async function refreshBoard() {
    const res = await fetch("/state");
    const data = await res.json();
    chess.setPosition(data.fen);

    if (data.history && data.history.length > lastHistoryLength) {
        playMoveSound()
        const latestMove = data.history[data.history.length - 1];
        if (!suppressNextAnnouncement && typeof speakText === "function") {
            speakText(`Latest move ${latestMove}. ${data.turn} to move.`);
        }
        suppressNextAnnouncement = false;
    }

    lastHistoryLength = data.history ? data.history.length : lastHistoryLength;
}

// Chess piece movement noise
const moveSounds = [
    new Audio('/static/sounds/ChessNoise1.mp3'),
    new Audio('/static/sounds/ChessNoise2.mp3')
];

function playMoveSound() {
    const sound = moveSounds[Math.floor(Math.random() * moveSounds.length)];
    sound.currentTime = 0;
    sound.play();
}

//Background music
function startBackgroundMusic() {
    const music = document.getElementById("backgroundMusic");
    if (!music) return;
    music.volume = 0.2;
    music.play().catch(() => {});
}

//Timer
function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (gameOver) { clearInterval(timerInterval); return; }
        timeLeft[currentTurn]--;
        updateTimerDisplay();
        if (timeLeft[currentTurn] <= 0) {
            clearInterval(timerInterval);
            ws.send(JSON.stringify({ type: "leave", player: myColor }));
            endGame("Time's up! " + (myColor === currentTurn ? "You lost." : "You won!"));
        }
    }, 1000);
}

function updateTimerDisplay() {
    document.getElementById("time-white").textContent = formatTime(timeLeft.white);
    document.getElementById("time-black").textContent = formatTime(timeLeft.black);
    document.getElementById("timer-white").classList.toggle("active-timer", currentTurn === "white");
    document.getElementById("timer-black").classList.toggle("active-timer", currentTurn === "black");
}
