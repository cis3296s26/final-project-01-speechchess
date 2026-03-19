# Speech Chess
Speech Chess is a web application that allows users to interract with a chess game purely through their voice. Especially for those who are either visually impaired or physically disabled but still want to engage with the game of chess, or those who want to multitask, this game presents a great oppurtunity.  

![This is a screenshot.](images.png)
# How to run
This game is entirely run in a web browser. Just click the link and you can play right away! 

# How to contribute
Follow this project board to know the latest status of the project: [http://...]([http://...])  

### How to build

- python -m pip install chess SpeechRecognition sounddevice numpy pyttsx3 pygame jinja2 uvicorn fastapi
- Use preferred IDE

- Use this github repository: ... 
- Specify what branch to use for a more stable release or for cutting edge development.  
- Use InteliJ 11
- Specify additional library to download if needed 
- What file and target to compile and run. 
- What is expected to happen when the app start. 

# Sources
YouTube
-Used to help setup a navigatable sidebar menu for the homepage; https://www.youtube.com/watch?v=R7b3OlEyqug.

Useful FastAPI Info
-Simple FastAPI intro with examples and more information; https://fastapi.tiangolo.com/tutorial/first-steps/?utm_source=chatgpt.com#interactive-api-docs
-Information about template engines and the syntax to use Jinja2. This link is very helpful!; https://fastapi.tiangolo.com/advanced/templates/?utm_source=chatgpt.com
-Really helped to understand static files and the purpose of mounting; https://fastapi.tiangolo.com/tutorial/static-files/?utm_source=chatgpt.com#what-is-mounting
-Very useful with learning how to initially setup and structure main.py and index.html. Unfortunately, had already structured a lot of both files before finding this page; https://www.geeksforgeeks.org/python/fastapi-templates/

HTML
-Helpful to refer to general html document structure; https://www.w3schools.com/html/html_intro.asp
-Learned about containers; https://www.w3schools.com/w3css/w3css_containers.asp
-Used as a temporary container; https://www.w3schools.com/w3css/4/w3.css

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
 
