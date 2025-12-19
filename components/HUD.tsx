
import React from 'react';
import { GameState, GameMode } from '../types';
import { Shield, Target, Zap, Radio, Cpu, Settings, Ghost } from 'lucide-react';

interface HUDProps {
  gameState: GameState;
  reload: () => void;
}

const HUD: React.FC<HUDProps> = ({ gameState, reload }) => {
  const { weapon, health, score, mode, controlPoints, items, intel, aiLevel, kills, isAiming, isInvisible } = gameState;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between font-mono text-white">
      {/* Aim Scope Overlay */}
      {isAiming && weapon.hasScope && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          {/* Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_20%,_black_70%)] opacity-95" />
          
          {/* Main Scope Circle */}
          <div className="w-[80vh] h-[80vh] border-[15vh] border-black rounded-full shadow-[0_0_0_2000px_black] relative overflow-hidden flex items-center justify-center">
             {/* Crosshairs */}
             <div className="absolute w-full h-px bg-red-500/40" />
             <div className="absolute w-px h-full bg-red-500/40" />
             <div className="w-4 h-4 rounded-full border border-red-500/80" />
             
             {/* Tactical Markings */}
             <div className="absolute top-10 text-[10px] text-red-400/50 uppercase font-black">Target Lock Enabled</div>
             <div className="absolute bottom-10 flex gap-4">
                <div className="text-[10px] text-red-400/50 uppercase">Zoom: {weapon.zoomAmount/10}x</div>
                <div className="text-[10px] text-red-400/50 uppercase">STAB: ACTIVE</div>
             </div>
          </div>
        </div>
      )}

      {/* Main HUD Elements */}
      <div className="p-8 flex justify-between items-start z-20">
        <div className="flex flex-col gap-3">
           <div className="bg-black/80 p-5 border-l-4 border-red-600 backdrop-blur-md rounded-r-xl">
             <div className="flex items-center gap-2 text-red-500 mb-1">
               <Cpu size={20} />
               <span className="text-xs font-black uppercase tracking-[0.3em]">Threat Vector</span>
             </div>
             <div className="text-2xl font-black italic tracking-tighter">PHASE {aiLevel} ELITE</div>
             <div className="text-[10px] text-zinc-500 uppercase mt-1 font-bold">Hostiles Terminated: {kills}</div>
           </div>

           {isInvisible && (
             <div className="bg-zinc-950/90 border border-white/20 p-4 rounded-xl backdrop-blur-md flex items-center gap-4 animate-pulse">
                <Ghost size={24} className="text-zinc-400" />
                <div>
                  <div className="text-white font-black text-xs uppercase tracking-widest">Stealth Field Active</div>
                  <div className="text-[9px] text-zinc-500 uppercase">Invisible to Hostiles</div>
                </div>
             </div>
           )}

           <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-xl backdrop-blur-sm max-w-sm">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Radio size={16} className="animate-pulse" />
                <span className="text-[10px] uppercase font-black tracking-widest">Tactical Link</span>
              </div>
              <p className="text-xs text-blue-100/60 leading-relaxed italic">"{intel}"</p>
           </div>
        </div>

        <div className="flex flex-col items-end gap-3">
           <div className="bg-black/60 px-6 py-3 rounded-xl text-right border border-white/5 backdrop-blur-md">
              <div className="text-[10px] text-zinc-500 font-black tracking-widest uppercase">{mode.replace(/_/g, ' ')}</div>
              <div className="text-3xl font-black text-blue-400 italic leading-none mt-1">{score.toLocaleString()}</div>
           </div>
           
           {mode === GameMode.DOMINATION && (
             <div className="flex gap-2">
                {controlPoints.map(p => (
                  <div key={p.id} className={`w-12 h-12 flex flex-col items-center justify-center border-2 font-black rounded-lg transition-colors ${p.owner === 'player' ? 'bg-blue-600 border-white text-white' : 'bg-black/60 border-zinc-800 text-zinc-700'}`}>
                    <span className="text-sm">{p.label}</span>
                    <div className={`h-1 w-6 mt-1 rounded-full ${p.owner === 'player' ? 'bg-white' : 'bg-zinc-800'}`} />
                  </div>
                ))}
             </div>
           )}

           {mode === GameMode.SCAVENGER && (
             <div className="bg-emerald-600/30 border border-emerald-500/50 p-3 rounded-xl text-xs flex items-center gap-3 backdrop-blur-md">
                <Target size={18} className="text-emerald-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-emerald-400/70 font-black uppercase">Intel Core Count</span>
                  <span className="text-lg font-black">{items.filter(i => i.collected).length} / {items.length}</span>
                </div>
             </div>
           )}
        </div>
      </div>

      <div className="p-8 flex justify-between items-end z-20">
        {/* Health / Vitals */}
        <div className="bg-black/90 p-6 rounded-3xl border border-white/10 backdrop-blur-xl min-w-[320px] shadow-2xl">
           <div className="flex justify-between items-end mb-3">
              <div className="flex flex-col">
                 <div className="flex items-center gap-2 text-green-500 mb-1">
                   <Shield size={24} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Biometrics</span>
                 </div>
                 <div className="text-[9px] text-zinc-500 uppercase font-black">Combat Readiness: Optimal</div>
              </div>
              <div className={`text-6xl font-black italic leading-none ${health < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{Math.floor(health)}<span className="text-xl ml-1">%</span></div>
           </div>
           <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
              <div className={`h-full transition-all duration-500 ease-out ${health < 30 ? 'bg-red-600' : 'bg-green-600'}`} style={{ width: `${health}%` }} />
           </div>
        </div>

        {/* Gun & Attachments */}
        <div className="bg-black/90 p-6 rounded-3xl border border-white/10 backdrop-blur-xl min-w-[360px] text-right shadow-2xl">
           <div className="flex justify-between items-start mb-4">
              <div className="flex flex-wrap gap-2 max-w-[150px] justify-end">
                {weapon.attachments.map((at, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 px-2 py-1 rounded text-[8px] uppercase font-black text-zinc-400">
                    {at.name}
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-end">
                 <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">{weapon.type} CLASSIFIED</div>
                 <div className="text-3xl font-black italic text-white uppercase tracking-tighter">{weapon.name}</div>
              </div>
           </div>
           
           <div className="flex items-center justify-end gap-6 border-t border-white/5 pt-4">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-zinc-600 font-black tracking-widest uppercase">Ammo Reserves</span>
                <div className="flex items-end gap-1">
                   <span className={`text-6xl font-black leading-none ${weapon.ammo < (weapon.maxAmmo * 0.3) ? 'text-orange-500 animate-pulse' : 'text-white'}`}>{weapon.ammo}</span>
                   <span className="text-2xl text-zinc-800 font-black mb-1">/ {weapon.maxAmmo}</span>
                </div>
              </div>
              <div className="bg-zinc-800 p-4 rounded-2xl border border-white/5 shadow-inner">
                <Zap size={32} className="text-amber-400" />
              </div>
           </div>
           
           {weapon.ammo === 0 && (
             <div className="mt-4 py-2 bg-red-600/20 text-red-500 text-xs font-black rounded-lg animate-bounce uppercase tracking-[0.2em] text-center border border-red-500/30">
               Reload Required [R]
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default HUD;
