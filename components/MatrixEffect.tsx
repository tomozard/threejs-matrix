'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface Column {
  x: number
  characters: Character[]
  speed: number
  nextCharTime: number
}

interface Character {
  mesh: THREE.Mesh
  life: number
  fadeSpeed: number
  fallSpeed: number
}

export default function MatrixEffect() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const columnsRef = useRef<Column[]>([])
  const speedMultiplierRef = useRef(1)
  const lastTimeRef = useRef(0)
  const frameCountRef = useRef(0)
  const fpsRef = useRef(0)
  const animationIdRef = useRef<number>()

  const matrixChars = [
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
  ]

  const init = () => {
    if (!containerRef.current) return

    // Scene setup
    sceneRef.current = new THREE.Scene()
    sceneRef.current.background = new THREE.Color(0x000000)

    // Camera setup
    cameraRef.current = new THREE.OrthographicCamera(
      window.innerWidth / -2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      window.innerHeight / -2,
      1,
      1000
    )
    cameraRef.current.position.z = 100

    // Renderer setup
    rendererRef.current = new THREE.WebGLRenderer({ antialias: true })
    rendererRef.current.setSize(window.innerWidth, window.innerHeight)
    containerRef.current.appendChild(rendererRef.current.domElement)

    // Calculate column count based on screen width
    const columnCount = Math.floor(window.innerWidth / 15)
    createColumns(columnCount)
  }

  const createColumns = (columnCount: number) => {
    const columnWidth = window.innerWidth / columnCount

    columnsRef.current = []
    for (let i = 0; i < columnCount; i++) {
      const column: Column = {
        x: (i * columnWidth) - (window.innerWidth / 2) + (columnWidth / 2),
        characters: [],
        speed: Math.random() * 2 + 1,
        nextCharTime: Math.random() * 2000
      }
      columnsRef.current.push(column)
    }
  }

  const createCharacter = (x: number, y: number): Character => {
    const char = matrixChars[Math.floor(Math.random() * matrixChars.length)]
    
    // Weighted random font size (smaller sizes more frequent)
    // 20px: 40%, 21px: 25%, 22px: 15%, 23px: 10%, 24px: 6%, 25px: 3%, 26px: 1%
    const rand = Math.random()
    let fontSize: number
    if (rand < 0.4) fontSize = 20
    else if (rand < 0.65) fontSize = 21
    else if (rand < 0.8) fontSize = 22
    else if (rand < 0.9) fontSize = 23
    else if (rand < 0.96) fontSize = 24
    else if (rand < 0.99) fontSize = 25
    else fontSize = 26
    const canvasSize = Math.max(32, fontSize + 8) // Adjust canvas size based on font
    const planeSize = fontSize + 4 // Adjust plane size based on font

    // Create canvas for text texture
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    canvas.width = canvasSize
    canvas.height = canvasSize

    // Draw character
    context.fillStyle = '#00ff00'
    context.font = `${fontSize}px monospace`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(char, canvasSize / 2, canvasSize / 2)

    // Create texture and material
    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0
    })

    // Create geometry and mesh with variable size
    const geometry = new THREE.PlaneGeometry(planeSize, planeSize)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, 0)

    const character: Character = {
      mesh: mesh,
      life: 1.0,
      fadeSpeed: Math.random() * 0.008 + 0.002,
      fallSpeed: Math.random() * 4 + 3
    }

    sceneRef.current?.add(mesh)
    return character
  }

  const updateColumns = () => {
    const currentTime = Date.now()

    columnsRef.current.forEach((column) => {
      // Add new character at top
      if (currentTime > column.nextCharTime) {
        const newChar = createCharacter(
          column.x,
          window.innerHeight / 2 + 50
        )
        column.characters.push(newChar)
        column.nextCharTime = currentTime + (Math.random() * 200 + 50) / speedMultiplierRef.current
      }

      // Update existing characters
      for (let i = column.characters.length - 1; i >= 0; i--) {
        const char = column.characters[i]

        // Move character down
        char.mesh.position.y -= char.fallSpeed * speedMultiplierRef.current

        // Fade character
        if (char.mesh.position.y < -window.innerHeight / 4) {
          char.life -= char.fadeSpeed * speedMultiplierRef.current * 2
        } else {
          char.life -= char.fadeSpeed * speedMultiplierRef.current * 0.3
        }
        if (Array.isArray(char.mesh.material)) {
          char.mesh.material.forEach(material => {
            if ('opacity' in material) {
              material.opacity = Math.max(0, char.life)
            }
          })
        } else if ('opacity' in char.mesh.material) {
          char.mesh.material.opacity = Math.max(0, char.life)
        }

        // Remove character if it's off screen or fully faded
        if (char.mesh.position.y < -window.innerHeight / 2 - 100 || char.life <= 0) {
          sceneRef.current?.remove(char.mesh)
          char.mesh.geometry.dispose()
          if (Array.isArray(char.mesh.material)) {
            char.mesh.material.forEach(material => material.dispose())
          } else {
            char.mesh.material.dispose()
          }
          column.characters.splice(i, 1)
        }
      }
    })
  }

  const updateFPS = () => {
    const now = performance.now()
    frameCountRef.current++

    if (now - lastTimeRef.current >= 1000) {
      fpsRef.current = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current))
      frameCountRef.current = 0
      lastTimeRef.current = now
    }
  }

  const updateStats = () => {
    let totalChars = 0
    columnsRef.current.forEach(column => {
      totalChars += column.characters.length
    })

    const columnCountEl = document.getElementById('columnCount')
    const charCountEl = document.getElementById('charCount')
    const charSetCountEl = document.getElementById('charSetCount')
    const speedValueEl = document.getElementById('speedValue')
    const fpsValueEl = document.getElementById('fpsValue')

    if (columnCountEl) columnCountEl.textContent = columnsRef.current.length.toString()
    if (charCountEl) charCountEl.textContent = totalChars.toString()
    if (charSetCountEl) charSetCountEl.textContent = matrixChars.length.toString()
    if (speedValueEl) speedValueEl.textContent = speedMultiplierRef.current.toFixed(1)
    if (fpsValueEl) fpsValueEl.textContent = fpsRef.current.toString()
  }

  const animate = () => {
    animationIdRef.current = requestAnimationFrame(animate)

    updateColumns()
    updateFPS()
    updateStats()

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }
  }

  useEffect(() => {
    init()
    animate()

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.left = window.innerWidth / -2
        cameraRef.current.right = window.innerWidth / 2
        cameraRef.current.top = window.innerHeight / 2
        cameraRef.current.bottom = window.innerHeight / -2
        cameraRef.current.updateProjectionMatrix()

        rendererRef.current.setSize(window.innerWidth, window.innerHeight)
      }
    }

    const handleClick = () => {
      speedMultiplierRef.current = speedMultiplierRef.current === 1 ? 3 : 1
      updateStats()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'Space':
          speedMultiplierRef.current = speedMultiplierRef.current === 0 ? 1 : 0
          break
        case 'ArrowUp':
          speedMultiplierRef.current = Math.min(5, speedMultiplierRef.current + 0.5)
          updateStats()
          break
        case 'ArrowDown':
          speedMultiplierRef.current = Math.max(0.1, speedMultiplierRef.current - 0.5)
          updateStats()
          break
      }
    }

    window.addEventListener('resize', handleResize)
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)

      // Cleanup Three.js objects
      columnsRef.current.forEach(column => {
        column.characters.forEach(char => {
          sceneRef.current?.remove(char.mesh)
          char.mesh.geometry.dispose()
          if (Array.isArray(char.mesh.material)) {
            char.mesh.material.forEach(material => material.dispose())
          } else {
            char.mesh.material.dispose()
          }
        })
      })

      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }
    }
  }, [])

  return (
    <>
      <div ref={containerRef} id="container" />
      <div id="info">
        Matrix Effect - Multi-Language<br />
        กดเมาส์เพื่อเปลี่ยนความเร็ว<br />
        Space = หยุด/เล่น<br />
        ↑↓ = ปรับความเร็ว
      </div>
      <div id="stats">
        <div>คอลัมน์: <span id="columnCount">-</span></div>
        <div>ตัวอักษร: <span id="charCount">-</span></div>
        <div>ชุดอักขระ: <span id="charSetCount">-</span></div>
        <div>ความเร็ว: <span id="speedValue">1.0</span>x</div>
        <div>FPS: <span id="fpsValue">-</span></div>
      </div>
    </>
  )
}