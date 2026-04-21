let recognition = null;
let mediaRecorder = null;
let mediaStream = null;
let recordingTimeout = null;
let discardCurrentCapture = false;
let voiceModeEnabled = false;
let suspendedForSpeech = false;
let pendingMove = null;
let pendingUndo = false;
let awaitingMove = false;
let parsingMove = false;
let lastPrompt = "";
let transcriptQueue = Promise.resolve();
let narratorEnabled = true;
let voiceInputEnabled = true;
let masterVolume = 50;
let narratorVolume = 50;
let transcriptionMode = "browser";
let speechPlaybackId = 0;
let backgroundMusicHeldForVoiceCommand = false;
let backgroundMusicWasPlaying = false;

const pendingMoveStorageKey = "speechChessPendingMove";
const captureLengthMs = 4000;

if (window.speechChessSettings) {
    narratorEnabled = window.speechChessSettings.narratorEnabled;
    voiceInputEnabled = window.speechChessSettings.voiceInputEnabled;
    masterVolume = window.speechChessSettings.masterVolume;
    narratorVolume = window.speechChessSettings.narratorVolume;
}

function backgroundMusicElement() {
    return document.getElementById("backgroundMusic");
}

function pauseBackgroundMusic() {
    const music = backgroundMusicElement();
    if (!music || music.paused) {
        return;
    }

    backgroundMusicWasPlaying = true;
    music.pause();
}

function resumeBackgroundMusic() {
    if (!backgroundMusicWasPlaying) {
        return;
    }

    backgroundMusicWasPlaying = false;
    const music = backgroundMusicElement();
    if (!music) {
        return;
    }

    music.play().catch(function () {
        return;
    });
}

function holdBackgroundMusicForVoiceCommand() {
    backgroundMusicHeldForVoiceCommand = true;
    pauseBackgroundMusic();
}

function releaseBackgroundMusicForVoiceCommand() {
    backgroundMusicHeldForVoiceCommand = false;
    resumeBackgroundMusic();
}

function updateVoiceMessage(message) {
    const output = document.getElementById("voiceMove");
    if (output) {
        output.innerText = message;
    }
}

function hasGameVoiceControls() {
    return Boolean(
        document.getElementById("voiceMove") &&
        document.getElementById("voiceTranscript") &&
        document.getElementById("voiceModeButton")
    );
}

function transcriptField() {
    return document.getElementById("voiceTranscript");
}

function updateTranscriptField(text) {
    const field = transcriptField();
    if (field) {
        field.value = text;
    }
}

function currentTranscript() {
    const field = transcriptField();
    return field ? field.value.trim() : "";
}

function updateVoiceModeButton() {
    const button = document.getElementById("voiceModeButton");
    if (button) {
        button.innerText = voiceModeEnabled ? "Stop Voice Session" : "Start Voice Session";
    }
}

function savePendingMove() {
    if (pendingMove) {
        sessionStorage.setItem(pendingMoveStorageKey, JSON.stringify(pendingMove));
    } else {
        sessionStorage.removeItem(pendingMoveStorageKey);
    }
}

function restorePendingMove() {
    if (pendingMove) {
        return pendingMove;
    }

    const stored = sessionStorage.getItem(pendingMoveStorageKey);
    if (!stored) {
        return null;
    }

    try {
        pendingMove = JSON.parse(stored);
        return pendingMove;
    } catch (error) {
        sessionStorage.removeItem(pendingMoveStorageKey);
        return null;
    }
}

function clearPendingMove() {
    pendingMove = null;
    awaitingMove = false;
    parsingMove = false;
    savePendingMove();
}

function clearVoiceMoveHighlightsIfAvailable() {
    if (typeof window.clearVoiceMoveHighlights === "function") {
        window.clearVoiceMoveHighlights();
    }
}

function canUseVoiceHighlights() {
    return typeof window.highlightLegalMovesForSquare === "function";
}

function voiceMovePrompt() {
    if (canUseVoiceHighlights()) {
        return "Say Speech Chess to begin your move, or highlight then location to show legal moves.";
    }

    return "Say Speech Chess to begin your move.";
}

function voiceHelpPrompt() {
    if (canUseVoiceHighlights()) {
        return "Say Speech Chess and your move together, like Speech Chess knight f 3. Say highlight then location to show legal moves. Then say submit move or confirm to play a move, or cancel.";
    }

    return "Say Speech Chess and your move together, like Speech Chess knight f 3. Then say submit move or confirm to play it, or cancel.";
}

