const results = [
  {
    max: 10,
    title: [
      'Кар, ну ты чето вообще не шаришь я посмотрю :(',
      'Kar, I see you really don’t know your memes :(',
    ],
    description: [
      'Мемы пока ведут, но кнопка «Сыграть ещё» уже на твоей стороне.',
      'The memes are ahead for now, but the Play Again button is on your side.',
    ],
  },
  {
    max: 20,
    title: [
      'Карина Владимировна, вы можете лучше!',
      'Karina Vladimirovna, you can do better!',
    ],
    description: [
      'За старание зачёт. Мемологию можно пересдать прямо сейчас.',
      'Full marks for effort. The meme studies retake starts whenever you’re ready.',
    ],
  },
  {
    max: 30,
    title: [
      'Не вау, где-то на 5 Карин из 10',
      'Not wow. About 5 Karinas out of 10',
    ],
    description: [
      'Пять Карин уже узнали мемы, остальные пять ещё спорят в комментах.',
      'Five Karinas recognized the memes. The other five are still arguing in the comments.',
    ],
  },
  {
    max: 40,
    title: [
      'Неплохо! Ты почти шаришь в теме, уже привыкла к аппарату?',
      'Not bad! You almost know your stuff. Getting used to the machine yet?',
    ],
    description: [
      'Аппарат разогрелся и теперь выдаёт правильные ответы почти без перебоев.',
      'The machine’s warmed up and is churning out right answers with barely a hiccup.',
    ],
  },
  {
    max: 54,
    title: [
      'Весьма и весьма хорошо! Даже почти отлично! В этом тексте хотел назвать тебя Карей, но моя жопа не очень вместительна :( Иф ю ноу вот ай мин',
      'Very, very good! Almost excellent, even! I was going to call you Karya here, but my ass has limited capacity :( If you know what I mean',
    ],
    description: [
      'До мемного трона осталось чуть-чуть. Шутки про вместимость оставим за кадром.',
      'The meme throne is within reach. Let’s leave the capacity jokes offscreen.',
    ],
  },
  {
    max: 55,
    title: ['Карин, ты богиня!', 'Karina, you’re a goddess!'],
    description: [
      'Все 55 баллов твои. Мемы встали и аплодируют.',
      'All 55 points are yours. The memes are giving you a standing ovation.',
    ],
  },
];

export function resultForScore(score, language) {
  const { title, description } = results.find(({ max }) => score <= max);
  return { title: title[language], description: description[language] };
}
