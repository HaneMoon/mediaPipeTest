
import './App.scss'
import Header from "./components/header/index"
import Footer from "./components/footer/index"
import MediaPipe from "./components/mediaPipe"
function App() {


  return (
    <>
      <header>
        <Header />
      </header>
      <div>ロリ</div>
    <MediaPipe/>
      <footer>
        <Footer />
      </footer>
    </>
  )
}

export default App
