import { BookingProvider } from './booking'
import { Booking } from './components/Booking'
import { Frost } from './components/Frost'
import { Hero } from './components/Hero'
import { LightboxProvider } from './components/Lightbox'
import { Rooms } from './components/Rooms'
import { BottomBar, Faq, Final, Gallery, NewYear, Reviews, Top, Way } from './components/Sections'
import { NAME } from './data'

export function App() {
  return (
    <BookingProvider>
      <LightboxProvider>
        <p className="demo">Демо сайта для «{NAME}». Цены, спальные места и фото комнат впишем с ваших слов.</p>
        <Top />
        <main>
          <Hero />
          <Rooms />
          <Gallery />
          <NewYear />
          <Reviews />
          <Booking />
          <Frost />
          <Way />
          <Faq />
        </main>
        <Final />
        <BottomBar />
      </LightboxProvider>
    </BookingProvider>
  )
}