function normalizeCommand(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function isWakePhrase(text) {
    const normalized = normalizeCommand(text);
    return (
        normalized.includes("speech chess") ||
        normalized.includes("speechchess") ||
        normalized.includes("speech chest") ||
        normalized.includes("speech test") ||
        normalized.includes("chess et")
    );
}

function isSubmitCommand(text) {
    const normalized = normalizeCommand(text);
    return (
        normalized.includes("submit move") ||
        normalized === "submit" ||
        normalized === "confirm" ||
        normalized.includes("confirm move")
    );
}

function isCancelCommand(text) {
    const normalized = normalizeCommand(text);
    return normalized === "no" || normalized.includes("cancel");
}

function isRepeatCommand(text) {
    return normalizeCommand(text) === "repeat";
}

function isUndoCommand(text) {
    const normalized = normalizeCommand(text);
    return normalized === "undo" || normalized === "undo move" || normalized === "undo last move";
}

function isHelpCommand(text) {
    return normalizeCommand(text) === "help";
}

function moveAfterWakePhrase(text) {
    const normalized = normalizeCommand(text);
    const prefixes = [
        "speech chess ",
        "speechchess ",
        "speech chest ",
        "speech test ",
        "chess et "
    ];

    for (const prefix of prefixes) {
        if (normalized.startsWith(prefix)) {
            return normalized.slice(prefix.length).trim();
        }
    }

    return "";
}

function normalizeSpokenSquareText(text) {
    const replacements = {
        "see": "c",
        "sea": "c",
        "cee": "c",
        "bee": "b",
        "be": "b",
        "dee": "d",
        "gee": "g",
        "aitch": "h",
        "age": "h",
        "won": "1",
        "one": "1",
        "two": "2",
        "too": "2",
        "to": "2",
        "three": "3",
        "free": "3",
        "four": "4",
        "for": "4",
        "five": "5",
        "six": "6",
        "seven": "7",
        "eight": "8",
        "ate": "8"
    };

    return normalizeCommand(text)
        .split(" ")
        .map(function (token) {
            return replacements[token] || token;
        })
        .join(" ")
        .replace(/\b([a-h])\s+([1-8])\b/g, "$1$2");
}

function highlightCommandInfo(text) {
    const commandText = moveAfterWakePhrase(text) || normalizeCommand(text);

    if (!/\bhighlight\b|\bhigh light\b/.test(commandText)) {
        return { isHighlight: false, square: null };
    }

    const normalized = normalizeSpokenSquareText(commandText);
    const cleaned = normalized.replace(
        /\b(highlight|high|light|legal|moves?|destinations?|piece|square|on|at|from|for|the|my|please)\b/g,
        " "
    );
    const match = cleaned.match(/\b([a-h][1-8])\b/);

    return {
        isHighlight: true,
        square: match ? match[1] : null
    };
}

function spokenSquare(square) {
    return `${square[0]} ${square[1]}`;
}

function hasBrowserSpeechRecognition() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function hasOpenAIAudioCapture() {
    return Boolean(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function preferredTranscriptionMode() {
    if (hasOpenAIAudioCapture()) {
        return "openai";
    }

    return "none";
}

function stopBrowserRecognition() {
    if (!recognition) {
        return;
    }

    try {
        recognition.stop();
    } catch (error) {
        return;
    }
}

function stopAudioCapture(discard = false) {
    discardCurrentCapture = discardCurrentCapture || discard;

    if (recordingTimeout) {
        clearTimeout(recordingTimeout);
        recordingTimeout = null;
    }

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        try {
            mediaRecorder.stop();
        } catch (error) {
            discardCurrentCapture = false;
        }
    }
}

function stopActiveListening(discard = false) {
    stopBrowserRecognition();
    stopAudioCapture(discard);
}

function speakText(text, options = {}) {
    if (!narratorEnabled) {
        updateVoiceMessage(text);
        if (options.releaseMusicHold === true) {
            releaseBackgroundMusicForVoiceCommand();
        } else if (!backgroundMusicHeldForVoiceCommand) {
            resumeBackgroundMusic();
        }

        if (voiceModeEnabled && !suspendedForSpeech) {
            setTimeout(startListeningMode, 0);
        }
        return;
    }

    const releaseMusicHold = options.releaseMusicHold === true;
    lastPrompt = text;
    updateVoiceMessage(text);
    pauseBackgroundMusic();

    const playbackId = ++speechPlaybackId;

    if (!("speechSynthesis" in window)) {
        if (voiceModeEnabled) {
            setTimeout(startListeningMode, 0);
        }

        if (releaseMusicHold) {
            releaseBackgroundMusicForVoiceCommand();
        } else if (!backgroundMusicHeldForVoiceCommand) {
            resumeBackgroundMusic();
        }
        return;
    }

    if (voiceModeEnabled) {
        suspendedForSpeech = true;
        stopActiveListening(true);
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = (narratorVolume / 100) * (masterVolume / 100);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = function () {
        if (playbackId !== speechPlaybackId) {
            return;
        }

        if (!voiceModeEnabled) {
            if (releaseMusicHold) {
                releaseBackgroundMusicForVoiceCommand();
            } else if (!backgroundMusicHeldForVoiceCommand) {
                resumeBackgroundMusic();
            }
            return;
        }

        suspendedForSpeech = false;
        startListeningMode();

        if (releaseMusicHold) {
            releaseBackgroundMusicForVoiceCommand();
        } else if (!backgroundMusicHeldForVoiceCommand) {
            resumeBackgroundMusic();
        }
    };
    utterance.onerror = utterance.onend;
    window.speechSynthesis.speak(utterance);
}

function speakStartupIntro() {
    const intro = canUseVoiceHighlights()
        ? "Welcome to Speech Chess. Say Speech Chess, then your move, then submit move. Say highlight then location to show legal moves."
        : "Welcome to Speech Chess. Say Speech Chess, then your move, then submit move.";
    updateVoiceMessage(intro);

    if (!narratorEnabled) {
        return Promise.resolve();
    }

    pauseBackgroundMusic();
    const playbackId = ++speechPlaybackId;

    if (!("speechSynthesis" in window)) {
        if (!backgroundMusicHeldForVoiceCommand) {
            resumeBackgroundMusic();
        }
        return Promise.resolve();
    }

    window.speechSynthesis.cancel();
    return new Promise(function (resolve) {
        const utterance = new SpeechSynthesisUtterance(intro);
        let settled = false;

        const finish = function () {
            if (settled) {
                return;
            }

            settled = true;
            if (playbackId === speechPlaybackId && !backgroundMusicHeldForVoiceCommand) {
                resumeBackgroundMusic();
            }
            resolve();
        };

        utterance.volume = (narratorVolume / 100) * (masterVolume / 100);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
        setTimeout(finish, 6000);
    });
}

function startBrowserRecognition() {
    if (!voiceInputEnabled) {
        updateVoiceMessage("Voice input is disabled in settings.");
        return;
    }

    if (!voiceModeEnabled || recognition || !hasBrowserSpeechRecognition()) {
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.maxAlternatives = 3;

    recognition.onresult = function (event) {
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
            if (!event.results[i].isFinal) {
                continue;
            }

            const transcript = event.results[i][0].transcript.trim();
            updateTranscriptField(transcript);
            transcriptQueue = transcriptQueue
                .then(function () {
                    return handleTranscript(transcript);
                })
                .catch(function () {
                    updateVoiceMessage("There was a problem handling that voice command.");
                });
        }
    };

    recognition.onerror = function (event) {
        updateVoiceMessage(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = function () {
        recognition = null;
        if (voiceModeEnabled && !suspendedForSpeech && transcriptionMode === "browser" && voiceInputEnabled) {
            startBrowserRecognition();
        }
    };

    recognition.start();
}

async function transcribeRecordedAudio(blob) {
    const formData = new FormData();
    formData.append("audio", blob, "speech-command.webm");

    const endpoint =
        window.speechChessTranscriptionEndpoint ||
        localStorage.getItem("speechChessTranscriptionEndpoint") ||
        "/voice-transcribe";
    const authToken =
        window.speechChessAuthToken ||
        localStorage.getItem("speechChessAuthToken");
    const headers = {};

    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: headers,
            body: formData
        });

        return response.json();
    } catch (error) {
        return {
            success: false,
            error: "Could not reach the transcription server."
        };
    }
}

window.speechChessTranscribeAudio = transcribeRecordedAudio;

async function startOpenAIAudioCapture() {
    if (!voiceInputEnabled) {
        updateVoiceMessage("Voice input is disabled in settings.");
        return;
    }

    if (!voiceModeEnabled || suspendedForSpeech || mediaRecorder || !hasOpenAIAudioCapture()) {
        return;
    }

    try {
        if (!mediaStream) {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
    } catch (error) {
        updateVoiceMessage("Microphone access was denied.");
        return;
    }

    const chunks = [];
    discardCurrentCapture = false;
    updateVoiceMessage("Listening...");

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "audio/webm";
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
    mediaRecorder.ondataavailable = function (event) {
        if (event.data && event.data.size > 0) {
            chunks.push(event.data);
        }
    };

    mediaRecorder.onerror = function () {
        mediaRecorder = null;
        updateVoiceMessage("There was a problem recording audio.");
    };

    mediaRecorder.onstop = async function () {
        recordingTimeout = null;
        const discard = discardCurrentCapture;
        discardCurrentCapture = false;
        mediaRecorder = null;

        if (!voiceModeEnabled || suspendedForSpeech || discard) {
            return;
        }

        if (!chunks.length) {
            speakText("No speech detected. Please try again.");
            return;
        }

        const result = await transcribeRecordedAudio(new Blob(chunks, { type: mimeType }));

        if (!result.success) {
            speakText(result.error || "OpenAI transcription is not available right now.");
            return;
        }

        const transcript = (result.transcript || "").trim();
        updateTranscriptField(transcript);

        if (!transcript) {
            speakText("No speech detected. Please try again.");
            return;
        }

        transcriptQueue = transcriptQueue
            .then(function () {
                return handleTranscript(transcript);
            })
            .catch(function () {
                updateVoiceMessage("There was a problem handling that voice command.");
            })
            .finally(function () {
                if (voiceModeEnabled && !suspendedForSpeech && transcriptionMode === "openai" && !mediaRecorder) {
                    startListeningMode();
                }
            });
    };

    mediaRecorder.start();
    recordingTimeout = setTimeout(function () {
        stopAudioCapture(false);
    }, captureLengthMs);
}

function startListeningMode() {
    if (!hasGameVoiceControls()) {
        return;
    }

    if (!voiceModeEnabled || suspendedForSpeech) {
        return;
    }

    if (transcriptionMode === "openai") {
        startOpenAIAudioCapture();
        return;
    }

    if (transcriptionMode === "browser") {
        startBrowserRecognition();
        return;
    }

    updateVoiceMessage("Voice transcription is not supported in this browser.");
}

function enableVoiceMode(announce = true) {
    if (!hasGameVoiceControls()) {
        return;
    }

    if (!voiceInputEnabled) {
        updateVoiceMessage("Voice input is disabled in settings.");
        return;
    }

    if (voiceModeEnabled) {
        return;
    }

    transcriptionMode = preferredTranscriptionMode();
    voiceModeEnabled = true;
    clearPendingMove();
    updateVoiceModeButton();

    if (announce) {
        speakText(`Voice mode enabled. ${voiceMovePrompt()}`);
    } else {
        updateVoiceMessage(`Voice mode enabled. ${voiceMovePrompt()}`);
        startListeningMode();
    }
}

function disableVoiceMode() {
    if (!voiceModeEnabled) {
        return;
    }

    voiceModeEnabled = false;
    suspendedForSpeech = false;
    stopActiveListening(true);
    backgroundMusicHeldForVoiceCommand = false;
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
    resumeBackgroundMusic();
    clearPendingMove();
    updateVoiceModeButton();
    updateVoiceMessage("Voice mode disabled.");
}

async function parseMoveTranscript(transcript) {
    if (typeof window.voiceParseTranscript === "function") {
        return window.voiceParseTranscript(transcript);
    }

    const response = await fetch("/voice-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript })
    });

    return response.json();
}

async function playPendingMove() {
    restorePendingMove();

    if (!pendingMove) {
        speakText("There is no pending move to submit.", { releaseMusicHold: true });
        return;
    }

    clearVoiceMoveHighlightsIfAvailable();
    updateVoiceMessage(`Playing ${pendingMove.spoken}...`);

    let data;
    try {
        if (typeof window.voiceSubmitPendingMove === "function") {
            data = await window.voiceSubmitPendingMove(pendingMove);
        } else {
            const response = await fetch("/move", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ move: pendingMove.uci })
            });
            data = await response.json();
        }
    } catch (error) {
        clearPendingMove();
        speakText("I could not send that move to the server.", { releaseMusicHold: true });
        return;
    }

    if (data.success) {
        if (typeof window.onVoiceMoveResult === "function") {
            await window.onVoiceMoveResult(data, pendingMove.spoken);
        }

        if (typeof window.refreshVoiceBoard === "function") {
            await window.refreshVoiceBoard();
        }

        const playedMove = data.spoken_text || pendingMove.spoken;
        clearPendingMove();
        speakText(`Played ${playedMove}. ${data.turn} to move.`, { releaseMusicHold: true });
        return;
    }

    clearPendingMove();
    speakText(data.error || "That move could not be played.", { releaseMusicHold: true });
}

