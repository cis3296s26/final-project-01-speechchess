function toggleSubMenu(button){
    // Access the next element sibling, which is the submenu. Button and submenu are sibling elements as they're the same hierarchy level within the same li element.
    button.nextElementSibling.classList.toggle('show')
    // Rotate the svg arrow from down to up as the submenu is now open.
    button.classList.toggle('rotate')
} 

function getStarted(button){
    // Access the next element sibling, which will be the redirection to sign up or log in. They should be the same hierarchy level within the same li element. 
    button.redirectGetStarted
    window.location.href = "http://www.w3schools.com"
}

function login(button){
    button.redirectedLogin
    window.location.href = "http://www.w3schools.com"
}

function signUp(button){
    button.redirectedSignUp
    window.location.href = "http://www.w3schools.com"
}