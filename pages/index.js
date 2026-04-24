import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function QuizApp() {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [gameState, setGameState] = useState('start'); // start, playing, result
  const [userName, setUserName] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);

  // ランキング取得
  const fetchLeaderboard = async () => {
    const { data } = await supabase.from('scores').select('*').order('score', { ascending: false }).limit(20);
    setLeaderboard(data || []);
  };

  useEffect(() => { fetchLeaderboard(); }, []);

  // クイズ開始
  const startQuiz = async () => {
    const { data } = await supabase.from('questions').select('*');
    // データを取得した瞬間に一度だけシャッフルして保存する
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setGameState('playing');
    setTimeLeft(120);
    setScore(0);
    setCurrentIdx(0);
  };

  // タイマー処理
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setGameState('result');
      submitScore();
    }
  }, [timeLeft, gameState]);

  // スコア送信
  const submitScore = async () => {
    if (userName) {
      await supabase.from('scores').insert([{ username: userName, score: score }]);
      fetchLeaderboard();
    }
  };

  const handleAnswer = (isCorrect) => {
    if (isCorrect) setScore(score + 1);
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setGameState('result');
      submitScore();
    }
  };

  if (gameState === 'start') {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1>English Quiz Ranking</h1>
        <input 
          placeholder="名前を入力" 
          value={userName} 
          onChange={(e) => setUserName(e.target.value)}
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <button onClick={startQuiz} style={{ padding: '10px 20px', marginLeft: '10px', fontSize: '16px', cursor: 'pointer' }}>開始！</button>
        <h2>Top 20 Ranking</h2>
        <table style={{ margin: '0 auto', width: '300px', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '2px solid #333' }}><th>Name</th><th>Score</th></tr></thead>
          <tbody>
            {leaderboard.map((entry, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #ddd' }}><td>{entry.username}</td><td>{entry.score}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

 if (gameState === 'playing' && questions.length > 0) {
    const q = questions[currentIdx];
    // 選択肢を固定するために、q.choices のようなデータを使うか、
    // シンプルに今回はシャッフルを外して固定順にします
    const choices = [q.correct_answer, q.dummy1, q.dummy2, q.dummy3];
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'red' }}>残り: {timeLeft}秒</div>
        <div style={{ fontSize: '20px', margin: '20px 0' }}>{q.question}</div>
        <div style={{ display: 'grid', gap: '10px', maxWidth: '400px', margin: '0 auto' }}>
          {choices.map((c, i) => (
            <button key={i} onClick={() => handleAnswer(c === q.correct_answer)} style={{ padding: '15px', fontSize: '18px', cursor: 'pointer' }}>
              {c}
            </button>
          ))}
        </div>
        <div style={{ marginTop: '20px' }}>現在のスコア: {score}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>終了！</h1>
      <p style={{ fontSize: '24px' }}>あなたのスコア: {score}</p>
      <button onClick={() => setGameState('start')} style={{ padding: '10px 20px', fontSize: '16px' }}>トップに戻る</button>
    </div>
  );
}
