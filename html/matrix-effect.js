class MatrixEffect {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.columns = [];
        this.columnCount = 0;
        this.characters = [];
        this.speedMultiplier = 1;

        // สำหรับแสดงสถิติ
        this.lastTime = 0;
        this.frameCount = 0;
        this.fps = 0;

        // Matrix characters (Multi-language characters)
        this.matrixChars = [
            // Japanese Katakana
            'ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ',
            'サ', 'シ', 'ス', 'セ', 'ソ', 'タ', 'チ', 'ツ', 'テ', 'ト',
            'ナ', 'ニ', 'ヌ', 'ネ', 'ノ', 'ハ', 'ヒ', 'フ', 'ヘ', 'ホ',
            'マ', 'ミ', 'ム', 'メ', 'モ', 'ヤ', 'ユ', 'ヨ', 'ラ', 'リ',
            'ル', 'レ', 'ロ', 'ワ', 'ヲ', 'ン',

            // Japanese Hiragana
            'あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ',
            'さ', 'し', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と',

            // Korean Hangul
            'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ',
            'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ', 'ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ',
            '가', '나', '다', '라', '마', '바', '사', '아', '자', '차',

            // Arabic
            'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر',
            'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف',
            'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي',

            // Russian Cyrillic
            'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И',
            'Й', 'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т',
            'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь',
            'Э', 'Ю', 'Я',

            // Thai
            'ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ญ', 'ด',
            'ต', 'ถ', 'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ',
            'ฟ', 'ภ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส',
            'ห', 'ฬ', 'อ', 'ฮ',

            // English (uppercase and lowercase)
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
            'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
            'U', 'V', 'W', 'X', 'Y', 'Z',
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
            'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
            'u', 'v', 'w', 'x', 'y', 'z',

            // French accented characters
            'À', 'Á', 'Â', 'Ã', 'Ä', 'Å', 'Æ', 'Ç', 'È', 'É',
            'Ê', 'Ë', 'Ì', 'Í', 'Î', 'Ï', 'Ñ', 'Ò', 'Ó', 'Ô',
            'Õ', 'Ö', 'Ù', 'Ú', 'Û', 'Ü', 'Ý',
            'à', 'á', 'â', 'ã', 'ä', 'å', 'æ', 'ç', 'è', 'é',
            'ê', 'ë', 'ì', 'í', 'î', 'ï', 'ñ', 'ò', 'ó', 'ô',
            'õ', 'ö', 'ù', 'ú', 'û', 'ü', 'ý', 'ÿ',

            // Numbers and symbols
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
            ':', '・', '"', '=', '*', '+', '-', '<', '>', '¦', '|',
            'ﾊ', 'ﾐ', 'ﾋ', 'ｰ', '§', '¤', '©', '®', '°', '±',
            '×', '÷', '∞', '∑', '∆', '∏', '√', '∫', '≈', '≠',
            '≤', '≥', '∈', '∉', '∩', '∪', '⊂', '⊃', '⊆', '⊇'
        ];

        this.init();
        this.createColumns();
        this.animate();
        this.setupEventListeners();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Camera setup
        this.camera = new THREE.OrthographicCamera(
            window.innerWidth / -2,
            window.innerWidth / 2,
            window.innerHeight / 2,
            window.innerHeight / -2,
            1,
            1000
        );
        this.camera.position.z = 100;

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('container').appendChild(this.renderer.domElement);

        // Calculate column count based on screen width (เพิ่มความหนาแน่น)
        this.columnCount = Math.floor(window.innerWidth / 15);

        // อัพเดทการแสดงผล
        this.updateStats();
    }

    createColumns() {
        const fontSize = 16;
        const columnWidth = window.innerWidth / this.columnCount;

        for (let i = 0; i < this.columnCount; i++) {
            const column = {
                x: (i * columnWidth) - (window.innerWidth / 2) + (columnWidth / 2),
                characters: [],
                speed: Math.random() * 2 + 1,
                nextCharTime: Math.random() * 2000
            };

            this.columns.push(column);
        }
    }

    createCharacter(x, y) {
        const char = this.matrixChars[Math.floor(Math.random() * this.matrixChars.length)];

        // Create canvas for text texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 32;
        canvas.height = 32;

        // Draw character
        context.fillStyle = '#00ff00';
        context.font = '20px monospace';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(char, 16, 16);

        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 1.0
        });

        // Create geometry and mesh
        const geometry = new THREE.PlaneGeometry(20, 20);
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(x, y, 0);

        const character = {
            mesh: mesh,
            life: 1.0,
            // ลดความเร็วการจางให้ช้าลง เพื่อให้ไหลถึงด้านล่าง
            fadeSpeed: Math.random() * 0.008 + 0.002,
            // เพิ่มความเร็วการตกเล็กน้อย
            fallSpeed: Math.random() * 4 + 3
        };

        this.scene.add(mesh);
        return character;
    }

    updateColumns() {
        const currentTime = Date.now();

        this.columns.forEach((column, columnIndex) => {
            // Add new character at top
            if (currentTime > column.nextCharTime) {
                const newChar = this.createCharacter(
                    column.x,
                    window.innerHeight / 2 + 50
                );
                column.characters.push(newChar);
                // เพิ่มความถี่การสร้างตัวอักษร (ลดเวลารอ)
                column.nextCharTime = currentTime + (Math.random() * 200 + 50) / this.speedMultiplier;
            }

            // Update existing characters
            for (let i = column.characters.length - 1; i >= 0; i--) {
                const char = column.characters[i];

                // Move character down
                char.mesh.position.y -= char.fallSpeed * this.speedMultiplier;

                // Fade character เฉพาะเมื่อใกล้ด้านล่าง
                if (char.mesh.position.y < -window.innerHeight / 4) {
                    char.life -= char.fadeSpeed * this.speedMultiplier * 2;
                } else {
                    // จางช้าๆ ในส่วนบน
                    char.life -= char.fadeSpeed * this.speedMultiplier * 0.3;
                }
                char.mesh.material.opacity = Math.max(0, char.life);

                // Remove character if it's off screen or fully faded
                if (char.mesh.position.y < -window.innerHeight / 2 - 100 || char.life <= 0) {
                    this.scene.remove(char.mesh);
                    char.mesh.geometry.dispose();
                    char.mesh.material.dispose();
                    column.characters.splice(i, 1);
                }
            }
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.updateColumns();
        this.updateFPS();
        this.updateStats();
        this.renderer.render(this.scene, this.camera);
    }

    updateFPS() {
        const now = performance.now();
        this.frameCount++;

        if (now - this.lastTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
            this.frameCount = 0;
            this.lastTime = now;
        }
    }

    updateStats() {
        // นับจำนวนตัวอักษรทั้งหมด
        let totalChars = 0;
        this.columns.forEach(column => {
            totalChars += column.characters.length;
        });

        // อัพเดทการแสดงผล
        const columnCountEl = document.getElementById('columnCount');
        const charCountEl = document.getElementById('charCount');
        const charSetCountEl = document.getElementById('charSetCount');
        const speedValueEl = document.getElementById('speedValue');
        const fpsValueEl = document.getElementById('fpsValue');

        if (columnCountEl) columnCountEl.textContent = this.columnCount;
        if (charCountEl) charCountEl.textContent = totalChars;
        if (charSetCountEl) charSetCountEl.textContent = this.matrixChars.length;
        if (speedValueEl) speedValueEl.textContent = this.speedMultiplier.toFixed(1);
        if (fpsValueEl) fpsValueEl.textContent = this.fps;
    }

    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.left = window.innerWidth / -2;
            this.camera.right = window.innerWidth / 2;
            this.camera.top = window.innerHeight / 2;
            this.camera.bottom = window.innerHeight / -2;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Handle mouse click to change speed
        document.addEventListener('click', () => {
            this.speedMultiplier = this.speedMultiplier === 1 ? 3 : 1;
            this.updateStats();
        });

        // Handle keyboard events
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'Space':
                    this.speedMultiplier = this.speedMultiplier === 0 ? 1 : 0;
                    break;
                case 'ArrowUp':
                    this.speedMultiplier = Math.min(5, this.speedMultiplier + 0.5);
                    this.updateStats();
                    break;
                case 'ArrowDown':
                    this.speedMultiplier = Math.max(0.1, this.speedMultiplier - 0.5);
                    this.updateStats();
                    break;
            }
        });
    }
}

// Initialize Matrix Effect when page loads
window.addEventListener('load', () => {
    new MatrixEffect();
});