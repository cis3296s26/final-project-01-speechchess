import sys
import pyttsx3


def read_file(filename):
    ## Read from a file and return TTS voice
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"Error: File '{filename}' not found.")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)


def text_to_speech(text):
    """Convert text to speech using pyttsx3."""
    try:
        # Initialize the TTS
        engine = pyttsx3.init()
        
        # Optional: Configure voice properties
        engine.setProperty('rate', 150)    # Speed of speech (words per minute)
        engine.setProperty('volume', 0.9)  # Volume (0.0 to 1.0)
        
        # Speak the text
        print("Speaking...")
        engine.say(text)
        engine.runAndWait()
        print("Done!")
        
    except Exception as e:
        print(f"Error with TTS: {e}")
        sys.exit(1)


def main():
    """Main function."""
    if len(sys.argv) < 2:
        print("Usage: python TTS.py <filename>")
        print("Example: python TTS.py text.txt")
        sys.exit(1)
    
    filename = sys.argv[1]
    text = read_file(filename)
    
    if text.strip():
        text_to_speech(text)
    else:
        print("Warning: File is empty.")


if __name__ == "__main__":
    main()