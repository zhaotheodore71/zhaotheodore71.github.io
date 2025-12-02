// 游戏配置常量
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const NEXT_BLOCK_SIZE = 25;
const COLORS = {
    'I': 'tetrisI', // 青色
    'J': 'tetrisJ', // 蓝色
    'L': 'tetrisL', // 橙色
    'O': 'tetrisO', // 黄色
    'S': 'tetrisS', // 绿色
    'T': 'tetrisT', // 紫色
    'Z': 'tetrisZ', // 红色
    'empty': 'bg-gray-800',
    'border': 'border-gray-700'
};

// 方块形状定义
const SHAPES = {
    'I': [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    'J': [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    'L': [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ],
    'O': [
        [1, 1],
        [1, 1]
    ],
    'S': [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    'T': [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    'Z': [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]
};

// 游戏状态变量
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let isPaused = false;
let dropInterval = 1000; // 初始下落速度
let dropCounter = 0;
let lastTime = 0;

// DOM 元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextPieceCanvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const linesDisplay = document.getElementById('lines');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const pauseScreen = document.getElementById('pauseScreen');
const finalScore = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

// 设置画布尺寸
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;
nextCanvas.width = 4 * NEXT_BLOCK_SIZE;
nextCanvas.height = 4 * NEXT_BLOCK_SIZE;

// 初始化游戏板
function initBoard() {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
}

// 生成随机方块
function generatePiece() {
    const keys = Object.keys(SHAPES);
    const type = keys[Math.floor(Math.random() * keys.length)];
    const shape = SHAPES[type];
    const color = type;
    
    // 计算初始位置（居中）
    const x = Math.floor((COLS - shape[0].length) / 2);
    const y = 0;
    
    return { type, shape, color, x, y };
}

// 旋转矩阵（顺时针）
function rotateMatrix(matrix) {
    const N = matrix.length;
    const rotated = Array(N).fill().map(() => Array(N).fill(0));
    
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            rotated[j][N - 1 - i] = matrix[i][j];
        }
    }
    
    return rotated;
}

// 检查碰撞
function checkCollision(piece, deltaX = 0, deltaY = 0, testShape = null) {
    const shape = testShape || piece.shape;
    
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const newX = piece.x + x + deltaX;
                const newY = piece.y + y + deltaY;
                
                // 检查边界
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                
                // 检查与已有方块的碰撞（忽略顶部边界外的区域）
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// 锁定当前方块到游戏板
function lockPiece() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                
                // 检查游戏是否结束（方块触顶）
                if (boardY < 0) {
                    gameOver = true;
                    return;
                }
                
                board[boardY][boardX] = currentPiece.color;
            }
        }
    }
    
    // 检查并消除完整的行
    checkLines();
    
    // 更新等级和下落速度
    updateLevel();
    
    // 生成下一个方块
    currentPiece = nextPiece;
    nextPiece = generatePiece();
    
    // 渲染下一个方块预览
    drawNextPiece();
}

// 检查并消除完整的行
function checkLines() {
    let linesCleared = 0;
    
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            // 消除当前行
            board.splice(y, 1);
            // 在顶部添加新行
            board.unshift(Array(COLS).fill(0));
            // 因为移除了一行，需要重新检查当前位置
            y++;
            linesCleared++;
        }
    }
    
    if (linesCleared > 0) {
        // 计算得分（不同消除行数有不同的得分倍率）
        const linePoints = [0, 100, 300, 500, 800]; // 0, 1, 2, 3, 4行的得分
        score += linePoints[linesCleared] * level;
        lines += linesCleared;
        
        // 更新显示
        updateScore();
        updateLines();
        
        // 显示消除行特效动画
        flashEffect();
    }
}

// 更新等级和下落速度
function updateLevel() {
    const newLevel = Math.floor(lines / 10) + 1;
    if (newLevel > level) {
        level = newLevel;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100); // 最小100ms
        updateLevelDisplay();
    }
}

// 移动方块
function movePiece(deltaX, deltaY) {
    if (!checkCollision(currentPiece, deltaX, deltaY)) {
        currentPiece.x += deltaX;
        currentPiece.y += deltaY;
        return true;
    }
    return false;
}

