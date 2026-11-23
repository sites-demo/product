import { useEffect, useState } from 'react';
import { DEFAULT_PRICES, plural, rub, TUTOR, type Plan } from '../lib/store';
import { getPrices } from '../lib/api';
import { Seal } from '../ui/Seal';
import { Icon } from '../ui/icons';
import Calculator from './Calculator';
import Booking from './Booking';

const BASE = import.meta.env.BASE_URL;

const RESULTS = [
  ['Арсений', '2026', 'ЕГЭ профиль', '42', '84', 'СПбГУ, математико-механический'],
  ['Полина', '2026', 'ЕГЭ профиль', '51', '88', 'ИТМО, программная инженерия'],
  ['Тимур', '2026', 'ЕГЭ профиль', '38', '76', 'Политех, строительный институт'],
  ['Ксения', '2025', 'ЕГЭ профиль', '56', '92', 'ВШЭ, экономика'],
  ['Мирон', '2025', 'ОГЭ', '«3»', '«5»', 'Профильный физмат-класс'],
];

const STEPS = [
  ['Сначала', 'Знакомство', 'Первая встреча 40 минут, бесплатно. Короткая диагностика: смотрю не на ответы, а на то, как ученик рассуждает. В конце говорю честно, на какой балл можно рассчитывать.'],
  ['Затем', 'План до экзамена', 'Расписываю темы по неделям до июня. Родители получают план и в любой момент видят, где мы сейчас.'],
  ['Каждую неделю', 'Занятия и домашняя работа', 'Разбор темы, задачи с нарастающей сложностью, домашнее задание в Telegram. Проверяю в тот же вечер, ошибки разбираем на следующем занятии.'],
  ['Каждый месяц', 'Пробник и отчёт', 'Пробный экзамен в реальном времени и по реальным критериям. После него короткий отчёт родителям: что выросло, что подтягиваем.'],
];

const FAQ = [
  ['С какого класса лучше начинать подготовку к ЕГЭ?', 'Спокойнее всего с начала 10 класса: тогда хватает одного занятия в неделю. Если начинаем в 11 классе, занимаемся чаще, и это тоже рабочий вариант, просто плотнее.'],
  ['Онлайн занятия так же эффективны, как очные?', 'Да, если они правильно устроены. Мы работаем на общей доске, ученик пишет решение, я вижу каждый шаг. Половина моих учеников занимается онлайн из других городов.'],
  ['Что если ребёнок заболел или пропустил занятие?', 'Если предупредить за сутки, переносим без доплаты. Занятие, отменённое в день урока, оплачивается.'],
  ['Как родители узнают о прогрессе?', 'Раз в месяц пробник и короткий отчёт в мессенджере: баллы, темы, что делаем дальше. Если нужно, созваниваемся.'],
  ['Как проходит оплата?', 'За каждое занятие или абонементом на 8 занятий со скидкой. Переводом по номеру телефона, чек присылаю.'],
  ['Вы гарантируете балл?', 'Честно говоря, нет: результат зависит и от ученика. Гарантирую другое: понятный план, проверку каждой домашней работы и прямой ответ, если что-то идёт не так.'],
];

