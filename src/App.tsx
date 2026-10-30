import { useState } from 'react'

export function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-md w-full bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-indigo-500/10 text-center space-y-6">
        <div className="flex justify-center items-center gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            React 19 + Vite + Tailwind v4
          </span>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
            Tressera
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Your modern React + TypeScript + Tailwind CSS application is ready.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Interactive Test
          </p>
          <button
            type="button"
            onClick={() => setCount((c) => c + 1)}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-medium text-sm transition-all duration-150 shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            Count is: {count}
          </button>
        </div>

        <div className="pt-2 border-t border-slate-800/60 text-xs text-slate-500 flex justify-between">
          <span>Edit <code className="text-indigo-400 font-mono">src/App.tsx</code></span>
          <span>HMR enabled</span>
        </div>
      </div>
    </div>
  )
}

export default App
