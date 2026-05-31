import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw, Sparkles, ShieldAlert, Star } from "lucide-react";

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
    { x: 8, y: 34 },
    { x: 38, y: 34 },
    { x: 68, y: 34 },
    { x: 8, y: 54 },
    { x: 38, y: 54 },
    { x: 68, y: 54 },
    { x: 8, y: 74 },
    { x: 38, y: 74 },
    { x: 68, y: 74 },
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

  if (type === "cat") {
    beep(760, 0, 0.08, "sine", 0.16);
    beep(980, 0.07, 0.1, "sine", 0.14);
  } else if (type === "dog") {
    beep(230, 0, 0.08, "square", 0.15);
    beep(180, 0.1, 0.08, "square", 0.13);
  } else if (type === "elephant") {
    beep(160, 0, 0.2, "sawtooth", 0.18);
    beep(320, 0.12, 0.24, "sawtooth", 0.12);
  } else if (type === "frog") {
    beep(130, 0, 0.08, "square", 0.13);
    beep(105, 0.09, 0.1, "square", 0.16);
  } else if (type === "bird") {
    beep(1100, 0, 0.05, "sine", 0.12);
    beep(1450, 0.06, 0.05, "sine", 0.12);
    beep(1250, 0.12, 0.05, "sine", 0.1);
  } else if (type === "lion") {
    beep(90, 0, 0.28, "sawtooth", 0.2);
    beep(130, 0.1, 0.22, "square", 0.12);
  } else if (type === "monkey") {
    beep(640, 0, 0.05, "square", 0.13);
    beep(820, 0.06, 0.05, "square", 0.13);
    beep(640, 0.12, 0.05, "square", 0.11);
  } else if (type === "fox") {
    beep(520, 0, 0.07, "triangle", 0.13);
    beep(700, 0.08, 0.07, "triangle", 0.12);
  } else if (type === "rabbit" || type === "panda") {
    beep(500, 0, 0.06, "sine", 0.1);
    beep(680, 0.07, 0.06, "sine", 0.1);
  } else if (type === "wrong") {
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
    <div className="relative mx-auto w-full rounded-[2.5rem] bg-white border-4 border-pink-200 shadow-xl px-4 py-5 text-center overflow-hidden">
      <div className="absolute -top-2 left-6 text-3xl">🐤</div>
      <div className="absolute -top-1 right-7 text-3xl">🐰</div>
      <div className="absolute bottom-1 left-4 text-xl">⭐</div>
      <div className="absolute bottom-1 right-5 text-xl">🎵</div>
      <div className="text-[2.7rem] leading-none font-black tracking-tight drop-shadow-sm">
        <span className="text-red-500">あ</span>
        <span className="text-orange-400">い</span>
        <span className="text-yellow-500">う</span>
        <span className="text-green-500">え</span>
        <span className="text-sky-500">お</span>
      </div>
      <div className="mt-1 text-[2.4rem] leading-none font-black text-pink-500 drop-shadow-sm">プッシュ</div>
    </div>
  );
}

