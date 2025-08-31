// frontend/src/services/apiService.js
import { useEffect, useState } from 'react';

// API service to connect with our RAG backend
export const queryBackend = async (query, history = []) => {
  try {
    const response = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        history: history
      })
    });
    
    // Handle rate limit errors
    if (response.status === 429) {
      return {
        text: "I've reached my usage limit. Please wait a minute before asking another question.",
        emotion: "thinking"
      };
    }
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("API call error:", error);
    
    // Return a friendly error message with neutral emotion
    return {
      text: "I'm having trouble connecting to the server. Please check if the backend is running at http://localhost:8000",
      emotion: "thinking"
    };
  }
};

// Hook for API calls with loading state and rate limit handling
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRequestTime, setLastRequestTime] = useState(0);
  
  // Rate limit: 10 requests per minute for Free Tier
  const MIN_REQUEST_INTERVAL = 6000; // 6 seconds between requests
  
  const callApi = async (query, history = []) => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    // Enforce minimum request interval
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await queryBackend(query, history);
      setLastRequestTime(Date.now());
      setLoading(false);
      return response;
    } catch (err) {
      setError(err);
      setLoading(false);
      return {
        text: "I'm having trouble connecting to the server. Please check if the backend is running at http://localhost:8000",
        emotion: "thinking"
      };
    }
  };
  
  return { loading, error, callApi };
};