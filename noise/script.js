document.addEventListener('DOMContentLoaded', function() {
    const audioPlayer = document.getElementById('audioPlayer');
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
    let sourceNode = null;
    let fadeTimeout = null;
    
    // Initialize audio with streaming support
    function initAudio() {
        // Set up audio source with streaming
        audioPlayer.src = audioFile;
        audioPlayer.preload = 'auto'; // Changed to auto for better buffering
        audioPlayer.loop = true;
        audioPlayer.crossOrigin = 'anonymous'; // For Web Audio API
        
        // Create Web Audio API for fade effects
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioContext.createGain();
            gainNode.connect(audioContext.destination);
            gainNode.gain.value = 0;
            
            // Set audio context sample rate to match audio if possible
            audioContext.resume().then(() => {
                console.log('AudioContext initialized successfully');
            });
        } catch (e) {
            console.log('Web Audio API not supported, using HTML5 audio volume');
        }
    }
    
    // Fade in effect with smoother transitions
    function fadeIn(duration = 1000) {
        // Clear any existing fade timeouts
        if (fadeTimeout) {
            clearTimeout(fadeTimeout);
            fadeTimeout = null;
        }
        
        if (gainNode && audioContext) {
            const currentTime = audioContext.currentTime;
            gainNode.gain.cancelScheduledValues(currentTime);
            gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
            gainNode.gain.linearRampToValueAtTime(1, currentTime + duration / 1000);
        } else {
            // Fallback for browsers without Web Audio API
            audioPlayer.volume = 0;
            const targetVolume = 1;
            const steps = 20;
            const stepDuration = duration / steps;
            const volumeStep = targetVolume / steps;
            let currentStep = 0;
            
            const fadeInterval = setInterval(() => {
                currentStep++;
                audioPlayer.volume = Math.min(volumeStep * currentStep, targetVolume);
                
                if (currentStep >= steps) {
                    clearInterval(fadeInterval);
                    audioPlayer.volume = targetVolume;
                }
            }, stepDuration);
        }
    }
    
    // Fade out effect with smoother transitions
    function fadeOut(duration = 1000) {
        if (gainNode && audioContext) {
            const currentTime = audioContext.currentTime;
            const currentGain = gainNode.gain.value;
            gainNode.gain.cancelScheduledValues(currentTime);
            gainNode.gain.setValueAtTime(currentGain, currentTime);
            gainNode.gain.linearRampToValueAtTime(0, currentTime + duration / 1000);
        } else {
            // Fallback for browsers without Web Audio API
            const startVolume = audioPlayer.volume;
            const steps = 20;
            const stepDuration = duration / steps;
            const volumeStep = startVolume / steps;
            let currentStep = 0;
            
            const fadeInterval = setInterval(() => {
                currentStep++;
                audioPlayer.volume = Math.max(startVolume - (volumeStep * currentStep), 0);
                
                if (currentStep >= steps) {
                    clearInterval(fadeInterval);
                    audioPlayer.volume = 0;
                }
            }, stepDuration);
        }
    }
    
    // Play audio with fade in
    function playAudio() {
        if (isFadeInProgress) return;
        
        isFadeInProgress = true;
        
        // Resume audio context if suspended (Safari requirement)
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed');
            });
        }
        
        // Connect to Web Audio API if available (do this before playing)
        if (audioContext && !sourceNode) {
            try {
                sourceNode = audioContext.createMediaElementSource(audioPlayer);
                sourceNode.connect(gainNode);
            } catch (e) {
                console.log('MediaElementSource already created or failed:', e);
            }
        }
        
        // Set initial volume to 0 to prevent clicks
        if (gainNode) {
            gainNode.gain.value = 0;
        } else {
            audioPlayer.volume = 0;
        }
        
        const playPromise = audioPlayer.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isPlaying = true;
                playIcon.classList.add('hidden');
                pauseIcon.classList.remove('hidden');
                playPauseBtn.classList.add('playing');
                
                // Start fade in after a small delay to ensure audio is playing
                setTimeout(() => {
                    fadeIn(1000);
                    isFadeInProgress = false;
                }, 50);
                
                setupMediaSession();
            }).catch(error => {
                console.error('Playback error:', error);
                isFadeInProgress = false;
            });
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
        
        // Use a timeout to ensure fade completes before pausing
        fadeTimeout = setTimeout(() => {
            audioPlayer.pause();
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
                album: 'Ambient Sounds',
                artwork: [
                    { src: 'brown_cover.png', sizes: '96x96', type: 'image/png' },
                    { src: 'brown_cover.png', sizes: '128x128', type: 'image/png' },
                    { src: 'brown_cover.png', sizes: '192x192', type: 'image/png' },
                    { src: 'brown_cover.png', sizes: '256x256', type: 'image/png' },
                    { src: 'brown_cover.png', sizes: '384x384', type: 'image/png' },
                    { src: 'brown_cover.png', sizes: '512x512', type: 'image/png' }
                ]
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
    
    // Handle audio events
    audioPlayer.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        isPlaying = false;
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        playPauseBtn.classList.remove('playing');
    });
    
    audioPlayer.addEventListener('ended', () => {
        // Loop is set on the audio element, but this ensures seamless looping
        if (isPlaying) {
            // Use a small timeout to prevent glitches
            setTimeout(() => {
                audioPlayer.currentTime = 0;
                audioPlayer.play().catch(e => console.error('Loop playback error:', e));
            }, 10);
        }
    });
    
    // Handle audio buffering issues
    audioPlayer.addEventListener('waiting', () => {
        console.log('Audio buffering...');
    });
    
    audioPlayer.addEventListener('playing', () => {
        console.log('Audio playing');
    });
    
    // Handle audio stalls
    audioPlayer.addEventListener('stalled', () => {
        console.log('Audio stalled, attempting to recover...');
        if (isPlaying) {
            // Try to recover by reloading the current position
            const currentTime = audioPlayer.currentTime;
            audioPlayer.load();
            audioPlayer.currentTime = currentTime;
            audioPlayer.play().catch(e => console.error('Recovery playback error:', e));
        }
    });
    
    // Handle page visibility changes (Safari optimization)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && isPlaying) {
            // Page is hidden, continue playing in background
            console.log('Playing in background');
        } else if (!document.hidden && isPlaying) {
            // Page is visible again
            console.log('Playing in foreground');
        }
    });
    
    // Safari-specific optimizations
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
        // Preload the audio file on first user interaction
        document.addEventListener('touchstart', function preloadAudio() {
            if (audioPlayer.readyState === 0) {
                audioPlayer.load();
            }
            document.removeEventListener('touchstart', preloadAudio);
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