// 旋转方块
function rotatePiece() {
    const rotatedShape = rotateMatrix(currentPiece.shape);
    
    // 尝试直接旋转
    if (!checkCollision(currentPiece, 0, 0, rotatedShape)) {
        currentPiece.shape = rotatedShape;
        return;
    }
    
    // 尝试墙踢（Wall Kick）
    // 先尝试向左移动后旋转
    if (!checkCollision(currentPiece, -1, 0, rotatedShape)) {
        currentPiece.x -= 1;
        currentPiece.shape = rotatedShape;
        return;
    }
    
    // 尝试向右移动后旋转
    if (!checkCollision(currentPiece, 1, 0, rotatedShape)) {
        currentPiece.x += 1;
        currentPiece.shape = rotatedShape;
        return;
    }
    
    // 尝试向上移动后旋转（用于底部碰撞）
    if (!checkCollision(currentPiece, 0, -1, rotatedShape)) {
        currentPiece.y -= 1;
        currentPiece.shape = rotatedShape;
        return;
    }
}

// 硬下落（直接落到底部）
function hardDrop() {
    while (movePiece(0, 1)) {
        // 每下落一格增加1分
        score += 1;
    }
    updateScore();
    drawBoard(); // 硬下落后重绘
    lockPiece();
}

// 绘制单个方块
function drawBlock(ctx, x, y, color, size = BLOCK_SIZE) {
    // 清空背景
    ctx.fillStyle = '#374151';
    ctx.fillRect(x * size, y * size, size, size);
    
    // 绘制方块
    if (color !== 0) {
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(`--tw-color-${color}`) || 
                        `var(--tw-color-${color})` || 
                        getColorByName(color);
        ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
        
        // 添加高光效果
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x * size + 2, y * size + 2, size - 4, Math.floor((size - 4) / 2));
        
        // 添加阴影效果
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x * size + 2, y * size + Math.floor((size - 4) / 2) + 2, size - 4, Math.ceil((size - 4) / 2));
    }
    
    // 绘制网格线
    ctx.strokeStyle = '#4B5563';
    ctx.strokeRect(x * size, y * size, size, size);
}

// 根据颜色名获取颜色值
function getColorByName(name) {
    const colorMap = {
        'I': '#00F0FF',
        'J': '#0000FF',
        'L': '#FF7F00',
        'O': '#FFFF00',
        'S': '#00FF00',
        'T': '#800080',
        'Z': '#FF0000'
    };
    return colorMap[name] || '#FFFFFF';
}

// 绘制游戏板
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景网格
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            drawBlock(ctx, x, y, board[y][x]);
        }
    }
    
    // 绘制当前方块
    if (currentPiece) {
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (currentPiece.shape[y][x]) {
                    const drawX = currentPiece.x + x;
                    const drawY = currentPiece.y + y;
                    
                    // 只绘制在可见区域内的方块
                    if (drawY >= 0) {
                        drawBlock(ctx, drawX, drawY, currentPiece.color);
                    }
                }
            }
        }
    }
    
    // 绘制下一个方块预览
    drawNextPiece();
}

// 绘制下一个方块预览
function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        // 计算居中位置
        const offsetX = Math.floor((4 - nextPiece.shape[0].length) / 2);
        const offsetY = Math.floor((4 - nextPiece.shape.length) / 2);
        
        for (let y = 0; y < nextPiece.shape.length; y++) {
            for (let x = 0; x < nextPiece.shape[y].length; x++) {
                if (nextPiece.shape[y][x]) {
                    drawBlock(nextCtx, offsetX + x, offsetY + y, nextPiece.color, NEXT_BLOCK_SIZE);
                }
            }
        }
    }
}

// 更新分数显示
function updateScore() {
    scoreDisplay.textContent = score;
}

// 更新等级显示
function updateLevelDisplay() {
    levelDisplay.textContent = level;
}

// 更新消除行数显示
function updateLines() {
    linesDisplay.textContent = lines;
}

// 显示消除行特效
function flashEffect() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 快速恢复正常显示
    setTimeout(() => {
        drawBoard();
    }, 50);
}

