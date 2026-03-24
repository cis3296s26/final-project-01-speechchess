function toggleSubMenu(button){
    // Access the next element sibling, which is the submenu. Button and submenu are sibling elements as they're the same hierarchy level within the same li element.
    button.nextElementSibling.classList.toggle('show')
    // Rotate the svg arrow from down to up as the submenu is now open.
    button.classList.toggle('rotate')
} 

function getStarted(button){
    window.location.href = "/get_started"
}

function login(button){
    window.location.href = "/login"
}

function signUp(button){
    window.location.href = "/signup"
}

// All the calls for window redirection to the play directory html files
function play(button){
    window.location.href="play/play"
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
function puzzles(button){
    window.location.href="puzzles/puzzles"
}

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