function handleUndoCommand() {
    if (typeof window.voiceSubmitPendingUndo !== "function") {
        speakText("Undo is not available in this mode.", { releaseMusicHold: true });
        return;
    }

    clearPendingMove();
    clearVoiceMoveHighlightsIfAvailable();
    pendingUndo = true;
    speakText("I heard undo. Say confirm to undo, or cancel.");
}

async function playPendingUndo() {
    if (!pendingUndo) {
        speakText("There is no pending undo.", { releaseMusicHold: true });
        return;
    }

    if (typeof window.voiceSubmitPendingUndo !== "function") {
        pendingUndo = false;
        speakText("Undo is not available in this mode.", { releaseMusicHold: true });
        return;
    }

    updateVoiceMessage("Undoing last move...");

    let data;
    try {
        data = await window.voiceSubmitPendingUndo();
    } catch (error) {
        pendingUndo = false;
        speakText("I could not undo the move.", { releaseMusicHold: true });
        return;
    }

    pendingUndo = false;

    if (data && data.success) {
        const turnText = data.turn ? ` ${data.turn} to move.` : "";
        speakText(`Move undone.${turnText}`, { releaseMusicHold: true });
        return;
    }

    const message = (data && data.error) || "Nothing to undo.";
    speakText(message, { releaseMusicHold: true });
}

