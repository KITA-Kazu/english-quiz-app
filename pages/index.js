import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function QuizApp() {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [gameState, setGameState] = useState('start'); 
  const [userName, setUserName] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [wrongQuestions, setWrongQuestions] = useState([]);
  // --- ヒント用に追加 ---
  const [showHint, setShowHint] = useState(false);

  const fetchLeaderboard = async (level) => {
    const { data } = await supabase.from('scores')
      .select('*')
      .eq('level', level)
      .order('score', { ascending: false })
      .limit(20);
    setLeaderboard(data || []);
  };

  const startQuiz = async (level) => {
    if (!userName) {
      alert("名前を入力してください");
      return;
    }
    setSelectedLevel(level);
    const { data } = await supabase.from('questions').select('*').eq('level', level);
    
    if (!data || data.length === 0) {
      alert("問題がまだ登録されていません");
      return;
    }
    
    setQuestions(data.sort(() => Math.random() - 0.5)); 
    setGameState('playing');
    setTimeLeft(120);
    setScore(0);
    setCurrentIdx(0);
    setWrongQuestions([]);
    setSelectedAnswer(null);
    setShowHint(false); // ヒントをリセット
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

useEffect(() => {
  if (gameState === 'result' || gameState === 'start') {
    fetchLeaderboard(selectedLevel);
  }
}, [gameState, selectedLevel]);
// --- ここまで追加 ---

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
      fetchLeaderboard(selectedLevel);
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

    if (correct) {
      setScore(prev => prev + 2);
    } else {
      setScore(prev => prev - 2);
      setWrongQuestions(prev => [...prev, questions[currentIdx]]);
    }

    setTimeout(() => {
      setSelectedAnswer(null);
      setIsCorrect(null);
      setShowHint(false); // 次の問題へ行くときにヒントを閉じる
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(currentIdx + 1);
      } else {
        setQuestions(prev => [...prev].sort(() => Math.random() - 0.5));
        setCurrentIdx(0);
      }
    }, 1000);
  };

  if (gameState === 'start') {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1>高校英語：レベル別クイズ</h1>
        <input placeholder="名前を入力" value={userName} onChange={(e) => setUserName(e.target.value)} style={{ padding: '10px', fontSize: '16px', marginBottom: '20px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
          <button onClick={() => startQuiz(1)} style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer', background: '#4caf50', color: 'white', border: 'none', borderRadius: '8px', width: '250px' }}>高1版 (文型・時制)</button>
          <button onClick={() => startQuiz(3)} style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer', background: '#f44336', color: 'white', border: 'none', borderRadius: '8px', width: '250px' }}>高3版 (入試演習)</button>
        </div>
      </div>
    );
  }

  if (gameState === 'playing' && questions.length > 0) {
    const q = questions[currentIdx];
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#eee', padding: '10px', borderRadius: '5px', marginBottom: '10px' }}>
          <b>レベル {selectedLevel}</b> | スコア: {score} | 残り: {timeLeft}秒
        </div>
        
        <div style={{ fontSize: '20px', margin: '30px 0', minHeight: '60px' }}>Q.{currentIdx + 1}: {q.question}</div>

        {/* --- ヒント表示エリア --- */}
        <div style={{ marginBottom: '20px', minHeight: '40px' }}>
          {showHint ? (
            <div style={{ color: '#007bff', background: '#e7f3ff', padding: '10px', borderRadius: '5px', display: 'inline-block' }}>
              💡 和訳：{q.japanese_text}
            </div>
          ) : (
            <button 
              onClick={() => setShowHint(true)} 
              style={{ background: '#ffc107', border: 'none', padding: '8px 15px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ヒントを見る
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gap: '12px', maxWidth: '400px', margin: '0 auto' }}>
          {currentChoices.map((c, i) => {
            let bgColor = '#fff';
            if (selectedAnswer !== null) {
              if (c === q.correct_answer) bgColor = '#90ee90';
              else if (c === selectedAnswer && !isCorrect) bgColor = '#ffcccb';
            }
            return (
              <button key={i} onClick={() => handleAnswer(c)} style={{ padding: '15px', fontSize: '18px', cursor: 'pointer', backgroundColor: bgColor, border: '2px solid #ddd', borderRadius: '10px' }}>
                {c}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (gameState === 'result' || gameState === 'review') {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1>{gameState === 'result' ? '終了！' : '復習モード'}</h1>
        <p style={{ fontSize: '24px' }}>最終スコア: {score} 点</p>
        {gameState === 'result' ? (
          <div>
            <button onClick={() => setGameState('review')} style={{ padding: '10px 20px', margin: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>間違えた問題を復習する</button>
            <button onClick={() => setGameState('start')} style={{ padding: '10px 20px', margin: '10px' }}>トップへ戻る</button>
          </div>
        ) : (
          <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
            {wrongQuestions.map((q, i) => (
              <div key={i} style={{ borderBottom: '1px solid #ccc', padding: '15px 0' }}>
                <div style={{ fontWeight: 'bold' }}>Q. {q.question}</div>
                <div style={{ color: 'green' }}>正解: {q.correct_answer}</div>
                <div style={{ color: 'blue' }}>和訳: {q.japanese_text}</div>
                <div style={{ color: '#555', fontSize: '14px', marginTop: '5px' }}>解説: {q.explanation}</div>
              </div>
            ))}
            <button onClick={() => setGameState('start')} style={{ marginTop: '20px', padding: '10px 20px', width: '100%' }}>トップへ戻る</button>
          </div>
        )}
      </div>
    );
  }
}
