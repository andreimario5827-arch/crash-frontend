// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// Init Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Connect to backend
const socket = io('https://crash-backend-kzhe.onrender.com'); // REPLACE THIS

export default function App() {
  const [status, setStatus] = useState('IDLE'); // IDLE, RUNNING, CRASHED
  const [multiplier, setMultiplier] = useState(1.00);
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState(10);
  const [activeBet, setActiveBet] = useState(null); // If we have a bet in current round
  const [message, setMessage] = useState('');

  const userId = tg.initDataUnsafe?.user?.id || 12345; // Fallback for testing

  useEffect(() => {
    // 1. Listen for Game Events
    socket.on('init', (state) => {
      setStatus(state.status);
      setMultiplier(state.multiplier);
    });

    socket.on('game_start', () => {
      setStatus('RUNNING');
      setMultiplier(1.00);
      setMessage('');
    });

    socket.on('tick', (num) => {
      setMultiplier(num);
    });

    socket.on('crash', (crashPoint) => {
      setStatus('CRASHED');
      setMultiplier(crashPoint);
      setActiveBet(null); // Round over
    });

    socket.on('bet_accepted', () => {
      setActiveBet(betAmount);
      setBalance((prev) => prev - betAmount);
    });

    socket.on('cash_out_success', ({ profit }) => {
      setMessage(`Win! +${profit} Chips`);
      setBalance((prev) => prev + profit);
      setActiveBet(null);
    });
    
    // Fetch initial balance (Mocked here, fetch from API in real app)
    setBalance(1000);

    return () => socket.off();
  }, [betAmount]);

  // Actions
  const handleBet = () => {
    socket.emit('place_bet', { userId, amount: betAmount });
  };

  const handleCashOut = () => {
    socket.emit('cash_out', { userId, amount: activeBet, multiplier });
  };

  // Visuals
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-between p-4 font-mono">
      
      {/* Header */}
      <div className="w-full flex justify-between items-center bg-gray-800 p-3 rounded-lg">
        <span className="text-gray-400">Balance</span>
        <span className="text-yellow-400 font-bold text-xl">🪙 {balance}</span>
      </div>

      {/* The Game Screen */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="relative">
          {/* The Multiplier Text */}
          <h1 className={`text-6xl font-bold ${status === 'CRASHED' ? 'text-red-500' : 'text-green-400'}`}>
            {multiplier.toFixed(2)}x
          </h1>
          
          {/* Status Text */}
          <p className="text-center mt-4 text-gray-500">
            {status === 'IDLE' && "Waiting for next round..."}
            {status === 'CRASHED' && "CRASHED!"}
            {status === 'RUNNING' && "RISING..."}
          </p>

          {/* Win Message Overlay */}
          {message && <div className="absolute top-[-50px] w-full text-center text-green-300 font-bold animate-bounce">{message}</div>}
        </div>
      </div>

      {/* Controls */}
      <div className="w-full bg-gray-800 p-4 rounded-t-2xl space-y-4">
        
        {/* Bet Input */}
        <div className="flex justify-between items-center bg-gray-700 p-2 rounded">
          <button onClick={() => setBetAmount(Math.max(10, betAmount - 10))} className="p-2 text-xl">-</button>
          <span className="font-bold">{betAmount} Chips</span>
          <button onClick={() => setBetAmount(betAmount + 10)} className="p-2 text-xl">+</button>
        </div>

        {/* Action Button */}
        {status === 'IDLE' && !activeBet && (
          <button 
            onClick={handleBet}
            className="w-full py-4 bg-blue-600 rounded-xl font-bold text-xl hover:bg-blue-500 transition"
          >
            Place Bet
          </button>
        )}

        {status === 'IDLE' && activeBet && (
          <button disabled className="w-full py-4 bg-gray-600 rounded-xl font-bold text-xl opacity-50">
            Bet Placed...
          </button>
        )}

        {status === 'RUNNING' && activeBet && (
          <button 
            onClick={handleCashOut}
            className="w-full py-4 bg-green-500 rounded-xl font-bold text-xl hover:bg-green-400 transition shadow-[0_0_20px_rgba(34,197,94,0.6)]"
          >
            CASH OUT ({(activeBet * multiplier).toFixed(0)})
          </button>
        )}

        {(status === 'RUNNING' && !activeBet) || status === 'CRASHED' ? (
          <button disabled className="w-full py-4 bg-gray-700 text-gray-500 rounded-xl font-bold text-xl">
            Wait for Round
          </button>
        ) : null}

      </div>
    </div>
  );
}