// Mascot.js
import React, { useRef, useEffect } from 'react';
import { gsap, Power2 } from 'gsap';
import './Mascot.css';

const Mascot = ({ emotion, isSpeaking, isLoading }) => {
  const mascotRef = useRef(null);
  const leftEyeRef = useRef(null);
  const rightEyeRef = useRef(null);
  const mouthRef = useRef(null);
  const speechWavesRef = useRef([]);
  
  // Animation timelines
  const emotionTimeline = useRef(null);
  const speakingTimeline = useRef(null);
  
  // Cleanup all animations
  const cleanupAnimations = () => {
    if (emotionTimeline.current) {
      emotionTimeline.current.kill();
      emotionTimeline.current = null;
    }
    
    if (speakingTimeline.current) {
      speakingTimeline.current.kill();
      speakingTimeline.current = null;
    }
    
    // Reset all SVG elements to default state
    if (mouthRef.current) {
      gsap.set(mouthRef.current, { attr: { d: "M 100 190 C 150 195, 200 195, 250 190" } });
    }
    
    if (leftEyeRef.current) {
      gsap.set(leftEyeRef.current, { attr: { cx: 100, cy: 120 }, opacity: 1 });
    }
    
    if (rightEyeRef.current) {
      gsap.set(rightEyeRef.current, { attr: { cx: 200, cy: 120 }, opacity: 1 });
    }
  };
  
  // Set up emotion animation
  const setupEmotionAnimation = () => {
    cleanupAnimations();
    
    // Base timeline for emotion
    emotionTimeline.current = gsap.timeline({ paused: true });
    
    switch (emotion) {
      case 'happy':
        emotionTimeline.current
          .to([leftEyeRef.current, rightEyeRef.current], {
            duration: 0.5,
            attr: { cy: 115 },
            ease: Power2.easeOut
          })
          .to(mouthRef.current, {
            duration: 0.5,
            attr: { d: "M 100 185 C 150 165, 200 165, 250 185" },
            ease: Power2.easeOut
          }, 0);
        break;
        
      case 'thinking':
        emotionTimeline.current
          .to(leftEyeRef.current, {
            duration: 1.5,
            attr: { cx: 95, cy: 115 },
            ease: Power2.easeInOut,
            repeat: -1,
            yoyo: true
          })
          .to(rightEyeRef.current, {
            duration: 1.8,
            attr: { cx: 205, cy: 115 },
            ease: Power2.easeInOut,
            repeat: -1,
            yoyo: true
          }, 0)
          .to(mouthRef.current, {
            duration: 0.5,
            attr: { d: "M 100 190 C 150 200, 200 200, 250 190" },
            ease: Power2.easeOut
          }, 0);
        break;
        
      case 'explaining':
        emotionTimeline.current
          .to([leftEyeRef.current, rightEyeRef.current], {
            duration: 0.3,
            attr: { cx: (i, target) => target.getAttribute('cx') === '100' ? 95 : 205 },
            ease: Power2.easeInOut,
            yoyo: true,
            repeat: -1
          })
          .to(mouthRef.current, {
            duration: 0.5,
            attr: { d: "M 100 188 C 150 188, 200 188, 250 188" },
            ease: Power2.easeOut
          }, 0);
        break;
        
      case 'listening':
        emotionTimeline.current
          .to(mouthRef.current, {
            duration: 0.5,
            attr: { d: "M 100 190 C 150 192, 200 192, 250 190" },
            ease: Power2.easeOut
          });
        break;
        
      case 'error':
        emotionTimeline.current
          .to(mouthRef.current, {
            duration: 0.5,
            attr: { d: "M 100 192 C 150 195, 200 195, 250 192", fill: "#B71C1C" },
            ease: Power2.easeOut
          }, 0);
        break;
        
      case 'neutral':
      default:
        emotionTimeline.current
          .to([leftEyeRef.current, rightEyeRef.current], {
            duration: 0.5,
            attr: { 
              cx: (i, target) => {
                const currentCx = parseFloat(target.getAttribute('cx'));
                return i === 0 ? (currentCx > 100 ? 100 : currentCx) : (currentCx < 200 ? 200 : currentCx);
              }, 
              cy: 120 
            },
            ease: Power2.easeOut
          })
          .to(mouthRef.current, {
            duration: 0.5,
            attr: { d: "M 100 190 C 150 195, 200 195, 250 190" },
            ease: Power2.easeOut
          }, 0);
    }
    
    // Play the emotion animation
    emotionTimeline.current.play();
  };
  
  // Set up speaking animation
  const setupSpeakingAnimation = () => {
    if (speakingTimeline.current) {
      speakingTimeline.current.kill();
    }
    
    if (isSpeaking && mouthRef.current) {
      // Create mouth movement animation
      speakingTimeline.current = gsap.timeline({ repeat: -1, yoyo: true });
      
      const animateMouth = () => {
        const amplitude = 8;
        const frequency = 2;
        const movement = amplitude * Math.sin(frequency * Date.now() / 500);
        
        // Update mouth path
        const startY = 190 + movement;
        const controlY1 = 195 + movement * 0.5;
        const controlY2 = 195 + movement * 0.5;
        const endY = 190 + movement;
        
        gsap.set(mouthRef.current, {
          attr: { 
            d: `M 100 ${startY} C 150 ${controlY1}, 200 ${controlY2}, 250 ${endY}` 
          }
        });
        
        requestAnimationFrame(animateMouth);
      };
      
      // Start the mouth movement animation
      const animationFrame = requestAnimationFrame(animateMouth);
      
      // Set up speech waves animation
      if (speechWavesRef.current.length > 0) {
        const waveTimeline = gsap.timeline({ repeat: -1 });
        speechWavesRef.current.forEach((wave, index) => {
          waveTimeline.to(wave, {
            duration: 0.8,
            attr: { r: 140 - index * 20 },
            opacity: 0.8 - index * 0.2,
            ease: Power2.easeInOut
          }, index * 0.2);
          
          waveTimeline.to(wave, {
            duration: 0.8,
            attr: { r: 100 },
            opacity: 0.2,
            ease: Power2.easeInOut
          });
        });
      }
      
      // Cleanup function
      return () => {
        cancelAnimationFrame(animationFrame);
        if (speakingTimeline.current) {
          speakingTimeline.current.kill();
          speakingTimeline.current = null;
        }
      };
    }
  };
  
  // Initialize mascot
  useEffect(() => {
    if (!mascotRef.current) return;
    
    // Initial setup
    setupEmotionAnimation();
    
    return () => {
      cleanupAnimations();
    };
  }, []);
  
  // Handle emotion changes
  useEffect(() => {
    if (!mascotRef.current) return;
    
    setupEmotionAnimation();
  }, [emotion]);
  
  // Handle speaking state
  useEffect(() => {
    if (!mascotRef.current) return;
    
    return setupSpeakingAnimation();
  }, [isSpeaking]);
  
  // Handle loading state
  useEffect(() => {
    if (!mascotRef.current) return;
    
    const mascotElement = mascotRef.current;
    
    if (isLoading) {
      mascotElement.classList.add('loading');
    } else {
      mascotElement.classList.remove('loading');
    }
  }, [isLoading]);
  
  return (
    <div className="mascot-container" ref={mascotRef}>
      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Thinking...</p>
        </div>
      )}
      
      <svg 
        viewBox="0 0 300 300" 
        className="mascot-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Face */}
        <circle 
          cx="150" 
          cy="150" 
          r="125" 
          fill="#FFD54F" 
        />
        
        {/* Left Eye */}
        <circle 
          ref={leftEyeRef}
          cx="100" 
          cy="120" 
          r="15" 
          fill="#000" 
        />
        
        {/* Right Eye */}
        <circle 
          ref={rightEyeRef}
          cx="200" 
          cy="120" 
          r="15" 
          fill="#000" 
        />
        
        {/* Mouth - will be animated */}
        <path 
          ref={mouthRef} 
          d="M 100 190 C 150 195, 200 195, 250 190" 
          fill="none" 
          stroke="#000" 
          strokeWidth="3" 
          strokeLinecap="round"
        />
        
        {/* Speech indicator waves - will be animated when speaking */}
        <g className="speech-waves">
          <circle 
            ref={el => speechWavesRef.current[0] = el}
            cx="150" 
            cy="150" 
            r="100" 
            fill="none" 
            stroke="#1976D2" 
            strokeWidth="2" 
            opacity="0.2" 
          />
          <circle 
            ref={el => speechWavesRef.current[1] = el}
            cx="150" 
            cy="150" 
            r="120" 
            fill="none" 
            stroke="#1976D2" 
            strokeWidth="2" 
            opacity="0.4" 
          />
          <circle 
            ref={el => speechWavesRef.current[2] = el}
            cx="150" 
            cy="150" 
            r="140" 
            fill="none" 
            stroke="#1976D2" 
            strokeWidth="2" 
            opacity="0.6" 
          />
        </g>
      </svg>
    </div>
  );
};

export default Mascot;