async function handleMoveTranscript(transcript) {
    parsingMove = true;
    clearVoiceMoveHighlightsIfAvailable();
    updateVoiceMessage(`Parsing move: ${transcript}`);

    let result;
    try {
        result = await parseMoveTranscript(transcript);
    } catch (error) {
        parsingMove = false;
        clearPendingMove();
        speakText("I could not understand that move right now.", { releaseMusicHold: true });
        return;
    }

    parsingMove = false;

    if (result.status === "exact") {
        pendingMove = result.move;
        savePendingMove();
        awaitingMove = false;
        speakText(`I heard ${result.move.spoken}. Say submit move or confirm to play it, or cancel.`);
        return;
    }

    pendingMove = null;
    savePendingMove();
    awaitingMove = result.status !== "invalid";
    speakText(result.prompt, {
        releaseMusicHold: !awaitingMove && !pendingMove
    });
}

async function handleHighlightTranscript(transcript) {
    const command = highlightCommandInfo(transcript);

    if (!command.isHighlight) {
        return false;
    }

    if (!canUseVoiceHighlights()) {
        return false;
    }

    clearPendingMove();

    if (!command.square) {
        updateVoiceMessage("Say highlight then location to show legal moves.");
        return true;
    }

    const count = window.highlightLegalMovesForSquare(command.square);

    if (count > 0) {
        const moveWord = count === 1 ? "move" : "moves";
        updateVoiceMessage(`Highlighted ${count} legal ${moveWord} from ${spokenSquare(command.square)}.`);
        return true;
    }

    updateVoiceMessage(`No legal moves are available from ${spokenSquare(command.square)}.`);
    return true;
}

