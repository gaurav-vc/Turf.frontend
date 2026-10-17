import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { Coins, Sparkles } from 'lucide-react'

export default function CoinFlip() {
  const [isFlipping, setIsFlipping] = useState(false)
  const [result, setResult] = useState<'Heads' | 'Tails' | null>(null)
  const [flipCount, setFlipCount] = useState(0)

  const handleFlip = () => {
    if (isFlipping) return
    setIsFlipping(true)
    setResult(null)

    const outcome = Math.random() > 0.5 ? 'Heads' : 'Tails'
    
    // Animate for 3 seconds for extra drama
    setTimeout(() => {
      setResult(outcome)
      setIsFlipping(false)
      setFlipCount(prev => prev + 1)
      
      // Fire confetti!
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: outcome === 'Heads' ? ['#eab308', '#ca8a04', '#ffffff'] : ['#94a3b8', '#64748b', '#ffffff']
      })
    }, 3000)
  }

  // Generate some random particles
  const particles = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 400,
    y: (Math.random() - 0.5) * 400,
    scale: Math.random() * 0.5 + 0.5,
  }))

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden text-foreground rounded-2xl mx-4 my-4 shadow-lg border border-border">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand/20 via-background to-background opacity-70" />
      <motion.div 
        animate={{ 
          background: isFlipping 
            ? 'radial-gradient(circle at center, rgba(57,255,20,0.4) 0%, transparent 70%)' 
            : (result === 'Heads' ? 'radial-gradient(circle at center, rgba(234,179,8,0.4) 0%, transparent 70%)' : 'radial-gradient(circle at center, rgba(148,163,184,0.4) 0%, transparent 70%)')
        }}
        transition={{ duration: 1 }}
        className="absolute inset-0 z-0"
      />

      {/* Floating Particles when flipping */}
      <AnimatePresence>
        {isFlipping && particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], x: p.x, y: p.y, scale: p.scale }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, delay: Math.random() }}
            className="absolute z-10 w-2 h-2 rounded-full bg-white blur-[1px]"
            style={{ left: '50%', top: '50%' }}
          />
        ))}
      </AnimatePresence>

      <div className="text-center mb-16 z-10">
        <motion.h1 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-5xl font-extrabold tracking-tight mb-4 flex items-center justify-center gap-3 drop-shadow-[0_0_15px_rgba(57,255,20,0.6)]"
        >
          <Coins className="w-12 h-12 text-brand" />
          DIGITAL TOSS
        </motion.h1>
        <p className="text-muted-foreground font-medium">Settle the debate. Heads or Tails?</p>
      </div>

      {/* Coin Container */}
      <div className="relative w-72 h-72 perspective-1000 mb-16 z-20">
        <motion.div
          animate={{
            rotateX: isFlipping ? [0, 1800, 3600, 5400] : (result === 'Tails' ? 180 : 0),
            y: isFlipping ? [0, -250, -100, 0] : 0,
            scale: isFlipping ? [1, 1.3, 1.1, 1] : 1,
          }}
          transition={{
            duration: isFlipping ? 3 : 0.6,
            ease: isFlipping ? "easeInOut" : "easeOut",
            type: isFlipping ? "tween" : "spring",
            bounce: 0.5
          }}
          style={{ transformStyle: 'preserve-3d' }}
          className="w-full h-full relative"
        >
          {/* Edge of the coin to give it 3D thickness (simulated via multiple drop shadows) */}
          <div className="absolute inset-0 rounded-full shadow-[0_20px_0_rgba(100,100,100,0.8)]" style={{ transform: 'translateZ(-10px)' }} />

          {/* Heads Side */}
          <div 
            className="absolute inset-0 rounded-full border-[12px] border-yellow-500 bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 shadow-[0_0_50px_rgba(234,179,8,0.5)] flex items-center justify-center backface-hidden"
            style={{ backfaceVisibility: 'hidden', transform: 'translateZ(1px)' }}
          >
            <div className="w-[85%] h-[85%] rounded-full border-4 border-yellow-200/50 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-400 to-yellow-600 shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-white/20 rotate-45 transform translate-x-[-150%] animate-[shimmer_3s_infinite]" />
              <Sparkles className="w-8 h-8 text-yellow-100 mb-2 opacity-80" />
              <span className="text-5xl font-black text-yellow-900 drop-shadow-lg tracking-tighter">HEADS</span>
              <span className="text-yellow-100 text-sm mt-3 font-bold tracking-[0.3em]">TURFARENA</span>
            </div>
          </div>

          {/* Tails Side */}
          <div 
            className="absolute inset-0 rounded-full border-[12px] border-slate-400 bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 shadow-[0_0_50px_rgba(148,163,184,0.5)] flex items-center justify-center backface-hidden"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg) translateZ(1px)' }}
          >
            <div className="w-[85%] h-[85%] rounded-full border-4 border-slate-200/50 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-300 to-slate-500 shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-white/20 rotate-45 transform translate-x-[-150%] animate-[shimmer_3s_infinite]" />
              <Coins className="w-8 h-8 text-slate-100 mb-2 opacity-80" />
              <span className="text-5xl font-black text-slate-800 drop-shadow-lg tracking-tighter">TAILS</span>
              <span className="text-slate-100 text-sm mt-3 font-bold tracking-[0.3em]">TURFARENA</span>
            </div>
          </div>
        </motion.div>

        {/* Dynamic Floor Shadow */}
        <motion.div 
          animate={{
            scale: isFlipping ? [1, 0.3, 0.7, 1] : 1,
            opacity: isFlipping ? [0.6, 0.1, 0.3, 0.6] : 0.6,
          }}
          transition={{ duration: isFlipping ? 3 : 0.6 }}
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-10 bg-brand/30 blur-2xl rounded-full"
        />
      </div>

      {/* Result Display */}
      <div className="h-24 flex items-center justify-center mb-8 z-10">
        <AnimatePresence mode="wait">
          {result && !isFlipping && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ type: "spring", bounce: 0.6 }}
              className={`text-5xl font-black px-12 py-6 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border-2 ${
                result === 'Heads' 
                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 backdrop-blur-md' 
                  : 'bg-slate-500/20 text-slate-300 border-slate-500/50 backdrop-blur-md'
              }`}
            >
              It's {result}!
            </motion.div>
          )}
          {isFlipping && (
            <motion.div 
              key="flipping"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-3xl font-black text-brand tracking-widest uppercase"
            >
              Flipping...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <Button 
        size="lg" 
        onClick={handleFlip} 
        disabled={isFlipping}
        className={`w-full max-w-sm h-16 text-xl font-black uppercase tracking-wider rounded-2xl transition-all z-10 ${
          isFlipping 
            ? 'bg-muted text-muted-foreground cursor-not-allowed' 
            : 'bg-brand text-primary-foreground hover:bg-brand-hover hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(57,255,20,0.4)]'
        }`}
      >
        {flipCount === 0 ? 'Toss the Coin' : 'Toss Again'}
      </Button>
      
      {/* Custom Keyframe for Shimmer */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-150%) rotate(45deg); }
          100% { transform: translateX(150%) rotate(45deg); }
        }
      `}</style>
    </div>
  )
}
