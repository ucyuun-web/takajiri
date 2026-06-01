import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Sparkles, ShieldAlert } from "lucide-react";
import "./style.css";

const MAX_LIVES = 3;
const START_TIME = 50;
const TIME_STEP = 2;

const ANIMAL_SOUNDS = [
  { animal: "🐘", sound: "elephant" },
  { animal: "🐱", sound: "cat" },
  { animal: "🐶", sound: "dog" },
  { animal: "🐸", sound: "frog" },
  { animal: "🐤", sound: "bird" },
  { animal: "🦁", sound: "lion" },
  { animal: "🐼", sound: "panda" },
  { animal: "🐵", sound: "monkey" },
  { animal: "🐰", sound: "rabbit" },
  { animal: "🦊", sound: "fox" },
];

const GROUPS = [
  ["あ", "い", "う", "え", "お"],
  ["か", "き", "く", "け", "こ"],
  ["さ", "し", "す", "せ", "そ"],
  ["た", "ち", "つ", "て", "と"],
  ["な", "に", "ぬ", "ね", "の"],
  ["は", "ひ", "ふ", "へ", "ほ"],
  ["ま", "み", "む", "め", "も"],
  ["や", "ゆ", "よ"],
  ["ら", "り", "る", "れ", "ろ"],
  ["わ", "を", "ん"],
];

function getTimeForLevel(level) {
  return Math.max(10, START_TIME - (level - 1) * TIME_STEP);
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generatePositions(count) {
  const safeSlots = [
    { x: 8, y: 34 }, { x: 38, y: 34 }, { x: 68, y: 34 },
    { x: 8, y: 54 }, { x: 38, y: 54 }, { x: 68, y: 54 },
    { x: 8, y: 74 }, { x: 38, y: 74 }, { x: 68, y: 74 },
  ];
  return shuffle(safeSlots).slice(0, count);
}

function makeRound(group) {
  const shuffledLetters = shuffle(group);
  const positions = generatePositions(group.length);
  return shuffledLetters.map((letter, index) => ({
    id: `${letter}-${Math.random().toString(36).slice(2)}`,
    letter,
    x: positions[index].x,
    y: positions[index].y,
  }));
}

function playTone(type, audioRef) {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  if (!audioRef.current) audioRef.current = new AudioContextClass();
  const ctx = audioRef.current;
  if (ctx.state === "suspended") ctx.resume();

  const now = ctx.currentTime;
  function beep(freq, start, duration, wave = "sine", volume = 0.14) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, now + start);
    gain.gain.setValueAtTime(0.001, now + start);
    gain.gain.exponentialRampToValueAtTime(volume, now + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + duration + 0.02);
  }

  if (type === "wrong") {
    beep(180, 0, 0.2, "square", 0.16);
    beep(90, 0.1, 0.18, "square", 0.12);
  } else if (type === "clear") {
    beep(520, 0, 0.08, "triangle", 0.14);
    beep(780, 0.09, 0.08, "triangle", 0.14);
    beep(1040, 0.18, 0.12, "triangle", 0.14);
  } else {
    beep(620, 0, 0.08, "sine", 0.13);
    beep(980, 0.07, 0.1, "sine", 0.11);
  }
}