async function handleTranscript(transcript) {
    const normalized = normalizeCommand(transcript);
    const wakeMove = moveAfterWakePhrase(transcript);
    updateVoiceMessage(`Heard: ${transcript}`);

    if (isRepeatCommand(normalized)) {
        if (lastPrompt) {
            speakText(lastPrompt);
        }
        return;
    }

    if (isHelpCommand(normalized)) {
        speakText(voiceHelpPrompt());
        return;
    }

    if (isCancelCommand(normalized)) {
        clearPendingMove();
        pendingUndo = false;
        clearVoiceMoveHighlightsIfAvailable();
        speakText("Cancelled. Say Speech Chess to start another move.", { releaseMusicHold: true });
        return;
    }

    if (await handleHighlightTranscript(transcript)) {
        return;
    }

    if (wakeMove) {
        clearVoiceMoveHighlightsIfAvailable();
        holdBackgroundMusicForVoiceCommand();
        clearPendingMove();
        pendingUndo = false;
        awaitingMove = false;
        if (isUndoCommand(wakeMove)) {
            handleUndoCommand();
            return;
        }
        await handleMoveTranscript(wakeMove);
        return;
    }

    if (isWakePhrase(normalized)) {
        clearVoiceMoveHighlightsIfAvailable();
        holdBackgroundMusicForVoiceCommand();
        clearPendingMove();
        pendingUndo = false;
        awaitingMove = true;
        speakText("Listening for your move.");
        return;
    }

    if (isSubmitCommand(normalized)) {
        if (parsingMove) {
            speakText("I am still processing your move. Please wait a moment.");
            return;
        }

        if (pendingUndo) {
            await playPendingUndo();
            return;
        }

        await playPendingMove();
        return;
    }

    if (awaitingMove) {
        if (isUndoCommand(transcript)) {
            awaitingMove = false;
            handleUndoCommand();
            return;
        }
        await handleMoveTranscript(transcript);
        return;
    }

    if (pendingUndo) {
        speakText("I still have a pending undo. Say confirm to undo, or cancel.");
        return;
    }

    if (pendingMove) {
        speakText(`I still have ${pendingMove.spoken}. Say submit move or confirm to play it, or cancel.`);
    }
}

