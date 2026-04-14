let recognition = null;
let mediaRecorder = null;
let mediaStream = null;
let recordingTimeout = null;
let discardCurrentCapture = false;
let voiceModeEnabled = false;
let suspendedForSpeech = false;
let pendingMove = null;
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

// If the global object exists then keep those settings and set the local variables to them. Else, keep them set to default values.
if (window.speechChessSettings) {
    narratorEnabled = window.speechChessSettings.narratorEnabled;
    voiceInputEnabled = window.speechChessSettings.voiceInputEnabled;
    masterVolume = window.speechChessSettings.masterVolume;
    narratorVolume = window.speechChessSettings.narratorVolume;
}

function updateVoiceMessage(message) {
    const output = document.getElementById("voiceMove");
    if (output) {
        output.innerText = message;
    }
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
    return normalized.includes("submit move") || normalized === "submit" || normalized === "confirm" || normalized.includes("confirm move");
}

function isCancelCommand(text) {
    const normalized = normalizeCommand(text);
    return normalized === "no" || normalized.includes("cancel");
}

function isRepeatCommand(text) {
    return normalizeCommand(text) === "repeat";
}

function isHelpCommand(text) {
    return normalizeCommand(text) === "help";
}

function moveAfterWakePhrase(text) {
    const normalized = normalizeCommand(text);

    if (normalized.startsWith("speech chess ")) {
        return normalized.slice("speech chess ".length).trim();
    }

    if (normalized.startsWith("speechchess ")) {
        return normalized.slice("speechchess ".length).trim();
    }

    if (normalized.startsWith("speech chest ")) {
        return normalized.slice("speech chest ".length).trim();
    }

    if (normalized.startsWith("speech test ")) {
        return normalized.slice("speech test ".length).trim();
    }

    if (normalized.startsWith("chess et ")) {
        return normalized.slice("chess et ".length).trim();
    }

    return "";
}

