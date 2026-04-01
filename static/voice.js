let recognition = null;
let voiceModeEnabled = false;
let suspendedForSpeech = false;
let pendingMove = null;
let awaitingMove = false;
let awaitingConfirmation = false;
let lastPrompt = "";

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
    if (field && field.value.trim()) {
        return field.value.trim();
    }
    return "";
}

function updateVoiceModeButton() {
    const button = document.getElementById("voiceModeButton");
    if (!button) {
        return;
    }

    button.innerText = voiceModeEnabled ? "Disable Voice Mode" : "Enable Voice Mode";
}

function speakText(text) {
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
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = function () {
        if (voiceModeEnabled) {
            suspendedForSpeech = false;
            startRecognition();
        }
    };
    window.speechSynthesis.speak(utterance);
}

function clearPendingMove() {
    pendingMove = null;
    awaitingMove = false;
    awaitingConfirmation = false;
}

function normalizeCommand(text) {
    return text.toLowerCase().trim();
}

function isWakePhrase(text) {
    return normalizeCommand(text).includes("speech chess");
}

function isSubmitCommand(text) {
    const normalized = normalizeCommand(text);
    return normalized.includes("submit move") || normalized === "submit";
}

function isConfirmCommand(text) {
    const normalized = normalizeCommand(text);
    return normalized === "confirm" || normalized === "yes";
}

function isCancelCommand(text) {
    const normalized = normalizeCommand(text);
    return normalized === "cancel" || normalized === "no";
}

function isRepeatCommand(text) {
    return normalizeCommand(text) === "repeat";
}

function isHelpCommand(text) {
    return normalizeCommand(text) === "help";
}

function startRecognition() {
    if (!voiceModeEnabled || recognition || !window.SpeechRecognition && !window.webkitSpeechRecognition) {
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.maxAlternatives = 3;

    recognition.onresult = async function (event) {
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
            if (!event.results[i].isFinal) {
                continue;
            }

            const transcript = event.results[i][0].transcript.trim();
            updateTranscriptField(transcript);
            await handleTranscript(transcript);
        }
    };

    recognition.onerror = function (event) {
        updateVoiceMessage(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = function () {
        recognition = null;
        if (voiceModeEnabled && !suspendedForSpeech) {
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

function toggleVoiceMode() {
    voiceModeEnabled = !voiceModeEnabled;
    updateVoiceModeButton();

    if (voiceModeEnabled) {
        clearPendingMove();
        startRecognition();
        speakText("Voice mode enabled. Say Speech Chess to begin your move.");
        return;
    }

    stopRecognition();
    suspendedForSpeech = false;
    window.speechSynthesis.cancel();
    clearPendingMove();
    updateVoiceMessage("Voice mode disabled.");
}

async function parseMoveTranscript(transcript) {
    const response = await fetch("/voice-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript })
    });

    return response.json();
}

async function submitPendingMove() {
    if (!pendingMove) {
        speakText("There is no pending move to submit.");
        return;
    }

    awaitingConfirmation = true;
    speakText(`Confirm move ${pendingMove.spoken}. Say confirm to play it, or cancel.`);
}

async function confirmPendingMove() {
    if (!pendingMove) {
        speakText("There is no pending move to confirm.");
        return;
    }

    const response = await fetch("/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ move: pendingMove.uci })
    });

    const data = await response.json();

    if (data.success) {
        if (typeof window.onVoiceMoveResult === "function") {
            window.onVoiceMoveResult(data, pendingMove.spoken);
        }

        const playedMove = data.spoken_text || pendingMove.spoken;
        clearPendingMove();
        speakText(`${playedMove}. ${data.turn} to move.`);
        return;
    }

    clearPendingMove();
    speakText(data.error || "That move could not be played.");
}

async function handleMoveTranscript(transcript) {
    const result = await parseMoveTranscript(transcript);

    if (result.status === "exact") {
        pendingMove = result.move;
        awaitingMove = false;
        awaitingConfirmation = false;
        speakText(`I heard ${result.move.spoken}. Say submit move when you are ready.`);
        return;
    }

    if (result.status === "ambiguous") {
        pendingMove = null;
        awaitingMove = true;
        awaitingConfirmation = false;
        speakText(result.prompt);
        return;
    }

    pendingMove = null;
    awaitingMove = true;
    awaitingConfirmation = false;
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
        speakText("Say Speech Chess, then say your move. Then say submit move, and finally say confirm.");
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
        await submitPendingMove();
        return;
    }

    if (isConfirmCommand(normalized)) {
        if (awaitingConfirmation) {
            await confirmPendingMove();
            return;
        }

        if (typeof window.onVoiceMoveResult === "function") {
            window.onVoiceMoveResult(data, lastTranscript);
        }
    } catch (error) {
        updateVoiceMessage(`Request failed: ${error.message}`);
        speakText("There is nothing waiting for confirmation.");
        return;
    }

    if (awaitingMove) {
        await handleMoveTranscript(transcript);
        return;
    }

    if (pendingMove && !awaitingConfirmation) {
        speakText("You already have a pending move. Say submit move, confirm, or cancel.");
        return;
    }
}

function startVoiceInput() {
    if (!voiceModeEnabled) {
        enableVoiceMode();
        speakText("Welcome to Speech Chess. Say Speech Chess, then your move, then submit move, then confirm.");
        return;
    }

    toggleVoiceMode();
}

async function submitVoiceMove() {
    const transcript = currentTranscript();
    if (!transcript) {
        updateVoiceMessage("Type a transcript or use voice mode first.");
        return;
    }

    await handleMoveTranscript(transcript);
}
