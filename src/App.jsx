// src/App.jsx
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
// Import animation library
import { motion, AnimatePresence } from 'framer-motion';

// Init Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#0f0c29'); // Match header to background

// --- CONFIGURATION ---
// REPLACE WITH YOUR ACTUAL RENDER URL
const BACKEND_URL = 'https://crash-backend-kzhe.onrender.com'; 
// ---------------------

const socket = io(BACKEND_URL);

export default function App() {
  const [status, setStatus] = useState('IDLE'); // IDLE, RUNNING, CRASHED
  const [multiplier, setMultiplier] = useState(1.00);
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState(10);
  const [activeBet, setActiveBet] = useState(null);
  const [message, setMessage] = useState('');

  const userId = tg.initDataUnsafe?.user?.id || 12345;

  // Haptic feedback helper
  const triggerHaptic = (type) => {
    if (tg.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(type);
    }
  };

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
      triggerHaptic('light');
    });

    socket.on('tick', (num) => {
      setMultiplier(num);
    });

    socket.on('crash', (crashPoint) => {
      setStatus('CRASHED');
      setMultiplier(crashPoint);
      setActiveBet(null);
      triggerHaptic('heavy');
    });

    socket.on('bet_accepted', () => {
      setActiveBet(betAmount);
      setBalance((prev) => prev - betAmount);
      triggerHaptic('medium');
    });

    socket.on('cash_out_success', ({ profit }) => {
      setMessage(`+${profit} Chips`);
      setBalance((prev) => prev + profit);
      setActiveBet(null);
      triggerHaptic('success');
    });
    
    // Mock initial balance (Replace with DB fetch in production)
    if (balance === 0) setBalance(1000);

    return () => socket.off();
  }, [betAmount, balance]);

  // Actions
  const handleBet = () => {
    if (balance >= betAmount) {
        socket.emit('place_bet', { userId, amount: betAmount });
    }
  };

  const handleCashOut = () => {
    socket.emit('cash_out', { userId, amount: activeBet, multiplier });
  };

  // Animation Logic: Calculate rocket height based on multiplier
  // We cap the visual height at 10x so it doesn't fly off screen forever
  const calculateRocketBottom = () => {
    const startBottom = 20; // starts 20% up screen
    const maxVisualMultiplier = 10; // Stops rising visually after 10x
    const effectiveMultiplier = Math.min(multiplier, maxVisualMultiplier);
    // Map 1x->10x to 0%->60% additional height
    const additionalHeight = ((effectiveMultiplier - 1) / (maxVisualMultiplier - 1)) * 60;
    return `${startBottom + (isNaN(additionalHeight) ? 0 : additionalHeight)}%`;
};

  // Visuals
  return (
    // Main Container with Space Gradient Background
    <div className="min-h-screen bg-[conic-gradient(at_bottom,_var(--tw-gradient-stops))] from-[#0f0c29] via-[#302b63] to-[#24243e] text-white flex flex-col font-sans overflow-hidden">
      
      {/* Header - Fixed at Top */}
      <div className="w-full bg-black/30 backdrop-blur-md p-4 flex justify-between items-center z-20 border-b border-white/10">
        <span className="text-blue-300 text-xs font-bold tracking-widest uppercase">Moonbase Alpha</span>
        <div className="flex items-center space-x-2 bg-black/50 px-4 py-2 rounded-full border border-yellow-500/50">
          <span className="text-xl">🪙</span>
          <span className="text-yellow-400 font-black text-xl tracking-wide">{balance}</span>
        </div>
      </div>

      {/* The Game Area (Animated) */}
      <div className="flex-1 relative w-full overflow-hidden">
        
        {/* 1. The Background Elements (Stars) */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-pulse"></div>

        {/* 2. The ROCKET & EXPLOSION Container */}
        {/* We use AnimatePresence to handle the switch between rocket and explosion smoothly */}
        <AnimatePresence mode='wait'>
            {status !== 'CRASHED' ? (
                // THE ROCKET 🚀
                <motion.div
                    key="rocket"
                    className="absolute left-1/2 -translate-x-1/2 text-7xl z-10 flex flex-col items-center"
                    // Animate position based on multiplier calculation
                    animate={{ 
                        bottom: calculateRocketBottom(),
                        // Add a subtle shake while running
                        x: status === 'RUNNING' ? [-1, 1, -1] : 0
                    }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                >
                    🚀
                    {/* Animated engine flame */}
                    {status === 'RUNNING' && (
                        <motion.span 
                            className="absolute -bottom-8 text-4xl text-orange-500"
                            animate={{ scale: [1, 1.2, 0.9], opacity: [0.8, 1, 0.7] }}
                            transition={{ repeat: Infinity, duration: 0.15 }}
                        >
                            🔥
                        </motion.span>
                    )}
                </motion.div>
            ) : (
                // THE EXPLOSION 💥
                <motion.div
                    key="explosion"
                    className="absolute left-1/2 -translate-x-1/2 text-9xl z-10"
                    style={{ bottom: calculateRocketBottom() }} // Explode exactly where the rocket was
                    initial={{ scale: 0.5, opacity: 1, rotate: 0 }}
                    animate={{ scale: 2.5, opacity: 0, rotate: [0, 15, -15] }} // Pop and fade
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    💥
                </motion.div>
            )}
        </AnimatePresence>

        {/* 3. The Multiplier Text Overlay (Fixed in center) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none pb-20">
          {/* Floating Win Message */}
          <AnimatePresence>
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute top-1/4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-2xl shadow-lg shadow-green-500/50"
              >
                🎉 {message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* The Big Number */}
          <h1 className={`text-8xl font-black tracking-tighter drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] transition-all duration-100 ${
            status === 'CRASHED' ? 'text-red-500 scale-110' : 'text-white scale-100'
          }`}>
            {multiplier.toFixed(2)}x
          </h1>
          
          {/* Status Subtext */}
          <p className={`mt-4 font-bold text-xl tracking-[0.2em] uppercase ${
            status === 'RUNNING' ? 'text-green-400 animate-pulse drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 
            status === 'CRASHED' ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'text-blue-300'
          }`}>
            {status === 'IDLE' && "Waiting for launch"}
            {status === 'RUNNING' && "LIFT OFF!"}
            {status === 'CRASHED' && "CRASHED"}
          </p>
        </div>
      </div>

      {/* Controls - Fixed at Bottom with Glassmorphism */}
      <div className="w-full bg-black/40 backdrop-blur-xl p-6 rounded-t-[3rem] border-t border-white/10 space-y-4 z-30 relative top-1">
        
        {/* Bet Amount Selector */}
        <div className="flex justify-between items-center bg-black/50 p-2 rounded-2xl border border-white/10">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setBetAmount(Math.max(10, betAmount - 10))} 
            className="w-14 h-14 flex items-center justify-center bg-blue-900/50 rounded-xl text-2xl text-blue-300 hover:bg-blue-800/50 transition"
          >-</motion.button>
          
          <div className="flex flex-col items-center">
            <span className="text-blue-300 text-xs uppercase font-bold tracking-wider">Bet</span>
            <span className="text-2xl font-black text-white">🪙 {betAmount}</span>
          </div>

          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setBetAmount(betAmount + 10)} 
            className="w-14 h-14 flex items-center justify-center bg-blue-900/50 rounded-xl text-2xl text-blue-300 hover:bg-blue-800/50 transition"
          >+</motion.button>
        </div>

        {/* Main Action Buttons (Animated Press) */}
        {status === 'IDLE' && !activeBet && (
          <motion.button 
            whileTap={{ scale: 0.97 }}
            onClick={handleBet}
            className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl font-black text-2xl uppercase tracking-wider shadow-lg shadow-blue-900/50 relative overflow-hidden group"
          >
            <span className="relative z-10">Place Bet</span>
            <div className="absolute inset-0 h-full w-0 bg-white/20 transition-all duration-300 group-hover:w-full opacity-20"></div>
          </motion.button>
        )}

        {status === 'IDLE' && activeBet && (
          <button disabled className="w-full py-5 bg-gray-800/50 text-gray-400 rounded-2xl font-bold text-xl uppercase opacity-75 cursor-not-allowed border border-white/5">
            Bet Placed...
          </button>
        )}

        {status === 'RUNNING' && activeBet && (
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={handleCashOut}
            className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-black text-3xl uppercase tracking-widest shadow-[0_0_40px_rgba(34,197,94,0.6)] animate-pulse"
          >
            CASH OUT
            <span className="block text-sm font-bold opacity-90 mt-1">
             +{(activeBet * multiplier).toFixed(0)} Chips
            </span>
          </motion.button>
        )}

        {(status === 'RUNNING' && !activeBet) || status === 'CRASHED' ? (
          <button disabled className="w-full py-5 bg-gray-800/80 text-gray-500 rounded-2xl font-bold text-xl uppercase border border-white/5">
            Wait for Round
          </button>
        ) : null}

      </div>
    </div>
  );
}
// Force update
