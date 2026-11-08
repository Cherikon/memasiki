import React, { useEffect, useReducer, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { newRound, roundReducer } from './round.js';
import './style.css';

const asset = (name) => `${import.meta.env.BASE_URL}game/${name}`;
const picture = (id) => asset(`${id}.png`);
const copy = [
  {
    title: 'МЕМАСИКИ', quiz: 'Викторина по мемам', intro: 'Узнай мем по картинке и выбери правильный ответ.',
    start: 'Начать игру', menu: 'В меню', score: 'Счёт', question: 'Вопрос', frame: 'Кадр из игры',
    right: 'Верно! +1', wrong: 'Мимо. Попробуй ещё.', result: 'Твой результат', again: 'Сыграть ещё',
    mute: 'Выключить звук', unmute: 'Включить звук', keys: 'Ответить', loading: 'Загружаем игру…',
    failed: 'Не удалось загрузить игру. Импортируй ресурсы командой npm run import-game и обнови страницу.',
  },
  {
    title: 'MEMASIKI', quiz: 'Meme quiz', intro: 'Recognize the meme and pick the right answer.',
    start: 'Start game', menu: 'Main menu', score: 'Score', question: 'Question', frame: 'Meme illustration',
    right: 'Correct! +1', wrong: 'Missed. Try again.', result: 'Your result', again: 'Play again',
    mute: 'Mute sound', unmute: 'Enable sound', keys: 'Answer', loading: 'Loading the game…',
    failed: 'Could not load the game. Run npm run import-game to import the assets, then reload.',
  },
];

function SoundIcon({ muted }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
    {muted ? <path d="m15 9 6 6m0-6-6 6" /> : <path d="M15 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12" />}
  </svg>;
}

function Game({ data }) {
  const [lang, setLang] = useState(() => localStorage.getItem('memasiki-lang') === 'en' ? 1 : 0);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [round, dispatch] = useReducer(roundReducer, newRound);
  const sound = useRef(null);
  const heading = useRef(null);
  const t = copy[lang];
  const total = data.questions.length;
  const question = data.questions[round.index];
  const screen = playing ? (question ? 'round' : 'result') : 'menu';
  const result = screen === 'result' && data.ranks.find(({ max }) => round.score <= max).text[lang];
  const [rank, ...resultLines] = result ? result.split('\n') : [];

  useEffect(() => {
    document.documentElement.lang = lang ? 'en' : 'ru';
    document.title = t.title;
    localStorage.setItem('memasiki-lang', lang ? 'en' : 'ru');
  }, [lang, t.title]);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [screen, round.index]);

  useEffect(() => {
    if (!playing || !round.solved) return;
    const timer = setTimeout(() => dispatch({ type: 'advance' }), 2000);
    return () => clearTimeout(timer);
  }, [playing, round.solved]);

  useEffect(() => {
    if (screen !== 'round') return;
    const next = data.questions[round.index + 1];
    if (next) {
      const preload = new Image();
      preload.src = picture(next.image);
    }
  }, [data, screen, round.index]);

  function start() {
    dispatch({ type: 'start' });
    setPlaying(true);
  }

  function answer(index) {
    if (screen !== 'round' || round.solved || round.missed.includes(index)) return;
    const { correct } = question.answers[index];
    dispatch({ type: 'answer', index, correct });
    if (!muted) {
      sound.current?.pause();
      sound.current = new Audio(asset(correct ? 'vern.mp3' : 'never.mp3'));
      sound.current.play().catch(() => {});
    }
  }

  useEffect(() => {
    function onKey(event) {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Escape') setPlaying(false);
      if (/^[1-4]$/.test(event.key)) answer(Number(event.key) - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function toggleSound() {
    if (!muted) sound.current?.pause();
    setMuted(!muted);
  }

  const label = <span className="wordmark">{t.title}<span>.</span></span>;
  return (
    <div className="shell">
      <header className="top">
        {playing ? <button type="button" className="brand-button" onClick={() => setPlaying(false)}
          aria-label={t.menu}>{label}</button> : label}
        <div className="controls">
          <div className="languages" aria-label={lang ? 'Language' : 'Язык'}>
            <button type="button" aria-pressed={lang === 0} onClick={() => setLang(0)}>RU</button>
            <button type="button" aria-pressed={lang === 1} onClick={() => setLang(1)}>EN</button>
          </div>
          <button type="button" className="sound" aria-label={muted ? t.unmute : t.mute}
            title={muted ? t.unmute : t.mute} onClick={toggleSound}><SoundIcon muted={muted} /></button>
        </div>
      </header>

      {screen === 'menu' && (
        <main className="cover" style={{ '--cover': `url(${picture(data.title)})` }}>
          <div className="cover-copy">
            <div className="eyebrow"><span />{t.quiz}</div>
            <h1 ref={heading} tabIndex={-1}>{t.title}<span>.</span></h1>
            <p>{t.intro}</p>
            <button type="button" className="primary" onClick={start}>{t.start} <span aria-hidden="true">→</span></button>
          </div>
        </main>
      )}

      {screen === 'round' && (
        <main className="game">
          <div className="status">
            <div className="progress-label">{t.question} <strong>{question.number} / {total}</strong></div>
            <progress aria-label={t.question} value={round.index + 1} max={total} />
            <div className="score">{t.score} <strong aria-live="polite">{round.score}</strong></div>
          </div>
          <div className="playfield" style={{ '--texture': `url(${picture(data.background)})` }}>
            <div className="illustration">
              <img key={question.image} src={picture(question.image)} alt={t.frame} />
            </div>
            <section className="prompt" aria-labelledby="question">
              <h1 id="question" ref={heading} tabIndex={-1}>{question.prompt[lang].replace(/\s+/g, ' ')}</h1>
              <div className="answers">
                {question.answers.map(({ correct, text }, index) => {
                  const missed = round.missed.includes(index);
                  const solved = round.solved && correct;
                  return <button key={index} type="button" className="answer"
                    data-state={solved ? 'correct' : missed ? 'wrong' : undefined}
                    disabled={missed || round.solved} onClick={() => answer(index)}>
                    <span className="number" aria-hidden="true">{solved ? '✓' : missed ? '×' : index + 1}</span>
                    {text[lang]}
                  </button>;
                })}
              </div>
              <p className="feedback" role="status" data-correct={round.solved}>
                {round.solved ? t.right : round.missed.length ? t.wrong : ''}
              </p>
            </section>
          </div>
        </main>
      )}

      {screen === 'result' && (
        <main className="result" style={{ '--texture': `url(${picture(data.background)})` }}>
          <div className="eyebrow"><span />{t.result}</div>
          <div className="total">{round.score}<span> / {total}</span></div>
          <h1 ref={heading} tabIndex={-1}>{rank.replaceAll('"', '')}</h1>
          <p>{resultLines.join(' ')}</p>
          <div className="result-actions">
            <button type="button" className="primary" onClick={start}>{t.again} <span aria-hidden="true">↻</span></button>
            <button type="button" className="secondary" onClick={() => setPlaying(false)}>{t.menu}</button>
          </div>
        </main>
      )}

      {screen === 'round' && <footer>
        <button type="button" className="back" onClick={() => setPlaying(false)}><kbd>Esc</kbd> {t.menu}</button>
        <span className="keyboard-hint"><kbd>1–4</kbd> {t.keys}</span>
      </footer>}
    </div>
  );
}

function App() {
  const [state, setState] = useState({ data: null, failed: false });

  useEffect(() => {
    const controller = new AbortController();
    fetch(asset('quiz.json'), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Missing game data');
        return response.json();
      })
      .then((data) => setState({ data, failed: false }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ data: null, failed: true });
      });
    return () => controller.abort();
  }, []);

  if (state.data) return <Game data={state.data} />;
  return <main className="loading" role="status">{state.failed ? copy[0].failed : copy[0].loading}</main>;
}

createRoot(document.getElementById('root')).render(<App />);
