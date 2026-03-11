# Chess Voice Assistant

Python scripts for chess gameplay, voice-to-text, and text-to-speech.

## Requirements
- Python 3.8+
- Windows 10/11
- Microphone and speakers

## Installation

Install Requirements:

python -m pip install chess SpeechRecognition sounddevice numpy pyttsx3


## Usage

**Chess Demo:**

python Chess.py


**Voice to Text:**

python Voice.py

Speak for 10 seconds. Text saves to `transcription_YYYYMMDD_HHMMSS.txt`

**Text to Speech:**

python TTS.py filename.txt


## Troubleshooting

**Module not found:** Make sure packages are installed and VS Code is using the correct Python interpreter

**Voice.py errors:** Speak clearly, reduce background noise, check microphone is working in Windows settings