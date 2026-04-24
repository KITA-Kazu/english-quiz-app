import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function QuizApp() {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [gameState, setGameState] = useState('start'); // start, playing, result, review
  const [userName, setUserName] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null); // 選んだ選択肢
  const [isCorrect, setIsCorrect] = useState(null); // 正誤判定
  const [wrongQuestions, setWrongQuestions] = useState([]); // 間違えた問題リスト

  // ランキング取得
  const fetchLeaderboard = async () => {
    const { data } = await supabase.from('scores').select('*').order('score', { ascending: false }).limit(20);
    setLeaderboard(data || []);
  };

  useEffect(() => { fetchLeaderboard(); }, []);

  // クイズ開始
  const startQuiz = async () => {
    const { data } = await supabase.from('questions').select('*');
    setQuestions(data.sort(() => Math.random() - 0.5)); 
    setGameState('playing');
    setTimeLeft(120);
    setScore(0);
    setCurrentIdx(0);
    setWrongQuestions([]);
    setSelectedAnswer(null);
  };

  // タイマー処理
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
      await supabase.from('scores').insert([{ username: userName, score: score }]);
      fetchLeaderboard();
    }
  };

  // 現在の問題の選択肢をランダムに固定（1秒ごとに変わらないようにする）
  const currentChoices = useMemo(() => {
    if (!questions[currentIdx]) return [];
    const q = questions[currentIdx];
    return [q.correct_answer, q.dummy1, q.dummy2, q.dummy3].sort(() => Math.random() - 0.5);
  }, [questions, currentIdx]);

  const handleAnswer = (choice) => {
    if (selectedAnswer !== null) return; // 連続クリック防止

    const correct = choice === questions[currentIdx].correct_answer;
    setSelectedAnswer(choice);
    setIsCorrect(correct);

    if (correct) {
      setScore(prev => prev + 2);
    } else {
      setScore(prev => prev - 2);
      // 間違えた問題を記録
      setWrongQuestions(prev => [...prev, questions[currentIdx]]);
    }

    // 1秒待ってから次の問題へ
    setTimeout(() => {
      setSelectedAnswer(null);
      setIsCorrect(null);
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(currentIdx + 1);
      } else {
        // 50問終わったらシャッフルしてループ
        setQuestions(prev => [...prev].sort(() => Math.random() - 0.5));
        setCurrentIdx(0);
      }
    }, 1000);
  };

  if (gameState === 'start') {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1>English Quiz Ranking</h1>
        <input placeholder="名前を入力" value={userName} onChange={(e) => setUserName(e.target.value)} style={{ padding: '10px', fontSize: '16px' }} />
        <button onClick={startQuiz} style={{ padding: '10px 20px', marginLeft: '10px', fontSize: '16px', cursor: 'pointer' }}>開始！</button>
        <h2>Top 20 Ranking</h2>
        {leaderboard.map((entry, i) => (
          <div key={i}>{entry.username}: {entry.score}点</div>
        ))}
      </div>
    );
  }

  if (gameState === 'playing' && questions.length > 0) {
    const q = questions[currentIdx];
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'red' }}>残り: {timeLeft}秒</div>
        <div style={{ fontSize: '20px', margin: '20px 0' }}>Q.{currentIdx + 1}: {q.question}</div>
        <div style={{ display: 'grid', gap: '10px', maxWidth: '400px', margin: '0 auto' }}>
          {currentChoices.map((c, i) => {
            let bgColor = '#f0f0f0';
            if (selectedAnswer !== null) {
              if (c === q.correct_answer) bgColor = '#90ee90'; // 正解は常に緑
              else if (c === selectedAnswer && !isCorrect) bgColor = '#ffcccb'; // 間違えたら赤
            }
            return (
              <button key={i} onClick={() => handleAnswer(c)} style={{ padding: '15px', fontSize: '18px', cursor: 'pointer', backgroundColor: bgColor, border: '1px solid #ccc' }}>
                {c}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: '20px', fontSize: '20px' }}>スコア: {score}</div>
      </div>
    );
  }

  if (gameState === 'result') {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1>終了！</h1>
        <p style={{ fontSize: '28px' }}>スコア: {score}</p>
        <button onClick={() => setGameState('review')} style={{ padding: '10px 20px', fontSize: '16px', margin: '5px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>復習する</button>
        <button onClick={() => setGameState('start')} style={{ padding: '10px 20px', fontSize: '16px', margin: '5px' }}>トップへ</button>
      </div>
    );
  }

  if (gameState === 'review') {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h1>復習モード</h1>
        {wrongQuestions.length === 0 ? <p>全問正解です！素晴らしい！</p> : (
          wrongQuestions.map((q, i) => (
            <div key={i} style={{ borderBottom: '1px solid #ccc', padding: '10px', textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold' }}>Q. {q.question}</div>
              <div style={{ color: 'green' }}>正解: {q.correct_answer}</div>
              <div style={{ color: 'blue' }}>和訳: {q.japanese_text || '（和訳データなし）'}</div>
              <div style={{ color: 'gray', fontSize: '14px' }}>解説: {q.explanation || '特にありません。'}</div>
            </div>
          ))
        )}
        <button onClick={() => setGameState('start')} style={{ marginTop: '20px', padding: '10px 20px' }}>トップへ戻る</button>
      </div>
    );
  }
}
