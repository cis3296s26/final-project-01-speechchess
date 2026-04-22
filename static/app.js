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
let homepageMediaRecorder = null;
let homepageMediaStream = null;
let homepageCaptureTimeout = null;
let homepageVoiceInstructionsPlayed = false;
let homepageVoiceNavigationActive = false;
let homepageVoiceStep = "menu";
let homepageSelectedAiDifficulty = null;
let homepageRecognitionStarting = false;
let homepageRecognitionRestartTimer = null;
const homepageCaptureLengthMs = 3500;

function isHomepage() {
    return window.location.pathname === "/" || window.location.pathname === "";
}

function isSettingsPage() {
    return window.location.pathname === "/sidebar/settings";
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
    const message = "Voice navigation instructions. Press V once to activate menu voice control. Then say Play AI, Play Example, Play Online, Play a Friend, or Settings.";
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

function commandIncludesAny(command, phrases) {
    return phrases.some(function (phrase) {
        return command.includes(phrase);
    });
}

function difficultyFromCommand(command) {
    if (command.includes("easy")) return "easy";
    if (command.includes("medium")) return "medium";
    if (command.includes("hard")) return "hard";
    return null;
}

function isPlayAiCommand(command) {
    return commandIncludesAny(command, [
        "play ai",
        "play a i",
        "play artificial intelligence",
        "ai mode",
        "computer"
    ]);
}

function isPlayExampleCommand(command) {
    return commandIncludesAny(command, [
        "play example",
        "play locally",
        "play local",
        "local game",
        "play now"
    ]);
}

function isStartGameCommand(command) {
    return command === "play" || commandIncludesAny(command, [
        "start game",
        "start",
        "begin game",
        "begin"
    ]);
}

function isSettingsCommand(command) {
    return commandIncludesAny(command, [
        "settings",
        "setting",
        "open settings",
        "go to settings",
        "accessibility settings"
    ]);
}

function voiceNavigationTargetFromCommand(command) {
    if (commandIncludesAny(command, ["home", "go home", "main menu"])) {
        return { label: "home", url: "/" };
    }
    if (isPlayAiCommand(command)) {
        return { label: "Play AI", url: "/play/play_ai" };
    }
    if (isPlayExampleCommand(command)) {
        return { label: "Play Example", url: "/play/play" };
    }
    if (commandIncludesAny(command, ["play online", "online game"])) {
        return { label: "Play Online", url: "/play/play_online" };
    }
    if (commandIncludesAny(command, ["play friend", "play a friend", "multiplayer", "multi player", "friends"])) {
        return { label: "Play a Friend", url: "/play/play_friends" };
    }
    if (isSettingsCommand(command)) {
        return { label: "Settings", url: "/sidebar/settings" };
    }
    if (commandIncludesAny(command, ["faq", "frequently asked questions", "help page"])) {
        return { label: "FAQ", url: "/sidebar/faq" };
    }
    if (commandIncludesAny(command, ["learn", "learn page", "learn chess"])) {
        return { label: "Learn", url: "/sidebar/learn" };
    }
    if (commandIncludesAny(command, ["support", "support page"])) {
        return { label: "Support", url: "/sidebar/support" };
    }
    if (commandIncludesAny(command, ["stats", "statistics"])) {
        return { label: "Stats", url: "/play/stats" };
    }
    return null;
}

function navigateToVoiceTarget(target, statusUpdater) {
    if (!target) {
        return;
    }

    if (typeof statusUpdater === "function") {
        statusUpdater(`Opening ${target.label}.`);
    }
    if (typeof speakText === "function") {
        speakText(`Opening ${target.label}.`);
    }
    setTimeout(function () {
        window.location.href = target.url;
    }, 500);
}

function promptHomepageMenu(message) {
    updateHomepageVoiceStatus(message);
    if (typeof speakText === "function") {
        speakText(message);
    }
}

function scheduleHomepageMenuListening(delayMs = 900) {
    if (!homepageVoiceNavigationActive || !isHomepage()) {
        return;
    }

    if (homepageRecognitionRestartTimer) {
        clearTimeout(homepageRecognitionRestartTimer);
    }

    homepageRecognitionRestartTimer = setTimeout(function () {
        homepageRecognitionRestartTimer = null;
        if (homepageVoiceNavigationActive && !homepageMenuRecognition && !homepageRecognitionStarting) {
            startHomepageMenuVoiceControl(false);
        }
    }, delayMs);
}

async function transcribeHomepageAudio(blob) {
    if (typeof window.speechChessTranscribeAudio === "function") {
        return window.speechChessTranscribeAudio(blob);
    }

    const formData = new FormData();
    formData.append("audio", blob, "homepage-command.webm");

    try {
        const response = await fetch("/voice-transcribe", {
            method: "POST",
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

function stopHomepageCapture(discard = false) {
    if (homepageCaptureTimeout) {
        clearTimeout(homepageCaptureTimeout);
        homepageCaptureTimeout = null;
    }

    if (homepageMediaRecorder && homepageMediaRecorder.state !== "inactive") {
        homepageMediaRecorder._speechChessDiscard = discard;
        try {
            homepageMediaRecorder.stop();
        } catch (error) {
            homepageMediaRecorder = null;
        }
    }
}

function beginHomepageAiSelection(command) {
    homepageVoiceStep = "aiDifficulty";
    const difficulty = difficultyFromCommand(command);

    if (difficulty) {
        homepageSelectedAiDifficulty = difficulty;
        homepageVoiceStep = "aiStart";
        promptHomepageMenu(`${difficulty} difficulty selected. Say start game when you are ready.`);

        if (isStartGameCommand(command)) {
            launchAiFromHomepageVoice();
        }
        return;
    }

    promptHomepageMenu("Play AI selected. Say easy, medium, or hard.");
}

function launchAiFromHomepageVoice() {
    homepageVoiceNavigationActive = false;
    if (homepageRecognitionRestartTimer) {
        clearTimeout(homepageRecognitionRestartTimer);
        homepageRecognitionRestartTimer = null;
    }
    if (homepageMenuRecognition) {
        try {
            homepageMenuRecognition.stop();
        } catch (error) {
            // Page navigation is already happening, so stale recognition can be ignored.
        }
    }

    const difficulty = homepageSelectedAiDifficulty || "easy";
    sessionStorage.setItem("speechChessAiAutoStart", "1");
    sessionStorage.setItem("speechChessAiDifficulty", difficulty);
    updateHomepageVoiceStatus(`Opening Play AI on ${difficulty} difficulty.`);
    if (typeof speakText === "function") {
        speakText(`Opening Play AI on ${difficulty} difficulty.`);
    }

    setTimeout(function () {
        window.location.href = "/play/play_ai";
    }, 500);
}

function handleHomepageMenuCommand(transcript) {
    const command = normalizeHomepageCommand(transcript);
    updateHomepageVoiceStatus(`Heard: ${transcript}`);

    const navigationTarget = voiceNavigationTargetFromCommand(command);
    if (navigationTarget && navigationTarget.url !== "/play/play_ai" && homepageVoiceStep === "menu") {
        homepageVoiceNavigationActive = false;
        if (homepageRecognitionRestartTimer) {
            clearTimeout(homepageRecognitionRestartTimer);
            homepageRecognitionRestartTimer = null;
        }
        navigateToVoiceTarget(navigationTarget, updateHomepageVoiceStatus);
        return;
    }

    if (homepageVoiceStep === "aiDifficulty") {
        const difficulty = difficultyFromCommand(command);
        if (!difficulty) {
            promptHomepageMenu("Please say easy, medium, or hard.");
            scheduleHomepageMenuListening();
            return;
        }

        homepageSelectedAiDifficulty = difficulty;
        homepageVoiceStep = "aiStart";
        promptHomepageMenu(`${difficulty} difficulty selected. Say start game when you are ready.`);
        scheduleHomepageMenuListening();
        return;
    }

    if (homepageVoiceStep === "aiStart") {
        const difficulty = difficultyFromCommand(command);
        if (difficulty) {
            homepageSelectedAiDifficulty = difficulty;
            promptHomepageMenu(`${difficulty} difficulty selected. Say start game when you are ready.`);
            scheduleHomepageMenuListening();
            return;
        }

        if (isStartGameCommand(command)) {
            launchAiFromHomepageVoice();
            return;
        }

        promptHomepageMenu("Say start game to begin, or say easy, medium, or hard to change difficulty.");
        scheduleHomepageMenuListening();
        return;
    }

    if (isPlayExampleCommand(command)) {
        homepageVoiceNavigationActive = false;
        if (homepageRecognitionRestartTimer) {
            clearTimeout(homepageRecognitionRestartTimer);
            homepageRecognitionRestartTimer = null;
        }
        updateHomepageVoiceStatus("Opening Play Example.");
        if (typeof speakText === "function") {
            speakText("Opening Play Example.");
        }
        setTimeout(function () {
            window.location.href = "/play/play";
        }, 500);
        return;
    }

    if (isPlayAiCommand(command)) {
        beginHomepageAiSelection(command);
        scheduleHomepageMenuListening(1200);
        return;
    }

    if (isSettingsCommand(command)) {
        homepageVoiceNavigationActive = false;
        if (homepageRecognitionRestartTimer) {
            clearTimeout(homepageRecognitionRestartTimer);
            homepageRecognitionRestartTimer = null;
        }
        sessionStorage.setItem("speechChessSettingsVoiceStart", "1");
        updateHomepageVoiceStatus("Opening Settings.");
        if (typeof speakText === "function") {
            speakText("Opening Settings.");
        }
        setTimeout(function () {
            window.location.href = "/sidebar/settings";
        }, 500);
        return;
    }

    promptHomepageMenu("I heard " + transcript + ". Say Play AI, Play Example, Play Online, Play a Friend, or Settings.");
    scheduleHomepageMenuListening();
}

function startHomepageMenuVoiceControl(announce = true) {
    if (!isHomepage()) return;
    if (homepageMediaRecorder || homepageRecognitionStarting) {
        updateHomepageVoiceStatus("Menu voice control is already listening.");
        return;
    }

    if (typeof disableVoiceMode === "function") {
        disableVoiceMode();
    }

    homepageVoiceNavigationActive = true;
    updateHomepageVoiceStatus("Starting menu voice control...");

    if (!window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const message = "OpenAI voice navigation needs browser audio recording support.";
        updateHomepageVoiceStatus(message);
        if (typeof speakText === "function") {
            speakText(message);
        }
        return;
    }

    homepageRecognitionStarting = true;
    const startCapture = async function () {
        const chunks = [];

        try {
            if (!homepageMediaStream) {
                homepageMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
                ? "audio/ogg;codecs=opus"
                : "audio/webm";

            homepageMediaRecorder = new MediaRecorder(homepageMediaStream, { mimeType });
            homepageMediaRecorder._speechChessDiscard = false;
            homepageMediaRecorder.ondataavailable = function (event) {
                if (event.data && event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            homepageMediaRecorder.onerror = function () {
                homepageMediaRecorder = null;
                homepageRecognitionStarting = false;
                updateHomepageVoiceStatus("There was a problem recording menu audio.");
                scheduleHomepageMenuListening(1200);
            };

            homepageMediaRecorder.onstop = async function () {
                const discard = homepageMediaRecorder && homepageMediaRecorder._speechChessDiscard;
                homepageMediaRecorder = null;
                homepageRecognitionStarting = false;
                homepageCaptureTimeout = null;

                if (!homepageVoiceNavigationActive || discard) {
                    return;
                }

                if (!chunks.length) {
                    updateHomepageVoiceStatus("Still listening for a menu command...");
                    scheduleHomepageMenuListening(900);
                    return;
                }

                const result = await transcribeHomepageAudio(new Blob(chunks, { type: mimeType }));
                if (!result.success) {
                    updateHomepageVoiceStatus(result.error || "OpenAI transcription is not available right now.");
                    scheduleHomepageMenuListening(1400);
                    return;
                }

                const transcript = (result.transcript || "").trim();
                if (!transcript) {
                    updateHomepageVoiceStatus("Still listening for a menu command...");
                    scheduleHomepageMenuListening(900);
                    return;
                }

                handleHomepageMenuCommand(transcript);
            };

            homepageRecognitionStarting = false;
            homepageMediaRecorder.start();
            updateHomepageVoiceStatus("Menu voice control listening. Say Play AI, Play Example, Play Online, Play a Friend, or Settings.");
            homepageCaptureTimeout = setTimeout(function () {
                stopHomepageCapture(false);
            }, homepageCaptureLengthMs);
        } catch (error) {
            homepageMediaRecorder = null;
            homepageRecognitionStarting = false;
            homepageVoiceNavigationActive = false;
            updateHomepageVoiceStatus("Microphone access was blocked for menu voice control.");
            if (typeof speakText === "function") {
                speakText("Microphone access was blocked for menu voice control.");
            }
        }
    };

    if (announce) {
        const message = homepageVoiceStep === "menu"
            ? "Menu voice control activated. Say Play AI, Play Example, Play Online, Play a Friend, or Settings."
            : "Menu voice control listening.";
        updateHomepageVoiceStatus(message);
        if (typeof speakText === "function") {
            speakText("Voice control active.");
        }
    }

    setTimeout(startCapture, announce ? 900 : 0);
}

document.addEventListener("keydown", function (event) {
    if ((!isHomepage() && !isSettingsPage()) || isTypingTarget(event.target)) {
        return;
    }

    if (isHomepage() && event.code === "Space") {
        event.preventDefault();
        speakHomepageVoiceInstructions();
        return;
    }

    if ((event.key && event.key.toLowerCase() === "v") || event.code === "KeyV") {
        event.preventDefault();
        if (isSettingsPage()) {
            startSettingsVoiceControl();
            return;
        }

        homepageVoiceStep = "menu";
        homepageSelectedAiDifficulty = null;
        startHomepageMenuVoiceControl();
    }
});

window.startHomepageMenuVoiceControl = startHomepageMenuVoiceControl;

let settingsMediaRecorder = null;
let settingsMediaStream = null;
let settingsCaptureTimeout = null;
let settingsVoiceActive = false;
let settingsVoiceStarting = false;
let settingsVoiceRestartTimer = null;
const settingsCaptureLengthMs = 3600;

function updateSettingsVoiceStatus(message) {
    const status = document.getElementById("settingsVoiceStatus");
    if (status) {
        status.textContent = message;
    }
}

function numberFromSettingsCommand(command) {
    const digitMatch = command.match(/\b(\d{1,3})\b/);
    if (digitMatch) {
        return Math.max(0, Math.min(100, Number(digitMatch[1])));
    }

    if (command.includes("hundred")) {
        return 100;
    }

    const ones = {
        zero: 0, one: 1, two: 2, three: 3, four: 4,
        five: 5, six: 6, seven: 7, eight: 8, nine: 9
    };
    const teens = {
        ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
        fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19
    };
    const tens = {
        twenty: 20, thirty: 30, forty: 40, fourty: 40,
        fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
    };

    for (const [word, value] of Object.entries(teens)) {
        if (command.includes(word)) {
            return value;
        }
    }

    for (const [word, value] of Object.entries(tens)) {
        if (command.includes(word)) {
            const remainder = command.slice(command.indexOf(word) + word.length);
            for (const [oneWord, oneValue] of Object.entries(ones)) {
                if (oneValue > 0 && remainder.includes(oneWord)) {
                    return value + oneValue;
                }
            }
            return value;
        }
    }

    for (const [word, value] of Object.entries(ones)) {
        if (command.includes(word)) {
            return value;
        }
    }

    return null;
}

function volumeSettingFromCommand(command) {
    if (command.includes("master") || command.includes("all volume") || command.includes("all sound")) {
        return { key: "master_volume", label: "master volume" };
    }
    if (command.includes("narrator") || command.includes("narration")) {
        return { key: "narrator_volume", label: "narrator volume" };
    }
    if (command.includes("music") || command.includes("song") || command.includes("background")) {
        return { key: "music_volume", label: "music volume" };
    }
    if (command.includes("sound effect") || command.includes("effects") || command.includes("sfx") || command.includes("sound")) {
        return { key: "sound_effects_volume", label: "sound effects volume" };
    }
    return null;
}

function toggleSettingFromCommand(command) {
    if (command.includes("narrator") || command.includes("narration")) {
        return { key: "narrator_enabled", label: "narrator" };
    }
    if (command.includes("voice input") || command.includes("voice control") || command.includes("microphone")) {
        return { key: "voice_input_enabled", label: "voice input" };
    }
    return null;
}

function booleanValueFromCommand(command) {
    if (commandIncludesAny(command, ["turn on", "enable", "enabled", "activate"])) {
        return "true";
    }
    if (commandIncludesAny(command, ["turn off", "disable", "disabled", "deactivate"])) {
        return "false";
    }
    return null;
}

function applyLocalSettingsValue(settingName, value) {
    if (!window.speechChessSettings) {
        return;
    }

    const numericValue = Number(value);
    if (settingName === "master_volume") window.speechChessSettings.masterVolume = numericValue;
    if (settingName === "narrator_volume") window.speechChessSettings.narratorVolume = numericValue;
    if (settingName === "music_volume") window.speechChessSettings.musicVolume = numericValue;
    if (settingName === "sound_effects_volume") window.speechChessSettings.soundEffectsVolume = numericValue;
    if (settingName === "narrator_enabled") window.speechChessSettings.narratorEnabled = value === "true";
    if (settingName === "voice_input_enabled") window.speechChessSettings.voiceInputEnabled = value === "true";
}

async function saveSettingValue(settingName, settingValue) {
    const formData = new FormData();
    formData.append("setting_name", settingName);
    formData.append("setting_value", String(settingValue));
    const response = await fetch("/sidebar/settings/update", { method: "POST", body: formData });
    return response.json();
}

async function setVolumeByVoice(setting, value) {
    const slider = document.querySelector(`.volume_slider[data-setting-name="${setting.key}"]`);
    if (!slider) {
        return false;
    }

    slider.value = value;
    if (slider.nextElementSibling) {
        slider.nextElementSibling.textContent = value;
    }
    applyLocalSettingsValue(setting.key, value);
    if (setting.key === "master_volume" || setting.key === "music_volume") {
        applyBackgroundMusicVolume();
    }
    if (setting.key === "master_volume" || setting.key === "sound_effects_volume") {
        applySoundEffectsVolume();
    }

    const result = await saveSettingValue(setting.key, value);
    if (!result.success) {
        throw new Error("The server did not save the volume setting.");
    }

    return true;
}

async function setToggleByVoice(setting, value) {
    const button = document.querySelector(`.settings_toggle[data-setting-name="${setting.key}"]`);
    if (!button) {
        return false;
    }

    button.classList.toggle("enabled", value === "true");
    button.classList.toggle("disabled", value !== "true");
    button.textContent = value === "true" ? "Enabled" : "Disabled";
    applyLocalSettingsValue(setting.key, value);

    if (typeof narratorEnabled !== "undefined" && setting.key === "narrator_enabled") {
        narratorEnabled = value === "true";
    }
    if (typeof voiceInputEnabled !== "undefined" && setting.key === "voice_input_enabled") {
        voiceInputEnabled = value === "true";
    }

    const result = await saveSettingValue(setting.key, value);
    if (!result.success) {
        throw new Error("The server did not save the setting.");
    }

    return true;
}

async function handleSettingsVoiceCommand(transcript) {
    const command = normalizeHomepageCommand(transcript);
    updateSettingsVoiceStatus(`Heard: ${transcript}`);

    const navigationTarget = voiceNavigationTargetFromCommand(command);
    if (navigationTarget && navigationTarget.url !== window.location.pathname) {
        stopSettingsVoiceControl();
        navigateToVoiceTarget(navigationTarget, updateSettingsVoiceStatus);
        return;
    }

    const volumeSetting = volumeSettingFromCommand(command);
    const volumeValue = numberFromSettingsCommand(command);
    if (volumeSetting && volumeValue !== null) {
        try {
            await setVolumeByVoice(volumeSetting, volumeValue);
            const message = `Set ${volumeSetting.label} to ${volumeValue}.`;
            updateSettingsVoiceStatus(message);
            if (typeof speakText === "function") speakText(message);
        } catch (error) {
            updateSettingsVoiceStatus("I could not save that setting.");
            if (typeof speakText === "function") speakText("I could not save that setting.");
        }
        scheduleSettingsVoiceListening(2200);
        return;
    }

    const toggleSetting = toggleSettingFromCommand(command);
    const toggleValue = booleanValueFromCommand(command);
    if (toggleSetting && toggleValue !== null) {
        try {
            await setToggleByVoice(toggleSetting, toggleValue);
            const message = `${toggleSetting.label} ${toggleValue === "true" ? "enabled" : "disabled"}.`;
            updateSettingsVoiceStatus(message);
            if (typeof speakText === "function") speakText(message);
        } catch (error) {
            updateSettingsVoiceStatus("I could not save that setting.");
            if (typeof speakText === "function") speakText("I could not save that setting.");
        }
        scheduleSettingsVoiceListening(2200);
        return;
    }

    const message = "Say commands like set sound to 45, set music to 30, enable narrator, or disable voice input.";
    updateSettingsVoiceStatus(message);
    scheduleSettingsVoiceListening(1200);
}

function stopSettingsCapture(discard = false) {
    if (settingsCaptureTimeout) {
        clearTimeout(settingsCaptureTimeout);
        settingsCaptureTimeout = null;
    }
    if (settingsMediaRecorder && settingsMediaRecorder.state !== "inactive") {
        settingsMediaRecorder._speechChessDiscard = discard;
        settingsMediaRecorder.stop();
    }
}

function stopSettingsVoiceControl() {
    settingsVoiceActive = false;
    settingsVoiceStarting = false;
    if (settingsVoiceRestartTimer) {
        clearTimeout(settingsVoiceRestartTimer);
        settingsVoiceRestartTimer = null;
    }
    stopSettingsCapture(true);
}

function scheduleSettingsVoiceListening(delayMs = 900) {
    if (!settingsVoiceActive || !isSettingsPage()) {
        return;
    }
    if (settingsVoiceRestartTimer) {
        clearTimeout(settingsVoiceRestartTimer);
    }
    settingsVoiceRestartTimer = setTimeout(function () {
        settingsVoiceRestartTimer = null;
        if (settingsVoiceActive && !settingsMediaRecorder && !settingsVoiceStarting) {
            startSettingsVoiceControl(false);
        }
    }, delayMs);
}

function startSettingsVoiceControl(announce = true) {
    if (!isSettingsPage()) return;
    if (settingsMediaRecorder || settingsVoiceStarting) {
        updateSettingsVoiceStatus("Settings voice control is already listening.");
        return;
    }

    settingsVoiceActive = true;
    updateSettingsVoiceStatus("Starting settings voice control...");

    if (!window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const message = "OpenAI voice settings needs browser audio recording support.";
        updateSettingsVoiceStatus(message);
        if (typeof speakText === "function") speakText(message);
        return;
    }

    settingsVoiceStarting = true;
    const startCapture = async function () {
        const chunks = [];
        try {
            if (!settingsMediaStream) {
                settingsMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
                ? "audio/ogg;codecs=opus"
                : "audio/webm";

            settingsMediaRecorder = new MediaRecorder(settingsMediaStream, { mimeType });
            settingsMediaRecorder._speechChessDiscard = false;
            settingsMediaRecorder.ondataavailable = function (event) {
                if (event.data && event.data.size > 0) {
                    chunks.push(event.data);
                }
            };
            settingsMediaRecorder.onerror = function () {
                settingsMediaRecorder = null;
                settingsVoiceStarting = false;
                updateSettingsVoiceStatus("There was a problem recording settings audio.");
                scheduleSettingsVoiceListening(1200);
            };
            settingsMediaRecorder.onstop = async function () {
                const discard = settingsMediaRecorder && settingsMediaRecorder._speechChessDiscard;
                settingsMediaRecorder = null;
                settingsVoiceStarting = false;
                settingsCaptureTimeout = null;

                if (!settingsVoiceActive || discard) {
                    return;
                }
                if (!chunks.length) {
                    updateSettingsVoiceStatus("Still listening for a settings command...");
                    scheduleSettingsVoiceListening(800);
                    return;
                }

                const result = await transcribeHomepageAudio(new Blob(chunks, { type: mimeType }));
                if (!result.success) {
                    updateSettingsVoiceStatus(result.error || "OpenAI transcription is not available right now.");
                    scheduleSettingsVoiceListening(1400);
                    return;
                }

                const transcript = (result.transcript || "").trim();
                if (!transcript) {
                    updateSettingsVoiceStatus("Still listening for a settings command...");
                    scheduleSettingsVoiceListening(800);
                    return;
                }

                await handleSettingsVoiceCommand(transcript);
            };

            settingsVoiceStarting = false;
            settingsMediaRecorder.start();
            updateSettingsVoiceStatus("Settings voice control listening. Try: set sound to 45.");
            settingsCaptureTimeout = setTimeout(function () {
                stopSettingsCapture(false);
            }, settingsCaptureLengthMs);
        } catch (error) {
            settingsMediaRecorder = null;
            settingsVoiceStarting = false;
            settingsVoiceActive = false;
            updateSettingsVoiceStatus("Microphone access was blocked for settings voice control.");
            if (typeof speakText === "function") speakText("Microphone access was blocked for settings voice control.");
        }
    };

    if (announce) {
        const message = "Settings voice control active. Say commands like set sound to 45, set music to 30, enable narrator, or disable voice input.";
        updateSettingsVoiceStatus(message);
        if (typeof speakText === "function") speakText("Settings voice control active.");
    }

    setTimeout(startCapture, announce ? 1700 : 0);
}

window.startSettingsVoiceControl = startSettingsVoiceControl;

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

    if (isSettingsPage() && sessionStorage.getItem("speechChessSettingsVoiceStart") === "1") {
        sessionStorage.removeItem("speechChessSettingsVoiceStart");
        setTimeout(function () {
            startSettingsVoiceControl();
        }, 2600);
    }
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
