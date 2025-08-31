// Web Speech API implementation for Text-to-Speech
// No server costs, browser-based solution

export const speak = (text, emotion = "neutral") => {
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  // Create new utterance
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Adjust speech parameters based on emotion
  switch(emotion) {
    case "happy":
      utterance.rate = 1.1;
      utterance.pitch = 1.2;
      break;
    case "thinking":
      utterance.rate = 0.8;
      utterance.pitch = 0.9;
      break;
    case "explaining":
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      break;
    default:
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
  }
  
  // Set voice (try to find a good voice if available)
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(voice => 
    voice.name.toLowerCase().includes('female') || 
    voice.name.toLowerCase().includes('woman') ||
    voice.lang.startsWith('en-US')
  );
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  
  window.speechSynthesis.speak(utterance);
  return utterance;
};

export const stopSpeaking = () => {
  window.speechSynthesis.cancel();
};