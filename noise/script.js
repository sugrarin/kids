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
    let isAudioInitialized = false;
    let useWebAudioAPI = true; // Flag to determine which API to use
    
    // Detect if we should use Web Audio API or fallback to HTML5 Audio
    function detectAudioSupport() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        // Use HTML5 Audio for iOS Safari for better compatibility
        if (isIOS && isSafari) {
            useWebAudioAPI = false;
            console.log('Using HTML5 Audio for iOS Safari');
        } else {
            console.log('Using Web Audio API');
        }
    }
    
    // Initialize Web Audio API
    function initWebAudioAPI() {
        if (isAudioInitialized) return;
        
        try {
            // Create AudioContext
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioContext.createGain();
            gainNode.connect(audioContext.destination);
            gainNode.gain.value = 0;
            
            isAudioInitialized = true;
            console.log('AudioContext initialized successfully');
            
            // Load and decode audio data
            loadAudioFile();
        } catch (e) {
            console.error('Web Audio API not supported:', e);
            useWebAudioAPI = false; // Fallback to HTML5 Audio
        }
    }
    
    // Initialize HTML5 Audio
    function initHTML5Audio() {
        if (isAudioInitialized) return;
        
        try {
            // Create HTML5 Audio element
            window.audioElement = new Audio();
            audioElement.src = audioFile;
            audioElement.loop = true;
            audioElement.preload = 'auto';
            
            isAudioInitialized = true;
            console.log('HTML5 Audio initialized successfully');
        } catch (e) {
            console.error('HTML5 Audio not supported:', e);
        }
    }
    
    // Load and decode audio file (Web Audio API)
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
    
    // Fade in effect (Web Audio API)
    function fadeInWebAudio(duration = 1000) {
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
    
    // Fade out effect (Web Audio API)
    function fadeOutWebAudio(duration = 1000) {
        if (!gainNode || !audioContext) return;
        
        const currentTime = audioContext.currentTime;
        const currentGain = gainNode.gain.value;
        gainNode.gain.cancelScheduledValues(currentTime);
        gainNode.gain.setValueAtTime(currentGain, currentTime);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + duration / 1000);
    }
    
    // Fade in effect (HTML5 Audio)
    function fadeInHTML5(duration = 1000) {
        if (!window.audioElement) return;
        
        // Clear any existing fade timeouts
        if (fadeTimeout) {
            clearTimeout(fadeTimeout);
            fadeTimeout = null;
        }
        
        audioElement.volume = 0;
        const targetVolume = 1;
        const steps = 20;
        const stepDuration = duration / steps;
        const volumeStep = targetVolume / steps;
        let currentStep = 0;
        
        const fadeInterval = setInterval(() => {
            currentStep++;
            audioElement.volume = Math.min(volumeStep * currentStep, targetVolume);
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                audioElement.volume = targetVolume;
            }
        }, stepDuration);
    }
    
    // Fade out effect (HTML5 Audio)
    function fadeOutHTML5(duration = 1000) {
        if (!window.audioElement) return;
        
        const startVolume = audioElement.volume;
        const steps = 20;
        const stepDuration = duration / steps;
        const volumeStep = startVolume / steps;
        let currentStep = 0;
        
        const fadeInterval = setInterval(() => {
            currentStep++;
            audioElement.volume = Math.max(startVolume - (volumeStep * currentStep), 0);
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                audioElement.volume = 0;
            }
        }, stepDuration);
    }
    
    // Play audio with fade in (Web Audio API)
    async function playWebAudio() {
        if (isFadeInProgress || isPlaying) return;
        
        isFadeInProgress = true;
        
        // Initialize audio on first user interaction
        if (!isAudioInitialized) {
            initWebAudioAPI();
            // Wait a bit for initialization
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Resume audio context if suspended (Safari requirement)
        if (audioContext && audioContext.state === 'suspended') {
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
                fadeInWebAudio(1000);
                isFadeInProgress = false;
            }, 50);
            
            setupMediaSession();
            
            // Handle when the source ends (shouldn't happen with loop, but just in case)
            sourceNode.onended = () => {
                if (isPlaying) {
                    // This might happen if the source stops unexpectedly
                    console.log('Source ended unexpectedly, restarting...');
                    playWebAudio();
                }
            };
            
        } catch (error) {
            console.error('Playback error:', error);
            isFadeInProgress = false;
        }
    }
    
    // Play audio with fade in (HTML5 Audio)
    async function playHTML5() {
        if (isFadeInProgress || isPlaying) return;
        
        isFadeInProgress = true;
        
        // Initialize audio if needed
        if (!isAudioInitialized) {
            initHTML5Audio();
        }
        
        try {
            // Start playback
            await audioElement.play();
            
            // Update UI
            isPlaying = true;
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
            playPauseBtn.classList.add('playing');
            
            // Start fade in
            fadeInHTML5(1000);
            isFadeInProgress = false;
            
            setupMediaSession();
            
        } catch (error) {
            console.error('Playback error:', error);
            isFadeInProgress = false;
        }
    }
    
    // Pause audio with fade out (Web Audio API)
    function pauseWebAudio() {
        if (isFadeInProgress || !isPlaying) return;
        
        isFadeInProgress = true;
        
        // Change icon immediately for instant feedback
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        playPauseBtn.classList.remove('playing');
        
        // Start fade out immediately
        fadeOutWebAudio(1000);
        
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
    
    // Pause audio with fade out (HTML5 Audio)
    function pauseHTML5() {
        if (isFadeInProgress || !isPlaying) return;
        
        isFadeInProgress = true;
        
        // Change icon immediately for instant feedback
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        playPauseBtn.classList.remove('playing');
        
        // Start fade out immediately
        fadeOutHTML5(1000);
        
        // Use a timeout to ensure fade completes before pausing
        fadeTimeout = setTimeout(() => {
            if (audioElement) {
                audioElement.pause();
            }
            
            isPlaying = false;
            isFadeInProgress = false;
            fadeTimeout = null;
        }, 1000);
    }
    
    // Play audio with fade in
    async function playAudio() {
        if (useWebAudioAPI) {
            await playWebAudio();
        } else {
            await playHTML5();
        }
    }
    
    // Pause audio with fade out
    function pauseAudio() {
        if (useWebAudioAPI) {
            pauseWebAudio();
        } else {
            pauseHTML5();
        }
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
        // Add multiple event listeners for better Safari compatibility
        const initOnFirstInteraction = function() {
            if (!isAudioInitialized) {
                if (useWebAudioAPI) {
                    initWebAudioAPI();
                } else {
                    initHTML5Audio();
                }
            }
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
        };
        
        // Listen for various user interactions
        document.addEventListener('touchstart', initOnFirstInteraction, { once: true });
        document.addEventListener('click', initOnFirstInteraction, { once: true });
        document.addEventListener('keydown', initOnFirstInteraction, { once: true });
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
    
    // Detect audio support on page load
    detectAudioSupport();
});