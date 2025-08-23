class KidClickerGame {
    constructor() {
        this.isGameActive = false;
        this.isDarkTheme = true;
        this.currentImage = null;
        this.imageList = [
            'airship.svg', 'amanita.svg', 'anser.svg', 'bank.svg', 'bellflower.svg',
            'bird.svg', 'black-hole.svg', 'butterfly.svg', 'car-front2.svg', 'cat-shhh.svg',
            'cat.svg', 'chicken.svg', 'cloudy.svg', 'cow.svg', 'crocodile.svg',
            'dog-head.svg', 'dog-sitting.svg', 'dog.svg', 'dump-truck.svg', 'earth.svg',
            'fir-tree.svg', 'fire2.svg', 'fish.svg', 'gaz-m20.svg', 'hare.svg',
            'horse.svg', 'kangaroo.svg', 'leaf-linden.svg', 'lightning.svg', 'magpie.svg',
            'moon.svg', 'motorcycle.svg', 'mountains.svg', 'neptune.svg', 'new-shit.svg',
            'plane-old.svg', 'plane.svg', 'polar-bear.svg', 'shit.svg', 'snail.svg',
            'snowflake5.svg', 'trollius.svg', 'turtle.svg', 'tyrannosaurus.svg', 'volkswagen-golf.svg',
            'watercraft.svg', 'yak.svg'
        ];
        
        // Инициализируем массив звуковых эффектов
        this.soundFiles = [
            'sounds/game-ball.wav',
            'sounds/game-ball-2.wav',
            'sounds/game-ball-3.wav'
        ];
        this.gameSounds = [];
        
        // Предзагружаем все звуки
        this.soundFiles.forEach(soundFile => {
            const audio = new Audio(soundFile);
            audio.preload = 'auto';
            this.gameSounds.push(audio);
        });
        
        // Предзагружаем все изображения
        this.preloadedImages = {
            white: {},
            black: {}
        };
        this.imagesLoaded = false;
        this.preloadImages();
        
        this.initializeElements();
        this.bindEvents();
    }

    preloadImages() {
        let loadedCount = 0;
        const totalImages = this.imageList.length * 2; // белые и черные версии
        
        const checkAllLoaded = () => {
            loadedCount++;
            if (loadedCount === totalImages) {
                this.imagesLoaded = true;
                console.log('Все изображения предзагружены!');
                this.showPlayButton();
            }
        };

        // Предзагружаем белые изображения
        this.imageList.forEach(imageName => {
            const whiteImg = new Image();
            whiteImg.onload = checkAllLoaded;
            whiteImg.onerror = checkAllLoaded; // Считаем ошибки тоже завершенными
            whiteImg.src = `images/white/${imageName}`;
            this.preloadedImages.white[imageName] = whiteImg;
        });

        // Предзагружаем черные изображения
        this.imageList.forEach(imageName => {
            const blackImg = new Image();
            blackImg.onload = checkAllLoaded;
            blackImg.onerror = checkAllLoaded; // Считаем ошибки тоже завершенными
            blackImg.src = `images/black/${imageName}`;
            this.preloadedImages.black[imageName] = blackImg;
        });
    }

    showPlayButton() {
        // Скрываем индикатор загрузки и показываем кнопку игры
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.add('hidden');
        }
        if (this.playButton) {
            this.playButton.classList.remove('hidden');
        }
    }

    initializeElements() {
        this.startScreen = document.getElementById('startScreen');
        this.gameScreen = document.getElementById('gameScreen');
        this.playButton = document.getElementById('playButton');
        this.themeToggle = document.getElementById('themeToggle');
        this.exitButton = document.getElementById('exitButton');
        this.gameArea = document.getElementById('gameArea');
        this.themeIcon = document.getElementById('themeIcon');
        this.exitIcon = document.getElementById('exitIcon');
        this.loadingIndicator = document.getElementById('loadingIndicator');
    }

    bindEvents() {
        this.playButton.addEventListener('click', () => this.startGame());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.exitButton.addEventListener('click', () => this.exitGame());
        
        // Обработка полноэкранного режима
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        
        // Блокируем системные клавиши и сочетания в игровом режиме
        document.addEventListener('keydown', (e) => {
            if (this.isGameActive) {
                this.blockSystemKeys(e);
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (this.isGameActive) {
                this.blockSystemKeys(e);
            }
        });
        
        document.addEventListener('keypress', (e) => {
            if (this.isGameActive) {
                this.blockSystemKeys(e);
            }
        });
    }

    blockSystemKeys(e) {
        // Список системных клавиш для блокировки
        const blockedKeys = [
            'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
            'Tab', 'Alt', 'Meta', 'ContextMenu', 'PrintScreen', 'ScrollLock', 'Pause'
        ];

        // Блокируем системные клавиши
        if (blockedKeys.includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        // Блокируем сочетания с модификаторами
        if (e.ctrlKey || e.metaKey || e.altKey) {
            // Разрешаем только базовые сочетания для разработки (можно убрать в продакшене)
            const allowedCombinations = [
                // Можно добавить исключения если нужно
            ];
            
            const combination = `${e.ctrlKey ? 'Ctrl+' : ''}${e.metaKey ? 'Meta+' : ''}${e.altKey ? 'Alt+' : ''}${e.key}`;
            
            if (!allowedCombinations.includes(combination)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }

        // Блокируем функциональные клавиши браузера
        if (e.key.startsWith('F') && e.key.length <= 3) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        return true;
    }

    async startGame() {
        try {
            // Переходим в полноэкранный режим
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
                await document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.mozRequestFullScreen) {
                await document.documentElement.mozRequestFullScreen();
            }
            
            this.isGameActive = true;
            this.startScreen.classList.add('hidden');
            this.gameScreen.classList.remove('hidden');
            document.body.classList.add('game-mode');
            
            this.bindGameEvents();
        } catch (error) {
            console.log('Полноэкранный режим не поддерживается или заблокирован');
            // Запускаем игру без полноэкранного режима
            this.isGameActive = true;
            this.startScreen.classList.add('hidden');
            this.gameScreen.classList.remove('hidden');
            document.body.classList.add('game-mode');
            this.bindGameEvents();
        }
    }

    bindGameEvents() {
        // Обработка клавиатуры
        this.keydownHandler = (e) => {
            if (this.isGameActive) {
                e.preventDefault();
                this.showRandomImage(e);
            }
        };
        
        // Обработка кликов мыши
        this.clickHandler = (e) => {
            if (this.isGameActive && e.target === this.gameArea) {
                e.preventDefault();
                this.showRandomImage(e);
            }
        };
        
        document.addEventListener('keydown', this.keydownHandler);
        this.gameArea.addEventListener('click', this.clickHandler);
    }

    unbindGameEvents() {
        document.removeEventListener('keydown', this.keydownHandler);
        this.gameArea.removeEventListener('click', this.clickHandler);
    }

    playSound() {
        try {
            // Выбираем случайный звук из массива
            const randomIndex = Math.floor(Math.random() * this.gameSounds.length);
            const randomSound = this.gameSounds[randomIndex];
            
            // Сбрасываем время воспроизведения для повторного проигрывания
            randomSound.currentTime = 0;
            randomSound.play().catch(error => {
                console.log('Не удалось воспроизвести звук:', error);
            });
        } catch (error) {
            console.log('Ошибка при воспроизведении звука:', error);
        }
    }

    showRandomImage(event) {
        // Воспроизводим звуковой эффект
        this.playSound();
        
        // Если есть текущее изображение, удаляем его
        if (this.currentImage) {
            const oldImage = this.currentImage;
            oldImage.classList.add('animate-out');
            setTimeout(() => {
                if (oldImage && oldImage.parentNode) {
                    oldImage.parentNode.removeChild(oldImage);
                }
            }, 300);
        }

        // Создаем новое изображение
        const img = document.createElement('img');
        const randomImage = this.imageList[Math.floor(Math.random() * this.imageList.length)];
        
        // Используем предзагруженные изображения если они готовы
        const themeFolder = this.isDarkTheme ? 'white' : 'black';
        if (this.imagesLoaded && this.preloadedImages[themeFolder][randomImage]) {
            // Клонируем предзагруженное изображение для лучшей производительности
            const preloadedImg = this.preloadedImages[themeFolder][randomImage];
            img.src = preloadedImg.src;
        } else {
            // Fallback для случая, если изображения еще не загружены
            const imagePath = this.isDarkTheme ? `images/white/${randomImage}` : `images/black/${randomImage}`;
            img.src = imagePath;
        }
        
        img.className = 'game-image animate-in';
        img.alt = 'Game Image';

        // Рандомный финальный масштаб от 300% до 350%
        const finalScale = 4 + Math.random() * 0.2;
        img.style.setProperty('--final-scale', finalScale);

        // Позиционируем изображение
        let x, y;
        if (event.type === 'click') {
            // Используем координаты клика
            x = event.clientX;
            y = event.clientY;
        } else {
            // Рандомная позиция для нажатий клавиш
            x = Math.random() * (window.innerWidth - 200);
            y = Math.random() * (window.innerHeight - 200);
        }

        img.style.left = `${x - 100}px`; // Центрируем изображение
        img.style.top = `${y - 100}px`;

        this.gameArea.appendChild(img);
        this.currentImage = img;
    }

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        document.body.className = this.isDarkTheme ? 'dark-theme' : 'light-theme';
        
        if (this.isGameActive) {
            document.body.classList.add('game-mode');
        }

        // Обновляем иконки
        const themeIconPath = this.isDarkTheme ? 'icons/theme_dark.svg' : 'icons/theme_light.svg';
        const exitIconPath = this.isDarkTheme ? 'icons/close_dark.svg' : 'icons/close_light.svg';
        
        this.themeIcon.src = themeIconPath;
        this.exitIcon.src = exitIconPath;
    }

    exitGame() {
        this.isGameActive = false;
        
        // Выходим из полноэкранного режима
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        }

        this.gameScreen.classList.add('hidden');
        this.startScreen.classList.remove('hidden');
        document.body.classList.remove('game-mode');
        
        this.unbindGameEvents();
        
        // Очищаем игровую область
        this.gameArea.innerHTML = '';
        this.currentImage = null;
    }

    handleFullscreenChange() {
        const isFullscreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement;
        
        if (!isFullscreen && this.isGameActive) {
            // Если вышли из полноэкранного режима во время игры, завершаем игру
            this.exitGame();
        }
    }
}

// Инициализация игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.kidClickerGame = new KidClickerGame();
});

// Предотвращаем контекстное меню
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Предотвращаем выделение текста
document.addEventListener('selectstart', (e) => {
    e.preventDefault();
});

// Блокируем перетаскивание
document.addEventListener('dragstart', (e) => {
    e.preventDefault();
});

// Блокируем копирование/вставку в игровом режиме
document.addEventListener('copy', (e) => {
    if (window.kidClickerGame && window.kidClickerGame.isGameActive) {
        e.preventDefault();
    }
});

document.addEventListener('paste', (e) => {
    if (window.kidClickerGame && window.kidClickerGame.isGameActive) {
        e.preventDefault();
    }
});

document.addEventListener('cut', (e) => {
    if (window.kidClickerGame && window.kidClickerGame.isGameActive) {
        e.preventDefault();
    }
});
