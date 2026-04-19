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

function profile(button){
    window.location.href="user_authentication/profile"
}

// All the calls for window redirection to the play directory html files
function playExample(button){
    const destination = "play/play"
    sessionStorage.setItem("speechChessAutoStart", "1")
    sessionStorage.setItem("speechChessPlayMusic", "1")
    sessionStorage.removeItem("speechChessPlayIntro")
    window.location.href = destination
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

function faq(button){
    window.location.href="sidebar/faq"
}

function settings(button){
    window.location.href="sidebar/settings"
}

function guest(button){
    window.location.href="user_authentication/guest"
}

let homepageMenuRecognition = null;
let homepageVoiceInstructionsPlayed = false;

function isHomepage() {
    return window.location.pathname === "/" || window.location.pathname === "";
}

function isTypingTarget(target) {
    if (!target) return false;
    const tagName = target.tagName ? target.tagName.toLowerCase() : "";
    return tagName === "input" || tagName === "textarea" || target.isContentEditable;
}

function updateHomepageVoiceStatus(message) {
    const status = document.getElementById("homepageVoiceStatus");
    if (status) {
        status.textContent = message;
    }
}

function speakHomepageVoiceInstructions() {
    homepageVoiceInstructionsPlayed = true;
    const message = "Voice navigation instructions. Press V to activate menu voice control. Then say Play AI to open the Play AI page.";
    updateHomepageVoiceStatus(message);

    if (typeof speakText === "function") {
        speakText(message);
    }
}

function normalizeHomepageCommand(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function handleHomepageMenuCommand(transcript) {
    const command = normalizeHomepageCommand(transcript);
    updateHomepageVoiceStatus(`Heard: ${transcript}`);

    if (
        command.includes("play ai") ||
        command.includes("play a i") ||
        command.includes("play artificial intelligence")
    ) {
        updateHomepageVoiceStatus("Opening Play AI.");
        if (typeof speakText === "function") {
            speakText("Opening Play AI.");
        }
        setTimeout(function () {
            playAI();
        }, 700);
        return;
    }

    const retryMessage = "I heard " + transcript + ". For now, say Play AI.";
    updateHomepageVoiceStatus(retryMessage);
    if (typeof speakText === "function") {
        speakText(retryMessage);
    }
}

function startHomepageMenuVoiceControl() {
    if (!isHomepage()) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        const message = "Browser speech recognition is not supported here.";
        updateHomepageVoiceStatus(message);
        if (typeof speakText === "function") {
            speakText(message);
        }
        return;
    }

    if (homepageMenuRecognition) {
        try {
            homepageMenuRecognition.stop();
        } catch (error) {
            // Ignore stale recognition sessions before starting a fresh one.
        }
    }

    homepageMenuRecognition = new SpeechRecognition();
    homepageMenuRecognition.lang = "en-US";
    homepageMenuRecognition.interimResults = false;
    homepageMenuRecognition.continuous = false;
    homepageMenuRecognition.maxAlternatives = 3;

    homepageMenuRecognition.onstart = function () {
        updateHomepageVoiceStatus("Menu voice control listening. Say Play AI.");
    };

    homepageMenuRecognition.onresult = function (event) {
        const result = event.results && event.results[0] && event.results[0][0];
        const transcript = result ? result.transcript.trim() : "";
        if (transcript) {
            handleHomepageMenuCommand(transcript);
        }
    };

    homepageMenuRecognition.onerror = function (event) {
        const message = event && event.error === "not-allowed"
            ? "Microphone access was blocked for menu voice control."
            : "Menu voice control did not hear a command. Press V and try again.";
        updateHomepageVoiceStatus(message);
        if (typeof speakText === "function") {
            speakText(message);
        }
    };

    homepageMenuRecognition.onend = function () {
        homepageMenuRecognition = null;
    };

    try {
        homepageMenuRecognition.start();
    } catch (error) {
        updateHomepageVoiceStatus("Menu voice control could not start. Press V and try again.");
    }
}

document.addEventListener("keydown", function (event) {
    if (!isHomepage() || isTypingTarget(event.target)) {
        return;
    }

    if (event.code === "Space") {
        event.preventDefault();
        speakHomepageVoiceInstructions();
        return;
    }

    if (event.key && event.key.toLowerCase() === "v") {
        event.preventDefault();
        if (!homepageVoiceInstructionsPlayed) {
            updateHomepageVoiceStatus("Menu voice control activated. Say Play AI.");
        }
        startHomepageMenuVoiceControl();
    }
});

// Current volume is default value unless a database value is found for that account. Then local value is set to that database value.
function effectiveVolume(localVolume){
    let currentMasterVolume = 50;
    if(typeof masterVolume !== "undefined"){
        currentMasterVolume = masterVolume;
    }else if(window.speechChessSettings && typeof window.speechChessSettings.masterVolume !== "undefined"){
        currentMasterVolume = window.speechChessSettings.masterVolume;
    }
    return(Number(currentMasterVolume)/100)*(Number(localVolume)/100);
}

// Sets the music volume to default unless a database value is found for that account. Then that value is passed to effectiveVolume() for the master volume to be applied.
function applyBackgroundMusicVolume(){
    const music = document.getElementById("backgroundMusic");
    if(!music)
         return;
    let musicVolume = 50;
    if(window.speechChessSettings && typeof window.speechChessSettings.musicVolume !== "undefined"){
        musicVolume = window.speechChessSettings.musicVolume;
    }
    music.volume = effectiveVolume(musicVolume);
}

// Sets the sound effect volume to default unless a database value is found for that account. Then that value is passed to effectiveVolume() for the master volume to be applied.
function applySoundEffectsVolume(){
    let soundEffectsVolume = 50;
    if(window.speechChessSettings && typeof window.speechChessSettings.soundEffectsVolume !== "undefined"){
        soundEffectsVolume = window.speechChessSettings.soundEffectsVolume;
    }
    const finalVolume = effectiveVolume(soundEffectsVolume);
    const moveSounds = window.speechChessMoveSounds || [];
    moveSounds.forEach(sound => {
        sound.volume = finalVolume;
    });
}

document.addEventListener("DOMContentLoaded", function () {
    // This grabs all elements with the .settings_toggle class
    const toggleButtons = document.querySelectorAll(".settings_toggle");
    /* For each .settings_toggle class element, when clicked the addEventListener() runs. It gets the name of the setting and checks if that
    setting is enabled or not. If enabled, then currently enabled is true as contains() will return true, and false if it doesn't contain
    enabled. Then, new value flips the value, by being set to false if classList contains enabled and true if it doesn't. formData is assigned
    a FormData object which is then appended the setting name and value of the setting which are both then sent to the sidebar/settings/update
    POST route. The value of setting that's sent is either true or false. So, the backend recieves the setting name, narrator_enabled or 
    voice_input_enabled, and the new setting value of true or false, and the backend sets the value using setattr(). Then, those changes
    are saved to the database with the session.add(settings) and session.commit statements in the backend.  */
    toggleButtons.forEach(button => {
        // Called when one of the toggle buttons is clicked. 
        button.addEventListener("click", async function () {
            const settingName = button.dataset.settingName;
            const currentlyEnabled = button.classList.contains("enabled");
            let newValue;
            if (currentlyEnabled) {
                newValue = "false";
            } else {
                newValue = "true";
            }
            const formData = new FormData();
            formData.append("setting_name", settingName);
            formData.append("setting_value", newValue);
            try {
                const response = await fetch("/sidebar/settings/update", {method: "POST", body: formData});
                const result = await response.json();
                if (result.success) {
                    if (newValue === "true") {
                        button.classList.remove("disabled");
                        button.classList.add("enabled");
                        button.textContent = "Enabled";
                    } else {
                        button.classList.remove("enabled");
                        button.classList.add("disabled");
                        button.textContent = "Disabled";
                    }
                    if (window.speechChessSettings) {
                        if (settingName === "narrator_enabled") {
                            window.speechChessSettings.narratorEnabled = (newValue === "true");
                        } else if (settingName === "voice_input_enabled") {
                            window.speechChessSettings.voiceInputEnabled = (newValue === "true");
                        }
                    }
                    if (typeof narratorEnabled !== "undefined" && settingName === "narrator_enabled") {
                        narratorEnabled = (newValue === "true");
                    }
                    if (typeof voiceInputEnabled !== "undefined" && settingName === "voice_input_enabled") {
                        voiceInputEnabled = (newValue === "true");
                    }
                } else {
                    alert("Failed to update setting.");
                }
            } catch (error) {
                console.error("Error:", error);
            }
        });
    });
    // This grabs all elements with the .volume_slider class.
    const sliders = document.querySelectorAll(".volume_slider");
    // Attach event listeners for all sliders.
    sliders.forEach(slider => {
        // Gets the number value fo the slider and sets valueSpan equal to it.
        const valueSpan = slider.nextElementSibling;
        // Runs every time the slider moves to update the number live. Updates locally The slider("change") updates the database.
        slider.addEventListener("input", function () {
            const settingName = slider.dataset.settingName;
            const newValue = Number(slider.value);
            valueSpan.textContent = slider.value;
            if(window.speechChessSettings) {
                if(settingName === "master_volume") {
                    window.speechChessSettings.masterVolume = newValue;
                }else if(settingName === "narrator_volume") {
                    window.speechChessSettings.narratorVolume = newValue;
                }else if(settingName === "music_volume") {
                    window.speechChessSettings.musicVolume = newValue;
                }else if(settingName === "sound_effects_volume") {
                    window.speechChessSettings.soundEffectsVolume = newValue;
                }
            }
            if (typeof masterVolume !== "undefined" && settingName === "master_volume") {
                masterVolume = newValue;
            }
            if (typeof narratorVolume !== "undefined" && settingName === "narrator_volume") {
                narratorVolume = newValue;
            }
            if (settingName === "master_volume" || settingName === "music_volume") {
                applyBackgroundMusicVolume();
            }
            if (settingName === "master_volume" || settingName === "sound_effects_volume") {
                applySoundEffectsVolume();
            }
        });
        /* Called when the slider is released by the user. Then the setting name being changed is saved to settingName and so is the numerical
        value of the slider to newvalue. Then formData is given a FormData object which is then appended the setting name and value of the
        slider. Both values are then sent to the sidebar/settings/update POST route. So, the backend recieves the name of the setting and 
        the new value of the slide number value. The backend then sets the new value with setattr() and saves those changes to the database
        for the specified slider.  */
        slider.addEventListener("change", async function () {
            const settingName = slider.dataset.settingName;
            const newValue = slider.value;
            const formData = new FormData();
            formData.append("setting_name", settingName);
            formData.append("setting_value", newValue);
            try {
                const response = await fetch("/sidebar/settings/update", {method: "POST", body: formData});
                const result = await response.json();
                if (!result.success) {
                    alert("Failed to update volume.");
                }
            } catch (error) {
                console.error("Error:", error);
            }
        });
    });
});

// Promote to queen, knight, bisop, rook
window.speechChessPromoResolve = window.speechChessPromoResolve || null;

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
        window.speechChessPromoResolve = resolve;
        document.getElementById('promo-overlay').style.display = 'flex';
    });
}

