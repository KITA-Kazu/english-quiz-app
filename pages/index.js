import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function QuizApp() {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [gameState, setGameState] = useState('start'); // start, levelSelect, playing, result, review
  const [userName, setUserName] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [wrongQuestions, setWrongQuestions] = useState([]);

  const fetchLeaderboard = async (level) => {
    // ランキングもレベル別に取得
    const { data } = await supabase.from('scores')
      .select('*')
      .eq('level', level) // レベル別に保存している場合
      .order('score', { ascending: false })
      .limit(20);
    setLeaderboard(data || []);
  };

  const startQuiz = async (level) => {
    setSelectedLevel(level);
    // 選んだレベルの問題だけを取得
    const { data } = await supabase.from('questions').select('*').eq('level', level);
    setQuestions(data.sort(() => Math.random() - 0.5)); 
    setGameState('playing');
    setTimeLeft(120);
    setScore(0);
    setCurrentIdx(0);
    setWrongQuestions([]);
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('result');
      submitScore();
    }
  }, [timeLeft, gameState]);

  const submitScore = async () => {
    if (userName) {
      await supabase.from('scores').insert([{ username: userName, score: score, level: selectedLevel }]);
    }
  };

  const currentChoices = useMemo(() => {
    if (!questions[currentIdx]) return [];
    const q = questions[currentIdx];
    return [q.correct_answer, q.dummy1, q.dummy2, q.dummy3].sort(() => Math.random() - 0.5);
  }, [questions, currentIdx]);

  const handleAnswer = (choice) => {
    if (selectedAnswer !== null) return;
    const correct = choice === questions[currentIdx].correct_answer;
    setSelectedAnswer(choice);
    setIsCorrect(correct);
    if (correct) setScore(prev => prev + 2);
    else {
      setScore(prev => prev - 2);
      setWrongQuestions(prev => [...prev, questions[currentIdx]]);
    }
    setTimeout(() => {
      setSelectedAnswer(null);
      setIsCorrect(null);
      if (currentIdx + 1 < questions.length) setCurrentIdx(currentIdx + 1);
      else {
        setQuestions(prev => [...prev].sort(() => Math.random() - 0.5));
        setCurrentIdx(0);
      }
    }, 1000);
  };

  // --- 画面表示 ---

  if (gameState === 'start') {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1>英語学習アプリ</h1>
        <input placeholder="名前を入力" value={userName} onChange={(e) => setUserName(e.target.value)} style={{ padding: '10px', fontSize: '16px' }} /><br/><br/>
        <p>レベルを選択してください</p>
        <button onClick={() => startQuiz(1)} style={{ padding: '15px 30px', margin: '10px', fontSize: '18px', cursor: 'pointer', background: '#4caf50', color: 'white', border: 'none', borderRadius: '5px' }}>高1版 (文型・時制)</button>
        <button onClick={() => startQuiz(3)} style={{ padding: '15px 30px', margin: '10px', fontSize: '18px', cursor: 'pointer', background: '#f44336', color: 'white', border: 'none', borderRadius: '5px' }}>高3版 (応用・入試)</button>
      </div>
    );
  }

  if (gameState === 'playing' && questions.length > 0) {
    const q = questions[currentIdx];
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <div>【レベル{selectedLevel}】残り: {timeLeft}秒</div>
        <div style={{ fontSize: '20px', margin: '20px 0' }}>Q.{currentIdx + 1}: {q.question}</div>
        <div style={{ display: 'grid', gap: '10px', maxWidth: '400px', margin: '0 auto' }}>
          {currentChoices.map((c, i) => {
            let bgColor = '#f0f0f0';
            if (selectedAnswer !== null) {
              if (c === q.correct_answer) bgColor = '#90ee90';
              else if (c === selectedAnswer && !isCorrect) bgColor = '#ffcccb';
            }
            return (
              <button key={i} onClick={() => handleAnswer(c)} style={{ padding: '15px', fontSize: '18px', cursor: 'pointer', backgroundColor: bgColor }}>
                {c}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: '20px' }}>スコア: {score}</div>
      </div>
    );
  }

  if (gameState === 'result' || gameState === 'review') {
    // 以前の result/review 画面をここに配置（簡略化のため中略しますが、以前のコードをそのまま使えます）
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>終了！ スコア: {score}</h1>
        <button onClick={() => setGameState('start')}>トップへ戻る</button>
      </div>
    );
  }
}