function startVoiceInput() {
    if (!hasGameVoiceControls()) {
        return;
    }

    if (!voiceModeEnabled) {
        enableVoiceMode(true);
        return;
    }

    disableVoiceMode();
}

async function submitVoiceMove() {
    if (!hasGameVoiceControls()) {
        return;
    }

    const transcript = currentTranscript();
    if (!transcript) {
        updateVoiceMessage("Type a transcript or use voice mode first.");
        return;
    }

    if (await handleHighlightTranscript(transcript)) {
        return;
    }

    await handleMoveTranscript(transcript);
}

async function beginAutoIntroSession() {
    if (!hasGameVoiceControls()) {
        return;
    }

    if (!voiceInputEnabled) {
        updateVoiceMessage("Voice input is disabled in settings.");
        return;
    }

    if (voiceModeEnabled) {
        return;
    }

    transcriptionMode = preferredTranscriptionMode();
    voiceModeEnabled = true;
    clearPendingMove();
    updateVoiceModeButton();
    await speakStartupIntro();

    if (!voiceModeEnabled) {
        return;
    }

    updateVoiceMessage(`Voice mode enabled. ${voiceMovePrompt()}`);
    startListeningMode();
}

/* Allows for narration of html elements when they're hovered over. the narratable elements are those with data-narrate attribute and for 
each of those elements it converts the data-narrate content to text which then uses speakText() to actually have the narrator say it. 
addEventListener() runs when mouseenter (cursor hovers over) occurs, in which that function for, the element hovered over, runs and the 
narrator reads the text aloud. */
function attachHoverNarration(){
    const narratableElements = document.querySelectorAll("[data-narrate]");
    narratableElements.forEach(element => {
        element.addEventListener("mouseenter", function (){
            const text = element.dataset.narrate;
            if(text){
                speakText(text);
            }
        });
    });
}

// Announce the page messsage of elements with the data-page-message attribute. Return if there is none, otherwise, the announcer reads it aloud.
function announcePageMessage(){
    const pageMessageElement = document.querySelector("[data-page-message]");
    if(!pageMessageElement){
        return;
    }
    const message = pageMessageElement.dataset.pageMessage;
    if(message){
        speakText(message);
    }
    setTimeout(function (){
        speakText(message);
    }, 500);
}

// When the html has finished loading, run the narration on cursor hover function.
document.addEventListener("DOMContentLoaded", function (){
    attachHoverNarration();
    announcePageMessage();
});
