document.addEventListener('DOMContentLoaded', function() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    
    // Audio file path
    const audioFile = 'brown.m4a';
    
    // State management
    let isPlaying = false;
    let isFadeInProgress = false;
    let audioContext = null;
    let gainNode = null;
    let audioBuffer = null;
    let sourceNode = null;
    let fadeTimeout = null;
    
    // Initialize Web Audio API
    function initAudio() {
        try {
            // Create AudioContext
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioContext.createGain();
            gainNode.connect(audioContext.destination);
            gainNode.gain.value = 0;
            
            // Load and decode audio data
            loadAudioFile();
            
            console.log('AudioContext initialized successfully');
        } catch (e) {
            console.error('Web Audio API not supported:', e);
        }
    }
    
    // Load and decode audio file
    async function loadAudioFile() {
        try {
            // Fetch the audio file
            const response = await fetch(audioFile);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Get the array buffer
            const arrayBuffer = await response.arrayBuffer();
            
            // Decode the audio data
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            console.log('Audio file loaded and decoded successfully');
        } catch (error) {
            console.error('Error loading audio file:', error);
        }
    }
    
    // Fade in effect
    function fadeIn(duration = 1000) {
        if (!gainNode || !audioContext) return;
        
        // Clear any existing fade timeouts
        if (fadeTimeout) {
            clearTimeout(fadeTimeout);
            fadeTimeout = null;
        }
        
        const currentTime = audioContext.currentTime;
        gainNode.gain.cancelScheduledValues(currentTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
        gainNode.gain.linearRampToValueAtTime(1, currentTime + duration / 1000);
    }
    
    // Fade out effect
    function fadeOut(duration = 1000) {
        if (!gainNode || !audioContext) return;
        
        const currentTime = audioContext.currentTime;
        const currentGain = gainNode.gain.value;
        gainNode.gain.cancelScheduledValues(currentTime);
        gainNode.gain.setValueAtTime(currentGain, currentTime);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + duration / 1000);
    }
    
    // Play audio with fade in
    async function playAudio() {
        if (isFadeInProgress || isPlaying) return;
        
        isFadeInProgress = true;
        
        // Resume audio context if suspended (Safari requirement)
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        // Make sure audio is loaded
        if (!audioBuffer) {
            console.log('Audio not loaded yet, loading...');
            await loadAudioFile();
        }
        
        if (!audioBuffer) {
            console.error('Failed to load audio buffer');
            isFadeInProgress = false;
            return;
        }
        
        try {
            // Create a new source node
            sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.loop = true;
            sourceNode.connect(gainNode);
            
            // Start playback
            sourceNode.start(0);
            
            // Update UI
            isPlaying = true;
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
            playPauseBtn.classList.add('playing');
            
            // Start fade in after a small delay
            setTimeout(() => {
                fadeIn(1000);
                isFadeInProgress = false;
            }, 50);
            
            setupMediaSession();
            
            // Handle when the source ends (shouldn't happen with loop, but just in case)
            sourceNode.onended = () => {
                if (isPlaying) {
                    // This might happen if the source stops unexpectedly
                    console.log('Source ended unexpectedly, restarting...');
                    playAudio();
                }
            };
            
        } catch (error) {
            console.error('Playback error:', error);
            isFadeInProgress = false;
        }
    }
    
    // Pause audio with fade out
    function pauseAudio() {
        if (isFadeInProgress || !isPlaying) return;
        
        isFadeInProgress = true;
        
        // Change icon immediately for instant feedback
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        playPauseBtn.classList.remove('playing');
        
        // Start fade out immediately
        fadeOut(1000);
        
        // Use a timeout to ensure fade completes before stopping
        fadeTimeout = setTimeout(() => {
            if (sourceNode) {
                try {
                    sourceNode.stop();
                    sourceNode.disconnect();
                    sourceNode = null;
                } catch (e) {
                    console.log('Error stopping source:', e);
                }
            }
            
            isPlaying = false;
            isFadeInProgress = false;
            fadeTimeout = null;
        }, 1000);
    }
    
    // Setup Media Session API for background playback
    function setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: 'Brown Noise',
                artist: 'Relaxation Sounds',
                album: 'Ambient Sounds'
            });
            
            navigator.mediaSession.setActionHandler('play', () => {
                playAudio();
            });
            
            navigator.mediaSession.setActionHandler('pause', () => {
                pauseAudio();
            });
        }
    }
    
    // Event listeners
    playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
            pauseAudio();
        } else {
            playAudio();
        }
    });
    
    // Handle page visibility changes (Safari optimization)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && isPlaying) {
            console.log('Playing in background');
        } else if (!document.hidden && isPlaying) {
            console.log('Playing in foreground');
        }
    });
    
    // Safari-specific optimizations
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
        // Preload the audio file on first user interaction
        document.addEventListener('touchstart', function initOnFirstTouch() {
            if (!audioContext) {
                initAudio();
            }
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            document.removeEventListener('touchstart', initOnFirstTouch);
        }, { once: true });
    }
    
    // Register service worker for caching
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/sw.js')
                .then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(function(error) {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }
    
    // Initialize audio on page load
    initAudio();
});