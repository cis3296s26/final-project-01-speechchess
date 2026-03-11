import speech_recognition as sr
import datetime
import sounddevice as sd
import numpy as np
import wave
import tempfile
import os

def record_audio(duration=10, sample_rate=16000):
    """Record audio using sounddevice"""
    print(f"Recording for up to {duration} seconds... Speak now!")
    
    # Record audio
    recording = sd.rec(int(duration * sample_rate), 
                      samplerate=sample_rate, 
                      channels=1, 
                      dtype=np.int16)
    sd.wait()
    
    return recording, sample_rate

def save_temp_wav(recording, sample_rate):
    """Save recording to temporary WAV file"""
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
    
    with wave.open(temp_file.name, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(recording.tobytes())
    
    return temp_file.name

def record_and_export():
    """Main function to record voice and export text"""
    print("Speech Recognition - Voice to Text Converter")
    print("=" * 50)
    
    try:
        # Record audio
        recording, sample_rate = record_audio(duration=10)
        
        # Save to temporary WAV file
        temp_wav = save_temp_wav(recording, sample_rate)
        
        print("\nProcessing your speech...\n")
        
        # Initialize recognizer
        recognizer = sr.Recognizer()
        
        # Load audio file
        with sr.AudioFile(temp_wav) as source:
            audio = recognizer.record(source)
        
        # Recognize speech using Google Speech Recognition
        text = recognizer.recognize_google(audio)
        
        print("Transcribed Text:")
        print("-" * 50)
        print(text)
        print("-" * 50)
        
        # Generate filename with timestamp
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"transcription_{timestamp}.txt"
        
        # Export to text file
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(text)
        
        print(f"\n✓ Text exported successfully to: {filename}")
        
        # Clean up temporary file
        os.unlink(temp_wav)
        
    except sr.UnknownValueError:
        print("Error: Could not understand the audio. Please speak clearly.")
    except sr.RequestError as e:
        print(f"Error: Could not request results from speech recognition service; {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    record_and_export()