import Nav from './components/Nav'
import Hero from './components/Hero'
import Audience from './components/Audience'
import Workflow from './components/Workflow'
import Features from './components/Features'
import Gallery from './components/Gallery'
import Privacy from './components/Privacy'
import Install from './components/Install'
import Signatures from './components/Signatures'
import Faq from './components/Faq'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <a
        href="#ablauf"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        Zum Inhalt springen
      </a>
      <Nav />
      <main>
        <Hero />
        <Audience />
        <Workflow />
        <Features />
        <Gallery />
        <Privacy />
        <Install />
        <Signatures />
        <Faq />
      </main>
      <Footer />
    </>
  )
}
