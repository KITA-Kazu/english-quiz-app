import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function QuizApp() {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [gameState, setGameState] = useState('start'); // start, playing, result, review
  const [userName, setUserName] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [wrongQuestions, setWrongQuestions] = useState([]);
  const [showHint, setShowHint] = useState(false);

  // ランキング取得
  const fetchLeaderboard = async (level) => {
    const { data } = await supabase.from('scores')
      .select('*')
      .eq('level', level)
      .order('score', { ascending: false })
      .limit(20);
    setLeaderboard(data || []);
  };

  // 画面起動時やレベル切り替え時にランキングを読み込む
  useEffect(() => {
    if (gameState === 'start' || gameState === 'result') {
      fetchLeaderboard(selectedLevel);
    }
  }, [selectedLevel, gameState]);

  // クイズ開始
  const startQuiz = async (level) => {
    if (!userName) {
      alert("名前を入力してください");
      return;
    }
    setSelectedLevel(level);
    const { data } = await supabase.from('questions').select('*').eq('level', level);
    
    if (!data || data.length === 0) {
      alert("問題が見つかりません。Supabaseにデータが入っているか確認してください。");
      return;
    }
    
    setQuestions(data.sort(() => Math.random() - 0.5)); 
    setGameState('playing');
    setTimeLeft(120);
    setScore(0);
    setCurrentIdx(0);
    setWrongQuestions([]);
    setSelectedAnswer(null);
    setShowHint(false);
  };

  // タイマー
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('result');
      submitScore();
    }
  }, [timeLeft, gameState]);

  // スコア送信
  const submitScore = async () => {
    if (userName && score !== 0) {
      await supabase.from('scores').insert([
        { username: userName, score: score, level: selectedLevel }
      ]);
      fetchLeaderboard(selectedLevel);
    }
  };

  // 選択肢シャッフル
  const currentChoices = useMemo(() => {
    if (!questions[currentIdx]) return [];
    const q = questions[currentIdx];
    return [q.correct_answer, q.dummy1, q.dummy2, q.dummy3].sort(() => Math.random() - 0.5);
  }, [questions, currentIdx]);

  // 回答判定
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
      setShowHint(false);
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(currentIdx + 1);
      } else {
        setQuestions(prev => [...prev].sort(() => Math.random() - 0.5));
        setCurrentIdx(0);
      }
    }, 1000);
  };

  // --- 1. スタート画面 ---
  if (gameState === 'start') {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ color: '#333' }}>高校英語：レベル別クイズ</h1>
        <div style={{ marginBottom: '30px' }}>
          <input 
            placeholder="名前を入力してね" 
            value={userName} 
            onChange={(e) => setUserName(e.target.value)} 
            style={{ padding: '12px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc', width: '80%' }} 
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
          <button onClick={() => startQuiz(1)} style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer', background: '#4caf50', color: 'white', border: 'none', borderRadius: '8px', width: '280px', fontWeight: 'bold' }}>
            高1版 (文型・時制)
          </button>
          <button onClick={() => startQuiz(3)} style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer', background: '#f44336', color: 'white', border: 'none', borderRadius: '8px', width: '280px', fontWeight: 'bold' }}>
            高3版 (入試演習)
          </button>
        </div>

        <div style={{ marginTop: '40px' }}>
          <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>ランキング (Top 20)</h2>
          
          {/* レベル切り替えタブ */}
          <div style={{ marginBottom: '15px' }}>
            <button 
              onClick={() => setSelectedLevel(1)} 
              style={{ marginRight: '10px', padding: '5px 15px', borderRadius: '15px', border: '1px solid #4caf50', background: selectedLevel === 1 ? '#4caf50' : '#fff', color: selectedLevel === 1 ? '#fff' : '#4caf50', cursor: 'pointer' }}
            >
              高1の順位
            </button>
            <button 
              onClick={() => setSelectedLevel(3)} 
              style={{ padding: '5px 15px', borderRadius: '15px', border: '1px solid #f44336', background: selectedLevel === 3 ? '#f44336' : '#fff', color: selectedLevel === 3 ? '#fff' : '#f44336', cursor: 'pointer' }}
            >
              高3の順位
            </button>
          </div>

          <div style={{ textAlign: 'left', background: '#fff', padding: '10px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            {leaderboard.length > 0 ? (
              leaderboard.map((entry, index) => (
                <div key={index} style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{index + 1}位: <b>{entry.username}</b></span>
                  <span style={{ color: '#666' }}>{entry.score}点</span>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: '#999' }}>まだレベル {selectedLevel} のデータがありません</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- 2. クイズ画面 ---
  if (gameState === 'playing' && questions.length > 0) {
    const q = questions[currentIdx];
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ background: '#333', color: '#fff', padding: '10px', borderRadius: '5px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Lv.{selectedLevel}</span>
          <span>スコア: {score}</span>
          <span>残り: {timeLeft}秒</span>
        </div>
        
        <div style={{ fontSize: '22px', margin: '40px 0', fontWeight: 'bold', lineHeight: '1.4' }}>
          Q.{currentIdx + 1}<br/>{q.question}
        </div>

        <div style={{ marginBottom: '30px' }}>
          {showHint ? (
            <div style={{ color: '#007bff', background: '#e7f3ff', padding: '12px', borderRadius: '8px', border: '1px solid #b3d7ff' }}>
              💡 和訳：{q.japanese_text}
            </div>
          ) : (
            <button 
              onClick={() => setShowHint(true)} 
              style={{ background: '#ffc107', border: 'none', padding: '10px 20px', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
            >
              ヒントを見る
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gap: '15px' }}>
          {currentChoices.map((c, i) => {
            let bgColor = '#fff';
            if (selectedAnswer !== null) {
              if (c === q.correct_answer) bgColor = '#90ee90';
              else if (c === selectedAnswer && !isCorrect) bgColor = '#ffcccb';
            }
            return (
              <button key={i} onClick={() => handleAnswer(c)} style={{ padding: '18px', fontSize: '18px', cursor: 'pointer', backgroundColor: bgColor, border: '2px solid #ddd', borderRadius: '12px', transition: '0.2s' }}>
                {c}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // --- 3. 結果・復習画面 ---
  if (gameState === 'result' || gameState === 'review') {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <h1>{gameState === 'result' ? 'タイムアップ！' : '復習モード'}</h1>
        <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#007bff' }}>最終スコア: {score} 点</p>
        
        <div style={{ margin: '30px 0' }}>
          <button onClick={() => setGameState('review')} style={{ padding: '12px 20px', margin: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>間違えた問題を復習</button>
          <button onClick={() => setGameState('start')} style={{ padding: '12px 20px', margin: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>トップへ戻る</button>
        </div>

        {gameState === 'result' ? (
          <div style={{ marginTop: '40px' }}>
            <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>レベル {selectedLevel} 最新ランキング</h2>
            <div style={{ textAlign: 'left', background: '#f9f9f9', padding: '15px', borderRadius: '10px' }}>
              {leaderboard.map((entry, index) => (
                <div key={index} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                  {index + 1}位: <b>{entry.username}</b> - {entry.score}点
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'left', marginTop: '30px' }}>
            {wrongQuestions.length === 0 ? <p style={{textAlign: 'center'}}>全問正解です！素晴らしい！</p> : (
              wrongQuestions.map((q, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #ddd', padding: '15px', borderRadius: '10px', marginBottom: '15px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '18px' }}>Q. {q.question}</div>
                  <div style={{ color: '#28a745', margin: '5px 0' }}>✅ 正解: {q.correct_answer}</div>
                  <div style={{ color: '#007bff' }}>📘 和訳: {q.japanese_text}</div>
                  <div style={{ color: '#666', fontSize: '14px', marginTop: '8px', borderTop: '1px dashed #ccc', paddingTop: '8px' }}>💡 解説: {q.explanation}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }
}
