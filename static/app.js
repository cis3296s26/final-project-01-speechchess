function toggleSubMenu(button){
    // Access the next element sibling, which is the submenu. Button and submenu are sibling elements as they're the same hierarchy level within the same li element.
    button.nextElementSibling.classList.toggle('show')
    // Rotate the svg arrow from down to up as the submenu is now open.
    button.classList.toggle('rotate')
} 

function getStarted(button){
    window.location.href = "/getstarted"
}

function login(button){
    window.location.href = "/login"
}

function signUp(button){
    window.location.href = "/signup"
}

function play(button){
    window.location.href="/play"

}

function learn(button){
    window.location.href="/learn"
}

function puzzles(button){
    window.location.href="/puzzles"

}