// 游戏主循环
function gameLoop(time = 0) {
    if (gameOver) {
        gameOverScreen.classList.remove('hidden');
        finalScore.textContent = `得分：${score}`;
        return;
    }
    
    if (isPaused) {
        pauseScreen.classList.remove('hidden');
        return;
    }
    
    // 隐藏所有遮罩
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    
    // 计算时间差
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    
    // 控制方块下落速度
    if (dropCounter > dropInterval) {
        if (!movePiece(0, 1)) {
            lockPiece();
        }
        dropCounter = 0;
    }
    
    // 绘制游戏
    drawBoard();
    
    // 继续游戏循环
    requestAnimationFrame(gameLoop);
}

// 初始化游戏
function initGame() {
    initBoard();
    currentPiece = generatePiece();
    nextPiece = generatePiece();
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    isPaused = false;
    dropInterval = 1000;
    dropCounter = 0;
    
    // 更新显示
    updateScore();
    updateLevelDisplay();
    updateLines();
    
    // 显示开始屏幕
    startScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
}

// 暂停游戏
function togglePause() {
    isPaused = !isPaused;
    if (!isPaused && !gameOver) {
        lastTime = 0;
        requestAnimationFrame(gameLoop);
    }
}

// 事件监听
function setupEventListeners() {
    // 键盘控制
    document.addEventListener('keydown', (e) => {
        if (gameOver) return;
        
        if (e.code === 'Space') {
            // 空格键：开始游戏或硬下落
            if (startScreen.classList.contains('hidden')) {
                hardDrop();
            } else {
                lastTime = 0;
                requestAnimationFrame(gameLoop);
            }
            e.preventDefault();
        } else if (!isPaused && !startScreen.classList.contains('hidden')) {
            switch (e.code) {
                case 'ArrowLeft':
                    movePiece(-1, 0);
                    drawBoard(); // 移动后重绘
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    movePiece(1, 0);
                    drawBoard(); // 移动后重绘
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    if (movePiece(0, 1)) {
                        score += 1; // 软下落得分
                        updateScore();
                    }
                    drawBoard(); // 移动后重绘
                    e.preventDefault();
                    break;
                case 'ArrowUp':
                    rotatePiece();
                    drawBoard(); // 旋转后重绘
                    e.preventDefault();
                    break;
                case 'KeyP':
                    togglePause();
                    e.preventDefault();
                    break;
            }
        } else if (e.code === 'KeyP') {
            togglePause();
            e.preventDefault();
        }
    });
    
    // 按钮控制
    pauseBtn.addEventListener('click', togglePause);
    resetBtn.addEventListener('click', initGame);
    restartBtn.addEventListener('click', initGame);
    
    // 触摸屏支持（移动设备）
    let touchStartX = 0;
    let touchStartY = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        if (gameOver || isPaused) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        e.preventDefault();
    });
    
    canvas.addEventListener('touchmove', (e) => {
        if (gameOver || isPaused) return;
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const diffX = touchX - touchStartX;
        const diffY = touchY - touchStartY;
        
        // 检测左右移动
        if (Math.abs(diffX) > 20) {
            movePiece(diffX > 0 ? 1 : -1, 0);
            drawBoard(); // 移动后重绘
            touchStartX = touchX;
        }
        
        // 检测向下加速
        if (diffY > 30) {
            if (movePiece(0, 1)) {
                score += 1;
                updateScore();
            }
            drawBoard(); // 移动后重绘
            touchStartY = touchY;
        }
        
        e.preventDefault();
    });
    
    canvas.addEventListener('touchend', (e) => {
        if (gameOver || isPaused) return;
        const touchX = e.changedTouches[0].clientX;
        const touchY = e.changedTouches[0].clientY;
        const diffX = touchX - touchStartX;
        const diffY = touchY - touchStartY;
        
        // 检测轻触（旋转）
        if (Math.abs(diffX) < 20 && Math.abs(diffY) < 20) {
            rotatePiece();
            drawBoard(); // 旋转后重绘
        }
        
        // 检测向上滑动（硬下落）
        if (diffY < -50) {
            hardDrop();
        }
        
        e.preventDefault();
    });
}

// 主程序入口
function main() {
    setupEventListeners();
    initGame();
    drawNextPiece(); // 初始绘制下一个方块预览
}

// 启动游戏
main();