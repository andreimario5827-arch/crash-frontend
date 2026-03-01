import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#0f0c29');

// ⚠️ Folosim exact link-ul tau de Render de data trecuta
const BACKEND_URL = 'https://crash-backend-kzhe.onrender.com'; 
const socket = io(BACKEND_URL);

export default function App() {
  const [status, setStatus] = useState('BETTING'); 
  const [multiplier, setMultiplier] = useState(1.00);
  const [countdown, setCountdown] = useState(0); 
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState(10);
  const [activeBet, setActiveBet] = useState(null);
  const [message, setMessage] = useState('');

  const userId = tg.initDataUnsafe?.user?.id || 12345;

  useEffect(() => {
    // Cerem balanta la intrarea in joc
    socket.emit('request_balance', userId);

    socket.on('balance_update', (val) => {
      setBalance(val);
    });
    
    socket.on('game_state_update', (state) => {
      setStatus(state.status);
      if (state.status === 'BETTING') {
        setMultiplier(1.00);
        setCountdown(state.countdown);
        setMessage('');
        // Scoatem pariul vechi DOAR cand racheta e jos si cronometrul e la 5
        if (state.countdown === 5) {
          setActiveBet(null);
        }
      }
    });

    socket.on('tick', (num) => setMultiplier(num));
    
    socket.on('crash', (val) => {
      setStatus('CRASHED');
      setMultiplier(val);
      setActiveBet(null); // Racheta a explodat, pariul s-a pierdut
      if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
    });

    socket.on('bet_accepted', ({ amount }) => {
        setActiveBet(amount); // Blocheaza butonul si memoreaza pariul!
        setBalance((prev) => prev - amount);
    });

    socket.on('cash_out_success', ({ profit }) => {
        setMessage(`+${profit}`);
        setBalance((prev) => prev + profit);
        setActiveBet(null); // Transforma butonul verde la loc in gri
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    });

    // Curatam conexiunile ca sa nu se dubleze
    return () => {
      socket.off('balance_update');
      socket.off('game_state_update');
      socket.off('tick');
      socket.off('crash');
      socket.off('bet_accepted');
      socket.off('cash_out_success');
    };
  }, [userId]);

  const handleBet = () => {
    if (balance >= betAmount) socket.emit('place_bet', { userId, amount: betAmount });
  };

  const handleCashOut = () => {
    socket.emit('cash_out', { userId, amount: activeBet, multiplier });
  };

  return (
    <div className="min-h-screen bg-[conic-gradient(at_bottom,_var(--tw-gradient-stops))] from-[#0f0c29] via-[#302b63] to-[#24243e] text-white flex flex-col font-sans overflow-hidden">
      
      {/* Header */}
      <div className="w-full bg-black/30 backdrop-blur-md p-4 flex justify-between items-center z-20 border-b border-white/10">
        <div className="flex flex-col">
          
          <span className="text-[10px] text-gray-400">ID: {userId}</span>
        </div>
        
        <div 
          onClick={() => socket.emit('request_balance', userId)}
          className="flex items-center space-x-2 bg-black/50 px-4 py-2 rounded-full border border-yellow-500/50 active:scale-95 transition-transform cursor-pointer"
        >
          <span className="text-lg">🔄</span>
          <span className="text-xl">🪙</span>
          <span className="text-yellow-400 font-black text-xl">{balance}</span>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 relative w-full flex flex-col items-center justify-center">
        
        {status === 'BETTING' && (
            <div className="absolute z-30 flex flex-col items-center">
                <div className="text-6xl font-black text-blue-400 animate-pulse">{countdown}</div>
                <div className="text-sm font-bold tracking-widest uppercase mt-2">Place your bets</div>
            </div>
        )}

        <AnimatePresence mode='wait'>
            {status === 'RUNNING' && (
                <motion.div className="text-8xl" animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 2 }}>🚀</motion.div>
            )}
            {status === 'CRASHED' && (
                <motion.div className="text-9xl" initial={{ scale: 0.5 }} animate={{ scale: 1.5, opacity: 0 }}>💥</motion.div>
            )}
        </AnimatePresence>

        {status !== 'BETTING' && (
            <h1 className={`text-7xl font-black mt-8 ${status === 'CRASHED' ? 'text-red-500' : 'text-white'}`}>
                {multiplier.toFixed(2)}x
            </h1>
        )}
        
        {/* Mesaj Profit */}
        {message && status === 'RUNNING' && (
           <div className="absolute top-1/4 text-4xl font-black text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)] animate-bounce">{message}</div>
        )}
      </div>

      {/* Controls */}
      <div className="w-full bg-black/40 backdrop-blur-xl p-6 rounded-t-[3rem] border-t border-white/10 space-y-4 z-30">
        
        <div className="flex justify-between items-center bg-black/50 p-2 rounded-2xl">
            <button onClick={() => setBetAmount(Math.max(10, betAmount - 10))} className="w-12 h-12 bg-gray-800 rounded-xl text-xl font-bold">-</button>
            <span className="text-2xl font-bold">🪙 {betAmount}</span>
            <button onClick={() => setBetAmount(betAmount + 10)} className="w-12 h-12 bg-gray-800 rounded-xl text-xl font-bold">+</button>
        </div>

        {status === 'BETTING' && !activeBet && (
            <button onClick={handleBet} className="w-full py-4 bg-blue-600 rounded-xl font-black text-2xl uppercase shadow-lg shadow-blue-500/50">
                BET NOW
            </button>
        )}
        
        {status === 'BETTING' && activeBet && (
            <button disabled className="w-full py-4 bg-gray-600 rounded-xl font-bold text-xl uppercase">
                BET LOCKED
            </button>
        )}

        {status === 'RUNNING' && activeBet && (
            <button onClick={handleCashOut} className="w-full py-4 bg-green-500 rounded-xl font-black text-2xl uppercase shadow-[0_0_30px_rgba(34,197,94,0.8)] animate-pulse">
                CASH OUT (+{(activeBet * multiplier).toFixed(0)})
            </button>
        )}

        {(status === 'RUNNING' && !activeBet) || status === 'CRASHED' ? (
            <button disabled className="w-full py-4 bg-gray-800 text-gray-500 rounded-xl font-bold text-xl uppercase">
                WAIT FOR ROUND
            </button>
        ) : null}

      </div>
    </div>
  );
}