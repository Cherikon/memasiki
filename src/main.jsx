import React, { useEffect, useReducer, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import bonusQuestions from './bonus-questions.json';
import { resultForScore } from './results.js';
import { newRound, roundReducer } from './round.js';
import './style.css';

const asset = (name) => new URL(`${import.meta.env.BASE_URL}game/${name}`, document.baseURI).href;
const picture = (image) => asset(typeof image === 'number' ? `${image}.png` : image);
const languageKey = 'memasiki-language';
const russianChecks = [
  ['Перейти на русский?', 'Отдел мемов хочет с тобой поговорить.', 'Слушаю'],
  ['Ты знаком с буквой Ы?', 'Выглядит как две буквы в одном плаще, но уверяет, что она одна.', 'Поладим'],
  ['Последняя формальность', 'Подтверди, что готов услышать хотя бы одно «ну, погоди».', 'Переживу'],
  ['Комитет по мемам одобрил', 'Всё готово. Поехали?', 'Перейти на русский'],
];
const copy = [
  {
    title: 'МЕМАСИКИ', quiz: 'Викторина по мемам', intro: 'Узнай мем по картинке и выбери правильный ответ.',
    start: 'Начать игру', menu: 'В меню', score: 'Счёт', frame: 'Кадр из игры',
    right: 'Верно! +1', wrong: 'Мимо. Попробуй ещё.', result: 'Твой результат', again: 'Сыграть ещё',
    mute: 'Выключить звук', unmute: 'Включить звук', keys: 'Ответить', loading: 'Загружаем игру…',
    failed: 'Не удалось загрузить игру. Импортируй ресурсы командой npm run import-game и обнови страницу.',
  },
  {
    title: 'MEMASIKI', quiz: 'Meme quiz', intro: 'Recognize the meme and pick the right answer.',
    start: 'Start game', menu: 'Main menu', score: 'Score', frame: 'Meme illustration',
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
  const [lang, setLang] = useState(() => localStorage.getItem(languageKey) === 'ru' ? 0 : 1);
  const [languageCheck, setLanguageCheck] = useState(null);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [round, dispatch] = useReducer(roundReducer, newRound);
  const sound = useRef(null);
  const heading = useRef(null);
  const languageDialog = useRef(null);
  const t = copy[lang];
  const choosingLanguage = languageCheck !== null;
  const [checkTitle, checkMessage, checkAction] = russianChecks[languageCheck ?? 0];
  const question = data.questions[round.index];
  const screen = playing ? (question ? 'round' : 'result') : 'menu';
  const result = screen === 'result' ? resultForScore(round.score, lang) : null;

  useEffect(() => {
    document.documentElement.lang = lang ? 'en' : 'ru';
    document.title = t.title;
    localStorage.setItem(languageKey, lang ? 'en' : 'ru');
  }, [lang, t.title]);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [screen, round.index]);

  useEffect(() => {
    if (!playing || !round.solved || choosingLanguage) return;
    const timer = setTimeout(() => dispatch({ type: 'advance' }), 2000);
    return () => clearTimeout(timer);
  }, [playing, round.solved, choosingLanguage]);

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
      if (languageDialog.current?.open || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
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

  function requestRussian() {
    if (lang === 0) return;
    setLanguageCheck(0);
    languageDialog.current.showModal();
  }

  function confirmRussian() {
    if (languageCheck < russianChecks.length - 1) {
      setLanguageCheck(languageCheck + 1);
      return;
    }
    setLang(0);
    languageDialog.current.close();
  }

  const label = <span className="wordmark">{t.title}<span>.</span></span>;
  return (
    <div className="shell">
      <header className="top">
        {playing ? <button type="button" className="brand-button" onClick={() => setPlaying(false)}
          aria-label={t.menu}>{label}</button> : label}
        <div className="controls">
          <div className="languages" role="group" aria-label={lang ? 'Language' : 'Язык'}>
            <button type="button" aria-pressed={lang === 1} onClick={() => setLang(1)}>EN</button>
            <button type="button" aria-pressed={lang === 0} onClick={requestRussian}>RU</button>
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
          <div className="score" role="status">{t.score} <strong>{round.score}</strong></div>
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

      {result && (
        <main className="result" style={{ '--texture': `url(${picture(data.background)})` }}>
          <div className="eyebrow"><span />{t.result}</div>
          <div className="total">{round.score}</div>
          <h1 ref={heading} tabIndex={-1}>{result.title}</h1>
          <p>{result.description}</p>
          <div className="result-actions">
            <button type="button" className="primary" onClick={start}>{t.again} <span aria-hidden="true">↻</span></button>
            <button type="button" className="secondary" onClick={() => setPlaying(false)}>{t.menu}</button>
          </div>
        </main>
      )}

      {screen === 'round' && <footer>
        <button type="button" className="back" onClick={() => setPlaying(false)}>
          <span className="back-arrow" aria-hidden="true">←</span><kbd>Esc</kbd> {t.menu}
        </button>
        <span className="keyboard-hint"><kbd>1–4</kbd> {t.keys}</span>
      </footer>}

      <dialog className="language-dialog" ref={languageDialog} lang="ru" aria-labelledby="language-title"
        aria-describedby="language-message" onClose={() => setLanguageCheck(null)}>
        <div aria-live="polite">
          <div className="eyebrow"><span />Мемный паспорт</div>
          <h2 id="language-title">{checkTitle}</h2>
          <p id="language-message">{checkMessage}</p>
        </div>
        <div className="dialog-actions">
          <button type="button" className="primary" onClick={confirmRussian}>{checkAction}</button>
          <button type="button" className="secondary" onClick={() => languageDialog.current.close()}>Остаться на английском</button>
        </div>
      </dialog>
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
      .then((data) => setState({
        data: { ...data, questions: [...data.questions, ...bonusQuestions] },
        failed: false,
      }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ data: null, failed: true });
      });
    return () => controller.abort();
  }, []);

  if (state.data) return <Game data={state.data} />;
  return <main className="loading" role="status">{state.failed ? copy[1].failed : copy[1].loading}</main>;
}

createRoot(document.getElementById('root')).render(<App />);