export default function MobileKanaOrderGame() {
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

  function restartSameLevel() {
    startGame(level);
  }

  function startNextLevel() {
    startGame(level + 1);
  }

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
    <main className="min-h-screen text-slate-950 flex items-center justify-center p-3 select-none overflow-hidden relative bg-gradient-to-b from-sky-300 via-cyan-100 to-lime-200">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-3 left-3 text-6xl animate-bounce">☀️</div>
        <div className="absolute top-10 right-5 text-4xl">🎈</div>
        <div className="absolute top-24 left-16 text-3xl">🌈</div>
        <div className="absolute top-36 right-4 text-3xl">🎵</div>
        <div className="absolute bottom-32 left-3 text-5xl">🐿️</div>
        <div className="absolute bottom-20 right-4 text-5xl">🐱</div>
        <div className="absolute bottom-6 left-20 text-4xl">🌷</div>
        <div className="absolute bottom-7 right-24 text-4xl">🍄</div>
      </div>

      <Card className="w-full max-w-sm rounded-[2.2rem] bg-orange-50/95 border-4 border-white shadow-2xl overflow-hidden relative z-10">
        <CardContent className="p-0">
          <div className="p-4 bg-gradient-to-r from-pink-400 via-yellow-300 to-green-300 text-white border-b-4 border-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-lg drop-shadow-sm">
                <Sparkles className="w-5 h-5" />
                あいうえおプッシュ
              </div>
              <div className="text-sm font-black bg-white/40 px-3 py-1 rounded-full drop-shadow-sm">Lv.{level}</div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-3xl bg-white border-2 border-pink-200 p-2 shadow-md">
                <div className="text-[11px] text-pink-500 font-black">スコア</div>
                <div className="text-xl font-black">{score}</div>
              </div>
              <div className="rounded-3xl bg-white border-2 border-yellow-300 p-2 shadow-md">
                <div className="text-[11px] text-orange-500 font-black">つぎ</div>
                <div className="text-xl font-black text-orange-500">{screen === "playing" ? nextLetter : "-"}</div>
              </div>
              <div className="rounded-3xl bg-white border-2 border-sky-300 p-2 shadow-md">
                <div className="text-[11px] text-sky-500 font-black">じかん</div>
                <div className="text-xl font-black text-sky-600">{timeLeft}</div>
              </div>
              <div className="rounded-3xl bg-white border-2 border-red-200 p-2 shadow-md">
                <div className="text-[11px] text-red-500 font-black">ライフ</div>
                <div className="text-xl font-black text-red-500">{"❤".repeat(lives) || "0"}</div>
              </div>
            </div>

            <div className={`relative h-[500px] rounded-[2.2rem] overflow-hidden border-4 shadow-inner bg-gradient-to-b from-sky-100 via-white to-green-100 ${penalty ? "border-red-400" : "border-yellow-200"}`}>
              <div className="absolute left-4 right-4 top-4 z-10 rounded-[2rem] bg-white/95 border-4 border-yellow-200 p-4 shadow-lg text-center">
                <h1 className="text-2xl font-black leading-snug text-pink-500">ひらがなをじゅんばんにタップ！</h1>
                <p className="text-base font-black text-slate-700 mt-1">{message}</p>
              </div>

              <div className="absolute left-2 bottom-2 text-5xl">{currentAnimal.animal}</div>
              <div className="absolute right-2 bottom-2 text-5xl">🧸</div>
              <div className="absolute left-5 top-28 text-2xl">⭐</div>
              <div className="absolute right-6 top-32 text-2xl">🌼</div>

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
                    className="absolute z-0 w-24 h-24 rounded-full bg-white border-[7px] border-pink-300 shadow-xl text-5xl font-black text-blue-500"
                    style={{ left: `${item.x}%`, top: `${item.y}%` }}
                  >
                    <span className="drop-shadow-sm">{item.letter}</span>
                  </motion.button>
                ))}
              </AnimatePresence>

              {penalty && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-red-300/30">
                  <div className="rounded-[2rem] bg-white border-4 border-red-400 px-6 py-4 text-red-500 text-3xl font-black shadow-xl">ちがうよ！</div>
                </motion.div>
              )}

              {screen === "start" && (
                <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-sky-100/95 backdrop-blur-sm">
                  <div className="text-center space-y-4 w-full">
                    <KawaiiTitle />
                    <div className="rounded-[2rem] bg-amber-200 border-4 border-amber-400 shadow-lg p-3 font-black text-amber-900">
                      🐻 レベルをえらんでスタート！
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((startLevel) => (
                        <Button key={startLevel} onClick={() => startGame(startLevel)} className="h-20 rounded-[2rem] text-lg bg-gradient-to-b from-pink-300 to-pink-500 hover:scale-105 text-white font-black shadow-lg border-4 border-white leading-tight">
                          <span>⭐ レベル{startLevel}<br />{getTimeForLevel(startLevel)}秒</span>
                        </Button>
                      ))}
                    </div>
                    <div className="rounded-[2rem] bg-white/90 border-4 border-green-200 p-3 text-sm font-black text-green-700">
                      50音をぜんぶ消したらクリアだよ！
                    </div>
                  </div>
                </div>
              )}

              {screen === "clear" && (
                <div className="absolute inset-0 z-30 flex items-center justify-center p-5 bg-yellow-100/95 backdrop-blur-sm">
                  <div className="text-center space-y-4 w-full">
                    <div className="text-7xl">🎉</div>
                    <h2 className="text-3xl font-black text-pink-500">レベル{level}クリア！</h2>
                    <p className="text-slate-700 font-black">つぎはレベル{level + 1}。じかんは{getTimeForLevel(level + 1)}秒！</p>
                    <Button onClick={startNextLevel} className="w-full h-16 rounded-[2rem] text-xl bg-gradient-to-r from-pink-400 to-orange-300 hover:scale-105 text-white font-black shadow-lg border-4 border-white">つぎのレベルへ</Button>
                    <Button onClick={restartSameLevel} className="w-full h-16 rounded-[2rem] text-xl bg-gradient-to-r from-sky-400 to-blue-500 hover:scale-105 text-white font-black shadow-lg border-4 border-white">もういっかい</Button>
                  </div>
                </div>
              )}

              {screen === "gameover" && (
                <div className="absolute inset-0 z-30 flex items-center justify-center p-5 bg-white/92 backdrop-blur-sm">
                  <div className="text-center space-y-4 w-full">
                    <ShieldAlert className="w-16 h-16 mx-auto text-red-500" />
                    <h2 className="text-3xl font-black text-red-500">ゲームおしまい</h2>
                    <p className="text-5xl font-black text-blue-500">{score}点</p>
                    <p className="text-slate-700 font-black">{resultText}</p>
                    <Button onClick={restartSameLevel} className="w-full h-16 rounded-[2rem] text-xl bg-gradient-to-r from-pink-400 to-orange-300 hover:scale-105 text-white font-black shadow-lg border-4 border-white">
                      <RotateCcw className="w-5 h-5 mr-2" />もういっかい
                    </Button>
                    <Button onClick={() => setScreen("start")} className="w-full h-16 rounded-[2rem] text-xl bg-gradient-to-r from-green-400 to-lime-500 hover:scale-105 text-white font-black shadow-lg border-4 border-white">レベルをえらぶ</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