function KawaiiTitle() {
  return (
    <div className="kawaii-title">
      <div className="title-chick">🐤</div>
      <div className="title-rabbit">🐰</div>
      <div className="title-star">⭐</div>
      <div className="title-note">🎵</div>
      <div className="title-aiueo">
        <span className="red">あ</span><span className="orange">い</span><span className="yellow">う</span><span className="green">え</span><span className="blue">お</span>
      </div>
      <div className="title-push">プッシュ</div>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState("start");
  const [level, setLevel] = useState(1);
  const [groupQueue, setGroupQueue] = useState([]);
  const [groupIndex, setGroupIndex] = useState(0);
  const [letters, setLetters] = useState([]);
  const [nextIndex, setNextIndex] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(getTimeForLevel(1));
  const [message, setMessage] = useState("レベルをえらんでね");
  const [penalty, setPenalty] = useState(false);
  const audioRef = useRef(null);

  const currentGroup = groupQueue[groupIndex] || GROUPS[0];
  const currentAnimal = ANIMAL_SOUNDS[groupIndex % ANIMAL_SOUNDS.length];
  const nextLetter = currentGroup[nextIndex] || currentGroup[0];

  const resultText = useMemo(() => {
    if (score >= 120) return "すごい！五十音マスターだね！";
    if (score >= 70) return "いい感じ！次の文字をよく見つけられてるよ。";
    if (score >= 30) return "がんばったね。あせらず順番に押そう。";
    return "だいじょうぶ。ゆっくり順番を見ていこう。";
  }, [score]);

  useEffect(() => {
    if (screen !== "playing") return undefined;
    const timer = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          clearInterval(timer);
          setScreen("gameover");
          setMessage("じかんぎれ！");
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [screen]);

  function startGame(selectedLevel) {
    const newQueue = shuffle(GROUPS);
    const firstGroup = newQueue[0];
    setScreen("playing");
    setLevel(selectedLevel);
    setGroupQueue(newQueue);
    setGroupIndex(0);
    setLetters(makeRound(firstGroup));
    setNextIndex(0);
    setLives(MAX_LIVES);
    setScore(0);
    setTimeLeft(getTimeForLevel(selectedLevel));
    setMessage(`まずは『${firstGroup[0]}』をおしてね`);
    setPenalty(false);
  }

  function restartSameLevel() { startGame(level); }
  function startNextLevel() { startGame(level + 1); }

  function completeGroup(newScore) {
    const isLastGroup = groupIndex === groupQueue.length - 1;
    if (isLastGroup) {
      setScore(newScore + 10);
      setScreen("clear");
      setMessage(`レベル${level}クリア！`);
      playTone("clear", audioRef);
      return;
    }
    const nextGroupIndex = groupIndex + 1;
    const nextGroup = groupQueue[nextGroupIndex];
    setGroupIndex(nextGroupIndex);
    setLetters(makeRound(nextGroup));
    setNextIndex(0);
    setScore(newScore + 10);
    setMessage(`つぎのセット！まずは『${nextGroup[0]}』`);
    playTone("clear", audioRef);
  }

  function tapLetter(item) {
    if (screen !== "playing") return;
    if (item.letter !== nextLetter) {
      playTone("wrong", audioRef);
      setPenalty(true);
      setTimeout(() => setPenalty(false), 250);
      setLives((currentLives) => {
        const nextLives = currentLives - 1;
        if (nextLives <= 0) {
          setScreen("gameover");
          setMessage("ゲームおしまい");
        } else {
          setMessage(`ちがうよ。いまは『${nextLetter}』だよ`);
        }
        return Math.max(0, nextLives);
      });
      return;
    }

    playTone("correct", audioRef);
    const newScore = score + 5;
    const isLastLetterInGroup = nextIndex === currentGroup.length - 1;
    setLetters((list) => list.filter((letter) => letter.id !== item.id));
    setScore(newScore);

    if (isLastLetterInGroup) {
      setTimeout(() => completeGroup(newScore), 300);
      return;
    }

    const newNextIndex = nextIndex + 1;
    setNextIndex(newNextIndex);
    setMessage(`せいかい！つぎは『${currentGroup[newNextIndex]}』`);
  }

  return (
    <main className="app-main">
      <div className="background-icons">
        <div className="sun">☀️</div><div className="balloon">🎈</div><div className="rainbow">🌈</div><div className="note">🎵</div>
        <div className="squirrel">🐿️</div><div className="cat-bg">🐱</div><div className="flower">🌷</div><div className="mushroom">🍄</div>
      </div>

      <div className="game-card">
        <div className="header">
          <div className="header-title"><Sparkles size={20} /> <span>あいうえおプッシュ</span></div>
          <div className="level-pill">Lv.{level}</div>
        </div>

        <div className="game-body">
          <div className="status-grid">
            <div className="status pink"><span>スコア</span><b>{score}</b></div>
            <div className="status yellow"><span>つぎ</span><b>{screen === "playing" ? nextLetter : "-"}</b></div>
            <div className="status sky"><span>じかん</span><b>{timeLeft}</b></div>
            <div className="status red"><span>ライフ</span><b>{"❤".repeat(lives) || "0"}</b></div>
          </div>

          <div className={`play-area ${penalty ? "penalty-border" : ""}`}>
            <div className="instruction">
              <h1>あいうえおプッシュ！</h1>
              <p>{message}</p>
            </div>

            <div className="animal-left">{currentAnimal.animal}</div>
            <div className="animal-right">🧸</div>
            <div className="star-deco">⭐</div>
            <div className="flower-deco">🌼</div>

            <AnimatePresence>
              {letters.map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => tapLetter(item)}
                  initial={{ scale: 0, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 1.55, opacity: 0, rotate: 20 }}
                  whileTap={{ scale: 0.86 }}
                  transition={{ type: "spring", stiffness: 280, damping: 14 }}
                  className="letter-button"
                  style={{ left: `${item.x}%`, top: `${item.y}%` }}
                >
                  <span>{item.letter}</span>
                </motion.button>
              ))}
            </AnimatePresence>

            {penalty && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="penalty-popup">
                <div>ちがうよ！</div>
              </motion.div>
            )}

            {screen === "start" && (
              <div className="overlay start-overlay">
                <div className="overlay-inner">
                  <KawaiiTitle />
                  <div className="wood-board">🐻 レベルをえらんでスタート！</div>
                  <div className="level-grid">
                    {[1, 2, 3, 4].map((startLevel) => (
                      <button key={startLevel} onClick={() => startGame(startLevel)} className="level-button">
                        ⭐ レベル{startLevel}<br />{getTimeForLevel(startLevel)}秒
                      </button>
                    ))}
                  </div>
                  <div className="rule-box">50音をぜんぶ消したらクリアだよ！</div>
                </div>
              </div>
            )}

            {screen === "clear" && (
              <div className="overlay clear-overlay">
                <div className="overlay-inner">
                  <div className="big-emoji">🎉</div>
                  <h2>レベル{level}クリア！</h2>
                  <p>つぎはレベル{level + 1}。じかんは{getTimeForLevel(level + 1)}秒！</p>
                  <button onClick={startNextLevel} className="main-button pink-btn">つぎのレベルへ</button>
                  <button onClick={restartSameLevel} className="main-button blue-btn">もういっかい</button>
                </div>
              </div>
            )}

            {screen === "gameover" && (
              <div className="overlay gameover-overlay">
                <div className="overlay-inner">
                  <ShieldAlert size={64} className="gameover-icon" />
                  <h2>ゲームおしまい</h2>
                  <div className="score-final">{score}点</div>
                  <p>{resultText}</p>
                  <button onClick={restartSameLevel} className="main-button pink-btn"><RotateCcw size={20} />もういっかい</button>
                  <button onClick={() => setScreen("start")} className="main-button green-btn">レベルをえらぶ</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
