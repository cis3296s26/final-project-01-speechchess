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
            if (button.classList.contains("enabled")) {
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
        // Runs every time the slider moves to update the number live. Updates the database too.
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