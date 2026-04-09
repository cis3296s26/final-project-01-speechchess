import importlib
import os
import sys
import types
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def test_speak_uses_engine_when_available(monkeypatch):
    fake_pyttsx3 = types.ModuleType("pyttsx3")

    class FakeEngine:
        def __init__(self):
            self.properties = {}
            self.spoken = []
            self.runs = 0

        def setProperty(self, name, value):
            self.properties[name] = value

        def say(self, text):
            self.spoken.append(text)

        def runAndWait(self):
            self.runs += 1

    engine = FakeEngine()
    fake_pyttsx3.init = lambda: engine

    monkeypatch.setitem(sys.modules, "pyttsx3", fake_pyttsx3)
    sys.modules.pop("TTS", None)
    TTS = importlib.import_module("TTS")

    TTS.speak("Hello chess")

    assert TTS.engine is engine
    assert engine.properties == {"rate": 150, "volume": 0.9}
    assert engine.spoken == ["Hello chess"]
    assert engine.runs == 1


def test_speak_returns_without_engine():
    import TTS

    TTS.engine = None

    assert TTS.speak("Nothing happens") is None
