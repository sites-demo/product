import { MoveProvider } from './move'
import { Header, Hero } from './components/Top'
import { Compare, Faq, Intercity, Office, Prices, Reviews, Services, Steps } from './components/Sections'
import { BottomBar, Contacts, Footer, Request } from './components/Request'

export function App() {
  return (
    <MoveProvider>
      <Header />
      <main>
        <Hero />
        <Prices />
        <Services />
        <Compare />
        <Office />
        <Intercity />
        <Reviews />
        <Steps />
        <Faq />
        <Request />
        <Contacts />
      </main>
      <Footer />
      <BottomBar />
    </MoveProvider>
  )
}
