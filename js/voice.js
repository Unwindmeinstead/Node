// Simple voice recognition
let voiceRecognition = null;
let isRecording = false;
let colorChangeInterval = null;

function initVoice() {
    console.log('🎤 Initializing voice recognition...');
    
    const voiceBtn = document.querySelector('.voice-btn');
    const taskInput = document.querySelector('.task-input');
    
    if (!voiceBtn || !taskInput) {
        console.log('❌ Voice button or input not found');
        return;
    }
    
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log('❌ Speech recognition not supported');
        voiceBtn.style.opacity = '0.3';
        voiceBtn.disabled = true;
        return;
    }
    
    console.log('✅ Voice button ready');
    
    voiceBtn.addEventListener('click', () => {
        if (isRecording) {
            stopVoice();
        } else {
            startVoice();
        }
    });
}

function startVoice() {
    const voiceBtn = document.querySelector('.voice-btn');
    const taskInput = document.querySelector('.task-input');
    
    console.log('🚀 Starting voice recognition...');
    
    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        voiceRecognition = new SpeechRecognition();
        
        voiceRecognition.continuous = true;
        voiceRecognition.interimResults = true;
        voiceRecognition.lang = 'en-US';
        
        isRecording = true;
        voiceBtn.classList.add('active');
        
        taskInput.value = '';
        taskInput.focus();
        
        let lastTranscriptLength = 0;
        
        voiceRecognition.onresult = (event) => {
            // Flash the microphone top when receiving speech
            voiceBtn.classList.add('recording');
            setTimeout(() => voiceBtn.classList.remove('recording'), 400);
            
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            
            taskInput.value = transcript;
            
            // Calculate how many new characters were added
            const currentLength = transcript.length;
            const charactersAdded = currentLength - lastTranscriptLength;
            lastTranscriptLength = currentLength;
            
            // Clear any existing interval
            if (colorChangeInterval) {
                clearInterval(colorChangeInterval);
            }
            
            // Trigger immediate color changes for each new character
            if (charactersAdded > 0) {
                // Fire immediate color changes rapidly - one for each character
                let changeCount = 0;
                
                const rapidColorChange = () => {
                    if (changeCount < charactersAdded) {
                        const inputEvent = new Event('input', { bubbles: true });
                        taskInput.dispatchEvent(inputEvent);
                        changeCount++;
                        
                        // Fast interval for smooth color changes
                        setTimeout(rapidColorChange, 80); // 80ms between each color change
                    }
                };
                
                // Start the rapid color changes immediately
                rapidColorChange();
            }
            
            console.log('📝 Voice:', transcript, `(+${charactersAdded} chars)`);
        };
        
        voiceRecognition.onerror = (event) => {
            console.log('❌ Voice error:', event.error);
            if (event.error !== 'no-speech') {
                stopVoice();
            }
        };
        
        voiceRecognition.onend = () => {
            if (isRecording) {
                setTimeout(() => {
                    if (isRecording) {
                        voiceRecognition.start();
                    }
                }, 100);
            }
        };
        
        voiceRecognition.start();
        
    } catch (error) {
        console.log('❌ Voice start error:', error);
        stopVoice();
    }
}

function stopVoice() {
    console.log('🛑 Stopping voice recognition...');
    
    const voiceBtn = document.querySelector('.voice-btn');
    
    isRecording = false;
    voiceBtn.classList.remove('active', 'recording');
    
    // Clear any active color change intervals
    if (colorChangeInterval) {
        clearInterval(colorChangeInterval);
        colorChangeInterval = null;
    }
    
    if (voiceRecognition) {
        voiceRecognition.stop();
        voiceRecognition = null;
    }
}



// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initVoice, 100);
});
