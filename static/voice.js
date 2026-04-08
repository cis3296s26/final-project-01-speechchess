let recognition = null;
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

const pendingMoveStorageKey = "speechChessPendingMove";

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
    if (!field) {
        return "";
    }

    return field.value.trim();
}

function updateVoiceModeButton() {
    const button = document.getElementById("voiceModeButton");
    if (!button) {
        return;
    }

    button.innerText = voiceModeEnabled ? "Stop Voice Session" : "Start Voice Session";
}

function savePendingMove() {
    if (pendingMove) {
        sessionStorage.setItem(pendingMoveStorageKey, JSON.stringify(pendingMove));
        return;
    }

    sessionStorage.removeItem(pendingMoveStorageKey);
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
    return normalizeCommand(text).includes("speech chess");
}

function isSubmitCommand(text) {
    const normalized = normalizeCommand(text);
    return normalized.includes("submit move") || normalized === "submit";
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

function speakText(text) {
    if(!narratorEnabled) {
        return;
    }

    lastPrompt = text;
    updateVoiceMessage(text);

    if (!("speechSynthesis" in window)) {
        return;
    }

    if (voiceModeEnabled && recognition) {
        suspendedForSpeech = true;
        recognition.stop();
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = (narratorVolume/100) * (masterVolume/100);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = function () {
        if (voiceModeEnabled) {
            suspendedForSpeech = false;
            startRecognition();
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
    if (!("speechSynthesis" in window)) {
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
    
function stopRecognition() {
    if (recognition) {
        recognition.stop();
    }
    recognition = null;
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
    voiceModeEnabled = true;
    clearPendingMove();
    updateVoiceModeButton();
    if (announce) {
        speakText("Voice mode enabled. Say Speech Chess to begin your move.");
        return;
    }
    startRecognition();
    updateVoiceMessage("Voice mode enabled. Say Speech Chess to begin your move.");
}


function disableVoiceMode() {
    if (!voiceModeEnabled) {
        return;
    }

    voiceModeEnabled = false;
    stopRecognition();
    suspendedForSpeech = false;
    window.speechSynthesis.cancel();
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
        speakText("There is no pending move to submit.");
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
        speakText("I could not send that move to the server.");
        return;
    }

    if (data.success) {
        if (typeof window.onVoiceMoveResult === "function") {
            await window.onVoiceMoveResult(data, pendingMove.spoken);
        }

        if (typeof window.refreshVoiceBoard === "function") {
            await window.refreshVoiceBoard();
        }

        const playedMove = pendingMove.spoken;
        clearPendingMove();
        speakText(`Played ${playedMove}. ${data.turn} to move.`);
        return;
    }

    clearPendingMove();
    speakText(data.error || "That move could not be played.");
}

async function handleMoveTranscript(transcript) {
    parsingMove = true;
    updateVoiceMessage(`Parsing move: ${transcript}`);

    const result = await parseMoveTranscript(transcript);
    parsingMove = false;

    if (result.status === "exact") {
        pendingMove = result.move;
        savePendingMove();
        awaitingMove = false;
        speakText(`I heard ${result.move.spoken}. Say submit move to play it, or cancel.`);
        return;
    }

    pendingMove = null;
    savePendingMove();
    awaitingMove = result.status !== "invalid";
    speakText(result.prompt);
}

async function handleTranscript(transcript) {
    const normalized = normalizeCommand(transcript);
    updateVoiceMessage(`Heard: ${transcript}`);

    if (isRepeatCommand(normalized)) {
        if (lastPrompt) {
            speakText(lastPrompt);
        }
        return;
    }

    if (isHelpCommand(normalized)) {
        speakText("Say Speech Chess, then say your move. Then say submit move to play it, or cancel.");
        return;
    }

    if (isCancelCommand(normalized)) {
        clearPendingMove();
        speakText("Cancelled. Say Speech Chess to start another move.");
        return;
    }

    if (isWakePhrase(normalized)) {
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
        speakText(`I still have ${pendingMove.spoken}. Say submit move to play it, or cancel.`);
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
    voiceModeEnabled = true;
    clearPendingMove();
    updateVoiceModeButton();
    await speakStartupIntro();
    if (!voiceModeEnabled) {
        return;
    }
    startRecognition();
    updateVoiceMessage("Voice mode enabled. Say Speech Chess to begin your move.");
}