export default function App() {
  const [prices, setPrices] = useState<any>(DEFAULT_PRICES);
  const [booking, setBooking] = useState<{ plan: Plan | null } | null>(null);
  useEffect(() => { getPrices().then(setPrices).catch(() => {}); }, []);
  const years = new Date().getFullYear() - TUTOR.since;
  const book = (plan: Plan | null = null) => setBooking({ plan });

  return (
    <>
      <header className="top">
        <a className="brand" href="#top" aria-label={TUTOR.full}>
          <Seal size={44} ring={false} dark />
          <span><b>{TUTOR.first} {TUTOR.last}</b><small>репетитор по математике</small></span>
        </a>
        <nav className="nav">
          <a href="#calc">Расчёт</a>
          <a href="#approach">Подготовка</a>
          <a href="#results">Результаты</a>
          <a href="#prices">Стоимость</a>
          <a href="#faq">Вопросы</a>
        </nav>
        <button className="btn line-light top-cta" onClick={() => book()}>Записаться</button>
      </header>

      <section className="hero" id="top">
        <div className="hero-in">
          <div className="hero-text">
            <p className="hero-kicker">Математика · ОГЭ и ЕГЭ · {TUTOR.city} и онлайн</p>
            <h1>{TUTOR.first} Андреевна<br />{TUTOR.last}</h1>
            <p className="hero-lead">
              Готовлю к ОГЭ и ЕГЭ по математике с {TUTOR.since} года. Учитель физико-математического лицея, эксперт предметной комиссии ЕГЭ.
            </p>
            <div className="hero-cta">
              <a className="btn brass" href="#calc">Рассчитать подготовку</a>
              <button className="btn line-light" onClick={() => book()}>Записаться на знакомство</button>
            </div>
          </div>
          <figure className="hero-pic">
            <picture>
              <source media="(min-width: 900px)" srcSet={`${BASE}assets/desk-wide.webp`} />
              <img src={`${BASE}assets/desk-tall.webp`} alt="Рабочий стол: тетрадь с решением квадратного уравнения, перьевая ручка, циркуль и книги" width="1200" height="1500" />
            </picture>
          </figure>
        </div>
        <dl className="facts">
          <div><dt className="num">{years} {plural(years, 'год', 'года', 'лет')}</dt><dd>преподаю математику</dd></div>
          <div><dt className="num">{prices.capacity}</dt><dd>учеников в год, не больше</dd></div>
          <div><dt className="num">{prices.seats} {plural(prices.seats, 'место', 'места', 'мест')}</dt><dd>свободно на 2026/27 год</dd></div>
        </dl>
      </section>

      <section className="sec calc-sec" id="calc">
        <div className="wrap">
          <div className="sec-head">
            <h2>Сколько занятий нужно до&nbsp;вашего балла</h2>
            <p>Укажите, что сдаёте и где ученик сейчас. Покажу, сколько занятий в неделю понадобится и во что это обойдётся в месяц.</p>
          </div>
          <Calculator prices={prices} onBook={(p) => book(p)} />
        </div>
      </section>

      <section className="sec approach" id="approach">
        <div className="wrap">
          <blockquote className="quote">
            <p>Натаскивание на варианты даёт шестьдесят баллов. Понимание даёт восемьдесят пять. Я учу понимать, а&nbsp;скорость приходит сама.</p>
          </blockquote>
          <div className="steps">
            <h2>Как устроена подготовка</h2>
            <ol>
              {STEPS.map(([when, title, text]) => (
                <li key={title}>
                  <span className="step-when">{when}</span>
                  <div><h3>{title}</h3><p>{text}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="sec about" id="about">
        <div className="wrap about-in">
          <div className="crest">
            <div className="oval"><img src={`${BASE}assets/desk-detail.webp`} alt="Тетрадь с решением и перьевая ручка" loading="lazy" width="800" height="1000" /></div>
          </div>
          <div className="about-text">
            <h2>О себе</h2>
            <p>
              Окончила математико-механический факультет СПбГУ. Пятнадцать лет преподаю в физико-математическом лицее, последние шесть лет проверяю работы в предметной комиссии ЕГЭ. Поэтому хорошо знаю, за что снимают баллы во второй части и как оформить решение, чтобы их не потерять.
            </p>
            <p>
              Беру не больше {prices.capacity} учеников в год. Так у каждого есть моё внимание и моё время, а не место в очереди.
            </p>
            <dl className="creds">
              <div><dt>Образование</dt><dd>СПбГУ, математико-механический факультет</dd></div>
              <div><dt>Опыт</dt><dd>с {TUTOR.since} года, физико-математический лицей</dd></div>
              <div><dt>Экспертиза</dt><dd>эксперт предметной комиссии ЕГЭ по математике</dd></div>
              <div><dt>Где</dt><dd>онлайн по всей России, очно на Петроградской стороне</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="sec results" id="results">
        <div className="wrap">
          <div className="sec-head">
            <h2>Результаты учеников</h2>
            <p>С какого балла начинали и что получили на экзамене.</p>
          </div>
          <div className="register" role="table" aria-label="Результаты учеников">
            <div className="reg-row reg-head" role="row">
              <span role="columnheader">Ученик</span>
              <span role="columnheader">Начинали</span>
              <span role="columnheader">Экзамен</span>
              <span role="columnheader">Поступление</span>
            </div>
            {RESULTS.map(([name, year, exam, from, to, uni]) => (
              <div className="reg-row" role="row" key={name}>
                <span role="cell" className="reg-name"><b>{name}</b><small>{exam}, {year}</small></span>
                <span role="cell" className="reg-from num">{from}</span>
                <span role="cell" className="reg-to num">{to}</span>
                <span role="cell" className="reg-uni">{uni}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec prices-sec" id="prices">
        <div className="wrap prices-in">
          <div className="sec-head">
            <h2>Стоимость</h2>
            <p>Оплата за занятие или абонементом. Переводом по номеру телефона, чек присылаю.</p>
          </div>
          <ul className="menu">
            <li><span>Знакомство и диагностика, 40 минут</span><i /><b>бесплатно</b></li>
            <li><span>Занятие 60 минут</span><i /><b className="num">{rub(prices.online60)}</b></li>
            <li><span>Занятие 90 минут</span><i /><b className="num">{rub(prices.online90)}</b></li>
            <li><span>Очно у меня, доплата за занятие</span><i /><b className="num">{rub(prices.offline)}</b></li>
            <li><span>Абонемент на 8 занятий</span><i /><b className="num">скидка {prices.pack}%</b></li>
          </ul>
        </div>
      </section>

      <section className="sec faq" id="faq">
        <div className="wrap faq-in">
          <h2>Вопросы родителей</h2>
          <div className="faq-list">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary><span>{q}</span><Icon name="plus" /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="final">
        <div className="wrap final-in">
          <Seal size={96} dark />
          <h2>Набор на 2026/27 учебный год</h2>
          <p>Свободно {prices.seats} {plural(prices.seats, 'место', 'места', 'мест')} из {prices.capacity}. Оставьте заявку, и я отвечу {TUTOR.replyBy}.</p>
          <button className="btn brass" onClick={() => book()}>Записаться на знакомство</button>
          <p className="final-phone">{TUTOR.phone}<span>Telegram, WhatsApp, звонок</span></p>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap foot-in">
          <span>{TUTOR.full}, репетитор по математике. {TUTOR.city}</span>
          <a href="cabinet/">Вход для репетитора</a>
        </div>
      </footer>

      {booking ? <Booking plan={booking.plan} onClose={() => setBooking(null)} /> : null}
    </>
  );
}
