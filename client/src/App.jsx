import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>

      <h1 class="text-3xl font-bold underline">
        Hello world!

      </h1>
      <h2 class="text-2xl text-blue-600">
        Welcome to Tailwind CSS with Vite and React!

      </h2>
    </>
  )
}

export default App
