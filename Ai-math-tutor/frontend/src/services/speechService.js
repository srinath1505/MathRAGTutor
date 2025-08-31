// Web Speech API implementation for Speech-to-Text
// No server costs, browser-based solution

export const startListening = (callback) => {
  // Check if browser supports Web Speech API
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error("Browser doesn't support Web Speech API. Please use Chrome, Edge, or Safari.");
    return null;
  }

  // Create recognition instance
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  // Handle results
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    callback(transcript);
  };

  // Handle errors
  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    if (event.error === 'not-allowed') {
      alert('Please allow microphone access to use voice features.');
    }
  };

  // Start listening
  recognition.start();
  return recognition;
};

// Stop listening function
export const stopListening = (recognition) => {
  if (recognition) {
    recognition.stop();
  }
};