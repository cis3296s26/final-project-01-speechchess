let lastTranscript = "";

function updateVoiceMessage(message) {
    const output = document.getElementById("voiceMove");
    if (output) {
        output.innerText = message;
    }
}

function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        updateVoiceMessage("Speech recognition is not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    updateVoiceMessage("Listening...");

    recognition.onresult = function (event) {
        lastTranscript = event.results[0][0].transcript.trim();
        updateVoiceMessage(`Heard: ${lastTranscript}`);
    };

    recognition.onerror = function (event) {
        updateVoiceMessage(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = function () {
        if (!lastTranscript) {
            updateVoiceMessage("No speech detected. Try again.");
        }
    };

    recognition.start();
}

async function submitVoiceMove() {
    if (!lastTranscript) {
        updateVoiceMessage("Record a move before submitting.");
        return;
    }

    try {
        const response = await fetch("/voice-move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript: lastTranscript })
        });

        const data = await response.json();

        if (data.success) {
            updateVoiceMessage(`Heard: ${lastTranscript}\nPlayed: ${data.message}`);
        } else {
            updateVoiceMessage(`Heard: ${lastTranscript}\nError: ${data.error}`);
        }

        if (typeof window.onVoiceMoveResult === "function") {
            window.onVoiceMoveResult(data, lastTranscript);
        }
    } catch (error) {
        updateVoiceMessage(`Request failed: ${error.message}`);
    }
}