function resolvePromotion(piece) {
    document.getElementById('promo-overlay').style.display = 'none';
    if (window.speechChessPromoResolve) window.speechChessPromoResolve(piece);
}

function ensureLegalMoveHighlightStyles() {
    if (document.getElementById("legal-move-highlight-styles")) return;

    const style = document.createElement("style");
    style.id = "legal-move-highlight-styles";
    style.textContent = `
        .legal-destination-square::after {
            content: "";
            position: absolute;
            inset: 43%;
            border-radius: 50%;
            background: rgba(40, 120, 220, 0.85);
            pointer-events: none;
            z-index: 2;
        }
    `;
    document.head.appendChild(style);
}

function getChessBoardElement(elementId) {
    if (elementId && typeof elementId !== "string") return elementId;

    const id = (elementId || "board").replace(/^#/, "");
    return document.getElementById(id);
}

function clearLegalMoveHighlights(elementId) {
    const boardElement = getChessBoardElement(elementId);
    if (!boardElement) return;

    boardElement.querySelectorAll(".legal-destination-square").forEach(square => {
        square.classList.remove("legal-destination-square");
    });
}

function highlightLegalMoveDestinations(elementId, legalMoves, source) {
    clearLegalMoveHighlights(elementId);
    if (!source || !Array.isArray(legalMoves)) return 0;

    const boardElement = getChessBoardElement(elementId);
    if (!boardElement) return 0;

    ensureLegalMoveHighlightStyles();

    const destinations = new Set();
    legalMoves.forEach(move => {
        if (typeof move === "string" && move.slice(0, 2) === source) {
            destinations.add(move.slice(2, 4));
        }
    });

    destinations.forEach(square => {
        const squareElement = boardElement.querySelector(`[data-square="${square}"]`);
        if (squareElement) {
            squareElement.classList.add("legal-destination-square");
        }
    });

    return destinations.size;
}


//Chess Board
function initChessGame(config) {
    const elementId  = config.elementId  || "board";
    const pieceTheme = config.pieceTheme || "/static/chess/img/chesspieces/wikipedia/{piece}.png";
    const onPromotion = config.onPromotion || (() => askPromotion());

    let currentFen = config.fen || "start";
    let legalMoves = Array.isArray(config.legalMoves) ? config.legalMoves : [];

    function toDisplayFen(fen) {
        if (!fen || fen === "start") return "start";
        return fen.includes(" ") ? fen.split(" ")[0] : fen;
    }

    function getLegalMoves() {
        if (typeof config.getLegalMoves === "function") {
            return config.getLegalMoves() || [];
        }

        return legalMoves;
    }

    function canShowLegalMoves(source, piece, position, orientation) {
        if (typeof config.canShowLegalMoves === "function") {
            return config.canShowLegalMoves(source, piece, position, orientation);
        }

        return true;
    }

    function handleDragStart(source, piece, position, orientation) {
        clearLegalMoveHighlights(elementId);

        if (typeof config.onDragStart === "function") {
            const result = config.onDragStart(source, piece, position, orientation);
            if (result === false) return false;
        }

        if (canShowLegalMoves(source, piece, position, orientation)) {
            highlightLegalMoveDestinations(elementId, getLegalMoves(), source);
        }
    }

    let movement = false;
    async function handleDrop(source, target, piece) {
        clearLegalMoveHighlights(elementId);
        if (!config.onDrop) return "snapback";

        const isWhitePawn = piece === "wP" && target[1] === "8";
        const isBlackPawn = piece === "bP" && target[1] === "1";

        let move = source + target;

        if (isWhitePawn || isBlackPawn) {
            const promoChoice = await onPromotion(isWhitePawn ? "white" : "black");
            move += promoChoice;
        }
        movement = true
        return config.onDrop(source, target, piece, move);
        movement = false
        return result;
    }

    const board = Chessboard(elementId, {
        draggable:  config.draggable !== false,
        position:   toDisplayFen(currentFen),
        orientation: config.orientation || "white",
        pieceTheme: pieceTheme,
        onDragStart: handleDragStart,
        onDrop:     handleDrop,
        onSnapEnd:  () => {
            clearLegalMoveHighlights(elementId);
            if (!movement) {
                board.position(toDisplayFen(currentFen));
            }
            if (typeof config.onSnapEnd === "function") {
                config.onSnapEnd();
            }
        }
    });

    return {
        setPosition(fen) {
            currentFen = fen || "start";
            clearLegalMoveHighlights(elementId);
            board.position(toDisplayFen(currentFen));
        },
        setLegalMoves(moves) {
            legalMoves = Array.isArray(moves) ? moves : [];
        },
        clearHighlights() {
            clearLegalMoveHighlights(elementId);
        },
        getBoard() {
            return board;
        }
    };
}

//refresh chess board
async function refreshSharedChessBoard() {
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
window.speechChessMoveSounds = window.speechChessMoveSounds || [
    new Audio('/static/sounds/ChessNoise1.mp3'),
    new Audio('/static/sounds/ChessNoise2.mp3')
];

function playMoveSound() {
    applySoundEffectsVolume();
    const moveSounds = window.speechChessMoveSounds || [];
    if (!moveSounds.length) return;

    const sound = moveSounds[Math.floor(Math.random() * moveSounds.length)];
    sound.currentTime = 0;
    sound.play();
}

//Background music
function startBackgroundMusic() {
    const music = document.getElementById("backgroundMusic");
    if (!music) return;
    applyBackgroundMusicVolume();
    music.play().catch(() => {});
}

//Timer
function startSharedTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (gameOver) { clearInterval(timerInterval); return; }
        timeLeft[currentTurn]--;
        updateSharedTimerDisplay();
        if (timeLeft[currentTurn] <= 0) {
            clearInterval(timerInterval);
            ws.send(JSON.stringify({ type: "leave", player: myColor }));
            endGame("Time's up! " + (myColor === currentTurn ? "You lost." : "You won!"));
        }
    }, 1000);
}

function updateSharedTimerDisplay() {
    document.getElementById("time-white").textContent = formatTime(timeLeft.white);
    document.getElementById("time-black").textContent = formatTime(timeLeft.black);
    document.getElementById("timer-white").classList.toggle("active-timer", currentTurn === "white");
    document.getElementById("timer-black").classList.toggle("active-timer", currentTurn === "black");
}