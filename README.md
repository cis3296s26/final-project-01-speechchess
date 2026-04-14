# Speech Chess
Speech Chess is a web application that allows users to interact with chess through voice controls, text-to-speech feedback, and standard board interaction. The project supports example play, play vs AI, and play-a-friend multiplayer.

![This is a screenshot.](/static/images/chess_board_cyan.png)

## Hosted site
If the Render deployment is already running, users can open the hosted site and use it directly:

- [Speech Chess on Render](https://final-project-01-speechchess-7fmh.onrender.com)

## Render setup for OpenAI voice transcription
The deployed site should use Render environment variables for OpenAI. The OpenAI API key should never be committed to the repository or added to frontend code.

### Required environment variables in Render
Add these in the Render dashboard for the web service:

- `OPENAI_API_KEY`
- `OPENAI_TRANSCRIBE_MODEL`

Recommended value:

- `OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe`

### Render service settings
This repository includes [render.yaml](/C:/Users/ctsmi/Downloads/final-project-01-speechchess/render.yaml) with the expected service settings:

- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

If you configure the service manually in Render, use the same values.

## Local development
### How to build
1. Download the repository and extract it to your desktop or another desired location.
2. Install Python.
3. Open Windows PowerShell.
4. Run: `python -m pip install -r requirements.txt`
5. Navigate to the project folder.
6. Run: `python -m uvicorn main:app --reload`
7. Open the generated local URL in your browser.

### Local OpenAI testing
If you want OpenAI voice transcription while running the site locally, set the environment variable before starting the server:

```powershell
$env:OPENAI_API_KEY="your_real_openai_key"
$env:OPENAI_TRANSCRIBE_MODEL="gpt-4o-mini-transcribe"
python -m uvicorn main:app --reload
```

If `OPENAI_API_KEY` is not set, the voice flow will fall back to browser speech recognition where available.

## Player requirements
- A modern web browser
- Microphone access enabled
- Speakers or headphones for text-to-speech and sound effects

## Dev requirements
- Python 3.8+
- Windows 10/11
- Microphone and speakers

## Troubleshooting
- `OpenAI transcription is not available`: check that `OPENAI_API_KEY` is set on the running backend.
- Voice falls back to browser recognition: this usually means OpenAI is not configured on the backend or the backend cannot reach OpenAI.
- Module not found: make sure packages are installed and VS Code is using the correct Python interpreter.
- Voice issues: speak clearly, reduce background noise, and confirm microphone access in browser and Windows settings.

## How to contribute
Follow this project board to know the latest status of the project:

- [Project board](https://github.com/orgs/cis3296s26/projects/29/views/1)

## Sources & references
### FastAPI
- https://fastapi.tiangolo.com/tutorial/first-steps/
- https://fastapi.tiangolo.com/advanced/templates/
- https://fastapi.tiangolo.com/tutorial/static-files/
- https://www.geeksforgeeks.org/python/fastapi-templates/

### HTML
- https://www.w3schools.com/html/html_intro.asp
- https://www.w3schools.com/w3css/w3css_containers.asp
- https://www.w3schools.com/w3css/4/w3.css

### CSS
- https://fonts.googleapis.com/css2?family=Poppins
- https://css-tricks.com/almanac/functions/c/clamp/

### Other
- https://www.youtube.com/watch?v=R7b3OlEyqug
