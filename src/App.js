import React, { useState } from 'react';
import './App.css';
import Game from './components/Game';

function App() {
  const [startGame, setStartGame] = useState(false);

  return (
    <div className="App">
      {!startGame && <button onClick={() => setStartGame(true)}>Deploy</button>}
      {startGame && <Game />}
    </div>
  );
}

export default App;