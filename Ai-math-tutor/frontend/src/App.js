import React, { useState, useRef } from 'react';
import { Box, Typography, Paper, IconButton, CircularProgress } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import Mascot from './components/Mascot';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [currentEmotion, setCurrentEmotion] = useState("neutral");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  
  // Check if Web Speech API is available
  React.useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Web Speech API is not supported in your browser. Please use Chrome, Edge, or Safari for the best experience.');
    }
  }, []);
  
  const handleStartListening = () => {
    if (isListening) return;
    
    setIsListening(true);
    setCurrentEmotion("listening");
    
    recognitionRef.current = startListening(async (transcript) => {
      setIsListening(false);
      setCurrentEmotion("thinking");
      
      // Add user message to conversation
      const newConversation = [...conversation, { 
        role: "user", 
        content: transcript 
      }];
      setConversation(newConversation);
      
      try {
        // Format history for backend - ONLY include exchanges with answers
        const history = [];
        for (let i = 0; i < newConversation.length; i++) {
          if (newConversation[i].role === "user") {
            // Look for the corresponding assistant message
            for (let j = i + 1; j < newConversation.length; j++) {
              if (newConversation[j].role === "assistant") {
                history.push({
                  question: newConversation[i].content,
                  answer: newConversation[j].content
                });
                break;
              }
            }
          }
        }
        
        // Call backend API
        const response = await fetch('http://localhost:8000/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: transcript,
            history: history
          })
        });
        
        const data = await response.json();
        
        // Add assistant response to conversation
        setConversation(prev => [...prev, { 
          role: "assistant", 
          content: data.text 
        }]);
        
        // Update emotion and speak
        setCurrentEmotion(data.emotion);
        setIsSpeaking(true);
        speak(data.text, data.emotion);
        
        // Reset speaking state after speech ends
        setTimeout(() => {
          setIsSpeaking(false);
          setCurrentEmotion("neutral");
        }, Math.min(data.text.length * 100, 15000));
      } catch (error) {
        console.error("API call failed:", error);
        setCurrentEmotion("neutral");
        const errorMessage = "I'm having trouble connecting to the server. Please check if the backend is running at http://localhost:8000";
        setConversation(prev => [...prev, { 
          role: "assistant", 
          content: errorMessage 
        }]);
        setIsSpeaking(true);
        speak(errorMessage);
        
        setTimeout(() => {
          setIsSpeaking(false);
        }, errorMessage.length * 100);
      }
    });
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      stopListening(recognitionRef.current);
      recognitionRef.current = null;
    }
    setIsListening(false);
    setCurrentEmotion("neutral");
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      backgroundColor: '#f5f5f5',
      padding: 2
    }}>
      <Typography variant="h4" sx={{ textAlign: 'center', mb: 3, color: '#1976d2' }}>
        Math Tutor AI
      </Typography>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'row', 
        flex: 1,
        gap: 2
      }}>
        {/* Mascot Section */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Box sx={{ 
            width: 300, 
            height: 300,
            mb: 2
          }}>
            <Mascot 
              emotion={isListening ? "listening" : currentEmotion} 
              isSpeaking={isSpeaking}
            />
          </Box>
          
          <IconButton 
            onClick={isListening ? handleStopListening : handleStartListening}
            disabled={isSpeaking}
            sx={{ 
              backgroundColor: isListening ? '#d32f2f' : '#1976d2',
              '&:hover': {
                backgroundColor: isListening ? '#b71c1c' : '#1565c0',
              },
              width: 70,
              height: 70
            }}
          >
            {isListening ? <MicOffIcon sx={{ color: 'white', fontSize: 30 }} /> : <MicIcon sx={{ color: 'white', fontSize: 30 }} />}
          </IconButton>
          
          <Typography variant="body1" sx={{ mt: 1 }}>
            {isListening ? "Listening..." : "Tap to speak"}
          </Typography>
        </Box>
        
        {/* Chat Section */}
        <Paper sx={{ 
          flex: 2, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 3,
          boxShadow: 3
        }}>
          <Box sx={{ 
            flex: 1, 
            overflow: 'auto', 
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            {conversation.length === 0 ? (
              <Box sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                p: 2
              }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#1976d2' }}>
                  Welcome to Math Tutor AI
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  I'm here to help you with math concepts. Just tap the microphone button and ask me anything!
                </Typography>
                <Box sx={{ 
                  backgroundColor: '#e3f2fd', 
                  p: 2, 
                  borderRadius: 2,
                  width: '100%'
                }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Try asking:
                  </Typography>
                  <ul style={{ 
                    margin: 0, 
                    padding: '0 16px', 
                    textAlign: 'left',
                    listStylePosition: 'inside'
                  }}>
                    <li>What is addition?</li>
                    <li>How is subtraction different from addition?</li>
                    <li>Can you explain fractions with an example?</li>
                  </ul>
                </Box>
              </Box>
            ) : (
              conversation.map((message, index) => (
                <Box
                  key={index}
                  sx={{
                    alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                    backgroundColor: message.role === 'user' ? '#1976d2' : '#e0e0e0',
                    color: message.role === 'user' ? 'white' : 'black',
                    borderRadius: message.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                    p: 1.5,
                    maxWidth: '80%'
                  }}
                >
                  {message.content}
                </Box>
              ))
            )}
          </Box>
          
          <Box sx={{ 
            p: 2, 
            borderTop: '1px solid #e0e0e0',
            backgroundColor: 'white'
          }}>
            <Typography variant="body2" sx={{ 
              textAlign: 'center',
              color: '#616161',
              fontStyle: 'italic'
            }}>
              {isListening 
                ? "Speak clearly and wait for the response..." 
                : "Tap the microphone to ask a question"}
            </Typography>
          </Box>
        </Paper>
      </Box>
      
      <Box sx={{ 
        mt: 2, 
        textAlign: 'center',
        p: 1,
        backgroundColor: '#e3f2fd',
        borderRadius: 2
      }}>
        <Typography variant="body2" sx={{ color: '#1976d2' }}>
          Tip: For best results, use Chrome or Edge browser and allow microphone access when prompted.
        </Typography>
      </Box>
    </Box>
  );
}

// Speech service functions
const startListening = (callback) => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error("Browser doesn't support Web Speech API. Please use Chrome, Edge, or Safari.");
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    callback(transcript);
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    if (event.error === 'not-allowed') {
      alert('Please allow microphone access to use voice features.');
    }
  };

  recognition.start();
  return recognition;
};

const stopListening = (recognition) => {
  if (recognition) {
    recognition.stop();
  }
};

// TTS service functions
const speak = (text, emotion = "neutral") => {
  window.speechSynthesis.cancel();
  
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

export default App;