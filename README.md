# Speech Chess
Speech Chess is a web application that allows users to interract with a chess game purely through their voice. Especially for those who are either visually impaired or physically disabled but still want to engage with the game of chess, or those who want to multitask, this game presents a great oppurtunity.

![This is a screenshot.](/static/images/chess_board_cyan.png)
# How to run
This game is entirely run in a web browser. Just click the link and you can play right away! 

# How to contribute
Follow this project board to know the latest status of the project: [http://...]([http://...])  

### How to build
1. Download our repository as a zip file and extract it to desktop or desired location
2. Download python
3. Open Windows PowerShell
4. Enter: python -m pip install -r requirements.txt
5. Navigate to directory where the extracted folder for this project is located
6. Enter: python -m uvicorn main:app --reload or python main.py
7. Proceed to the link generated

# Player Requirements
A modern web browser, microphone access enabled

# Dev Requirements
- Python 3.8+
- Windows 10/11
- Microphone and speakers

# Test Usage

**Chess Demo:**

python Chess.py

**Alternative Webpage Demp:**

python -m uvicorn main:app --reload
Then proceed to the link generated in the terminal.

**Voice to Text:**

python Voice.py

Speak for 10 seconds. Text saves to `transcription_YYYYMMDD_HHMMSS.txt`

**Text to Speech:**

python TTS.py filename.txt

## Troubleshooting
- Module not found: Make sure packages are installed and VS Code is using the correct Python interpreter
- Voice.py errors: Speak clearly, reduce background noise, check microphone is working in Windows settings

# How to contribute
Follow this project board to know the latest status of the project: [https://github.com/orgs/cis3296s26/projects/29/views/1] 
 
# Sources & References
Useful FastAPI Info
-Simple FastAPI intro with examples and more information; https://fastapi.tiangolo.com/tutorial/first-steps/?utm_source=chatgpt.com#interactive-api-docs
-Information about template engines and the syntax to use Jinja2. This link is very helpful!; https://fastapi.tiangolo.com/advanced/templates/?utm_source=chatgpt.com
-Understand static files and the purpose of mounting; https://fastapi.tiangolo.com/tutorial/static-files/?utm_source=chatgpt.com#what-is-mounting
-Very useful with learning how to read setup and structure main.py and index.html; https://www.geeksforgeeks.org/python/fastapi-templates/

HTML
-Helpful to refer to general html document structure; https://www.w3schools.com/html/html_intro.asp
-Containers; https://www.w3schools.com/w3css/w3css_containers.asp
-Used as a temporary container; https://www.w3schools.com/w3css/4/w3.css

CSS
-Font family used; https://fonts.googleapis.com/css2?family=Poppins
-clamp() was used to dynamically allocate the gap between elements on the homepage depending on a user's screen size; https://css-tricks.com/almanac/functions/c/clamp/

YouTube
-Used to help setup a navigatable sidebar menu for the homepage; https://www.youtube.com/watch?v=R7b3OlEyqug.

ChatGPT
-Used ChatGPT to generate images used on the homepage. Provided the colors used for the homepage too so the images closely match the theme.