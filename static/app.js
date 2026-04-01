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