function hasBrowserSpeechRecognition() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function hasOpenAIAudioCapture() {
    return Boolean(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function preferredTranscriptionMode() {
    if (window.speechChessTranscriptionMode === "browser") {
        return "browser";
    }

    if (window.speechChessTranscriptionMode === "openai" && hasOpenAIAudioCapture()) {
        return "openai";
    }

    if (hasOpenAIAudioCapture()) {
        return "openai";
    }

    if (hasBrowserSpeechRecognition()) {
        return "browser";
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
    utterance.volume = (narratorVolume/100) * (masterVolume/100);
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
    const intro = "Welcome to Speech Chess. Say Speech Chess, then your move, then submit move.";
    updateVoiceMessage(intro);
    if(!narratorEnabled) {
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
        utterance.volume = (narratorVolume/100) * (masterVolume/100);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
        setTimeout(finish, 6000);
    });
}

function startRecognition() {
    if(!voiceInputEnabled) {
        updateVoiceMessage("Voice input is disabled in settings.");
        return;
    }
    if(!voiceModeEnabled || recognition || (!window.SpeechRecognition && !window.webkitSpeechRecognition)) {
function startBrowserRecognition() {
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
            if(voiceModeEnabled && !suspendedForSpeech && voiceInputEnabled) {
                startRecognition();
            }
        };
        recognition.start();
    }   
}
    
function stopRecognition() {
    if (recognition) {
        recognition.stop();
    }
    recognition = null;
    };

    recognition.onerror = function (event) {
        updateVoiceMessage(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = function () {
        recognition = null;
        if (voiceModeEnabled && !suspendedForSpeech && transcriptionMode === "browser") {
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
            "success": false,
            "error": "Could not reach the transcription server."
        };
    }
}

async function startOpenAIAudioCapture() {
    if (!voiceModeEnabled || suspendedForSpeech || mediaRecorder || !hasOpenAIAudioCapture()) {
        return;
    }

    try {
        if (!mediaStream) {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
    } catch (error) {
        updateVoiceMessage("Microphone access was denied.");
        if (hasBrowserSpeechRecognition()) {
            transcriptionMode = "browser";
            speakText("Microphone recording was blocked. Falling back to browser speech recognition.");
        }
        return;
    }

    const chunks = [];
    discardCurrentCapture = false;
    updateVoiceMessage("Listening...");

    mediaRecorder = new MediaRecorder(mediaStream);
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

        const result = await transcribeRecordedAudio(new Blob(chunks, { type: "audio/webm" }));

        if (!result.success) {
            if (result.fallback_to_browser && hasBrowserSpeechRecognition()) {
                transcriptionMode = "browser";
                speakText("OpenAI transcription is not available right now. Falling back to browser speech recognition.");
                return;
            }

            speakText(result.error || "I could not transcribe that audio.");
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
    if(!voiceInputEnabled) {
        updateVoiceMessage("Voice input is disabled in settings.");
        return;
    }
    if(!voiceModeEnabled) {
        enableVoiceMode(true);
        return;
    }

    transcriptionMode = preferredTranscriptionMode();
    voiceModeEnabled = true;
    clearPendingMove();
    updateVoiceModeButton();
    if (announce) {
        speakText("Voice mode enabled. Say Speech Chess to begin your move.");
    } else {
        updateVoiceMessage("Voice mode enabled. Say Speech Chess to begin your move.");
        startListeningMode();
    }
    startRecognition();
    updateVoiceMessage("Voice mode enabled. Say Speech Chess to begin your move.");
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

async function handleMoveTranscript(transcript) {
    parsingMove = true;
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
        speakText("Say Speech Chess and your move together, like Speech Chess knight f 3. Then say submit move or confirm to play it, or cancel.");
        return;
    }

    if (isCancelCommand(normalized)) {
        clearPendingMove();
        speakText("Cancelled. Say Speech Chess to start another move.", { releaseMusicHold: true });
        return;
    }

    if (wakeMove) {
        holdBackgroundMusicForVoiceCommand();
        clearPendingMove();
        awaitingMove = false;
        await handleMoveTranscript(wakeMove);
        return;
    }

    if (isWakePhrase(normalized)) {
        holdBackgroundMusicForVoiceCommand();
        clearPendingMove();
        awaitingMove = true;
        speakText("Listening for your move.");
        return;
    }

    if (isSubmitCommand(normalized)) {
        if (parsingMove) {
            speakText("I am still processing your move. Please wait a moment.");
            return;
        }

        await playPendingMove();
        return;
    }

    if (awaitingMove) {
        await handleMoveTranscript(transcript);
        return;
    }

    if (pendingMove) {
        speakText(`I still have ${pendingMove.spoken}. Say submit move or confirm to play it, or cancel.`);
    }
}

function startVoiceInput() {
    if(!voiceInputEnabled) {
        updateVoiceMessage("Voice input is disabled in settings.");
        return;
    }
    if(!voiceModeEnabled) {
        enableVoiceMode(true);
        return;
    }
    disableVoiceMode();
}

async function submitVoiceMove() {
    const transcript = currentTranscript();
    if (!transcript) {
        updateVoiceMessage("Type a transcript or use voice mode first.");
        return;
    }
    await handleMoveTranscript(transcript);
}

async function beginAutoIntroSession() {
    if (!voiceInputEnabled) {
        updateVoiceMessage("Voice input is disabled in settings.");
        return;
    }if(voiceModeEnabled) {
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
    startRecognition();

    updateVoiceMessage("Voice mode enabled. Say Speech Chess to begin your move.");
    startListeningMode();
}

/* Allows for narration of html elements when they're hovered over. the narratable elements are those with data-narrate attribute and for 
each of those elements it converts the data-narrate content to text which then uses speakText() to actually have the narrator say it. 
addEventListener() runs when mouseenter (cursor hovers over) occurs, in which that function for, the element hovered over, runs and the 
narrator reads the text aloud. */
function attachHoverNarration() {
    const narratableElements = document.querySelectorAll("[data-narrate]");
    narratableElements.forEach(element => {
        element.addEventListener("mouseenter", function () {
            const text = element.dataset.narrate;
            if(text) {
                speakText(text);
            }
        });
    });
}

// When the html has finished loading, run the narration on cursor hover function.
document.addEventListener("DOMContentLoaded", function () {
    attachHoverNarration();
});