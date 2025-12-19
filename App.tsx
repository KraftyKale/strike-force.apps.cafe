
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls, Sky, Stars, Environment } from '@react-three/drei';
import { GameStatus, GameState, Weapon, Bot, Chest, GameMode, ControlPoint, ScavengeItem } from './types';
import { INITIAL_WEAPONS, MAP_SIZE, BOT_COUNT, CHEST_COUNT, AI_LEVEL_UP_KILLS, AI_LEVEL_UP_CHESTS } from './constants';
import GameScene from './components/GameScene';
import HUD from './components/HUD';
import { getIntelReport } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: GameStatus.START,
    mode: GameMode.SKIRMISH,
    score: 0,
    health: 100,
    maxHealth: 100,
    weapon: INITIAL_WEAPONS[0],
    bots: [],
    chests: [],
    controlPoints: [],
    items: [],
    logs: ['Welcome to Operation Gemini.', 'Right-Click to Aim or Open Loot Boxes.'],
    intel: 'Link established. Awaiting orders.',
    aiLevel: 1,
    chestsOpened: 0,
    kills: 0,
    isAiming: false,
    isInvisible: false,
  });

  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const controlsRef = useRef<any>(null);

  const initGame = useCallback(async (selectedMode: GameMode) => {
    const newBots: Bot[] = Array.from({ length: BOT_COUNT }).map((_, i) => ({
      id: `bot-${i}`,
      position: [
        (Math.random() - 0.5) * (MAP_SIZE - 20),
        1,
        (Math.random() - 0.5) * (MAP_SIZE - 20)
      ],
      health: 100,
      type: 'bot',
      lastShot: 0,
      state: 'idle',
      difficulty: 1,
      speed: 1.2 + Math.random() * 0.6
    }));

    const newChests: Chest[] = Array.from({ length: CHEST_COUNT }).map((_, i) => ({
      id: `chest-${i}`,
      position: [
        (Math.random() - 0.5) * (MAP_SIZE - 15),
        0.5,
        (Math.random() - 0.5) * (MAP_SIZE - 15)
      ],
      health: 1,
      type: 'chest',
      opened: false,
      weaponInside: INITIAL_WEAPONS[Math.floor(Math.random() * (INITIAL_WEAPONS.length - 1)) + 1]
    }));

    let newControlPoints: ControlPoint[] = [];
    if (selectedMode === GameMode.DOMINATION) {
      newControlPoints = [
        { id: 'p-a', position: [-25, 0, -25], type: 'point', owner: 'none', captureProgress: 0, label: 'A', health: 100 },
        { id: 'p-b', position: [0, 0, 0], type: 'point', owner: 'none', captureProgress: 0, label: 'B', health: 100 },
        { id: 'p-c', position: [25, 0, 25], type: 'point', owner: 'none', captureProgress: 0, label: 'C', health: 100 },
      ];
    } else if (selectedMode === GameMode.KING_OF_THE_HILL) {
      newControlPoints = [
        { id: 'p-hill', position: [0, 0, 0], type: 'point', owner: 'none', captureProgress: 0, label: 'HILL', health: 100 },
      ];
    }

    let newItems: ScavengeItem[] = [];
    if (selectedMode === GameMode.SCAVENGER) {
      newItems = Array.from({ length: 12 }).map((_, i) => ({
        id: `item-${i}`,
        position: [(Math.random() - 0.5) * (MAP_SIZE - 20), 0.75, (Math.random() - 0.5) * (MAP_SIZE - 20)],
        type: 'item',
        collected: false,
        health: 1
      }));
    }

    setGameState(prev => ({
      ...prev,
      status: GameStatus.PLAYING,
      mode: selectedMode,
      score: 0,
      health: 100,
      weapon: INITIAL_WEAPONS[0],
      bots: newBots,
      chests: newChests,
      controlPoints: newControlPoints,
      items: newItems,
      aiLevel: 1,
      kills: 0,
      chestsOpened: 0,
      isAiming: false,
      isInvisible: false,
      logs: [`Mission Started: ${selectedMode.replace(/_/g, ' ')}`]
    }));

    try {
      const report = await getIntelReport(`Mission ${selectedMode} start in sector Gemini.`);
      setGameState(prev => ({ ...prev, intel: report }));
    } catch (e) { console.error(e); }
  }, []);

  const handleBotKill = useCallback((botId: string) => {
    setGameState(prev => {
      const newKills = prev.kills + 1;
      const shouldLevelUp = newKills % AI_LEVEL_UP_KILLS === 0;
      const newLevel = shouldLevelUp ? prev.aiLevel + 1 : prev.aiLevel;
      const newBots = prev.bots.filter(b => b.id !== botId);
      
      if (prev.mode === GameMode.SKIRMISH && newBots.length < 5) {
        newBots.push({
           id: `bot-${Date.now()}`,
           position: [(Math.random() - 0.5) * 60, 1, (Math.random() - 0.5) * 60],
           health: 100, type: 'bot', lastShot: 0, state: 'idle', difficulty: newLevel, speed: 1.2 + newLevel * 0.2
        });
      }

      return {
        ...prev,
        bots: newBots,
        kills: newKills,
        aiLevel: newLevel,
        score: prev.score + (150 * newLevel),
        logs: [...prev.logs, `Kill Confirmed. Threat: Lvl ${newLevel}`].slice(-5),
        status: (prev.mode !== GameMode.SKIRMISH && newBots.length === 0) ? GameStatus.WIN : prev.status
      };
    });
  }, []);

  const handleChestOpen = useCallback((chestId: string) => {
    setGameState(prev => {
      const chest = prev.chests.find(c => c.id === chestId);
      if (!chest || chest.opened) return prev;
      const newChestsOpened = prev.chestsOpened + 1;
      const shouldLevelUp = newChestsOpened % AI_LEVEL_UP_CHESTS === 0;
      const newLevel = shouldLevelUp ? prev.aiLevel + 1 : prev.aiLevel;
      return {
        ...prev,
        chests: prev.chests.map(c => c.id === chestId ? { ...c, opened: true } : c),
        weapon: chest.weaponInside,
        chestsOpened: newChestsOpened,
        aiLevel: newLevel,
        logs: [...prev.logs, `Looted: ${chest.weaponInside.name}`].slice(-5)
      };
    });
  }, []);

  const handleItemCollect = useCallback((itemId: string) => {
    setGameState(prev => {
      const newItems = prev.items.map(it => it.id === itemId ? { ...it, collected: true } : it);
      const isWin = newItems.filter(i => i.collected).length >= prev.items.length;
      return {
        ...prev,
        items: newItems,
        score: prev.score + 500,
        logs: [...prev.logs, `Scavenged Item Found`].slice(-5),
        status: isWin ? GameStatus.WIN : prev.status
      };
    });
  }, []);

  const handlePlayerDamage = useCallback((amount: number) => {
    setGameState(prev => {
      const newHealth = Math.max(0, prev.health - (amount * (1 + prev.aiLevel * 0.1)));
      if (newHealth <= 0) return { ...prev, health: 0, status: GameStatus.GAMEOVER };
      return { ...prev, health: newHealth };
    });
  }, []);

  const reload = useCallback(() => {
    setGameState(prev => {
      if (prev.weapon.ammo === prev.weapon.maxAmmo) return prev;
      return {
        ...prev,
        weapon: { ...prev.weapon, ammo: prev.weapon.maxAmmo },
        logs: [...prev.logs, 'Mag Swapping...'].slice(-5)
      };
    });
  }, []);

  const toggleAim = useCallback((aiming: boolean) => {
    setGameState(prev => ({ ...prev, isAiming: aiming }));
  }, []);

  const toggleInvisibility = useCallback((invisible: boolean) => {
    setGameState(prev => {
      if (prev.isInvisible === invisible) return prev;
      return { ...prev, isInvisible: invisible };
    });
  }, []);

  useEffect(() => {
    if (gameState.status !== GameStatus.PLAYING) return;
    const interval = setInterval(() => {
      setGameState(prev => {
        let newScore = prev.score;
        if (prev.mode === GameMode.DOMINATION || prev.mode === GameMode.KING_OF_THE_HILL) {
          const ownedPoints = prev.controlPoints.filter(p => p.owner === 'player').length;
          newScore += ownedPoints * 15;
          if (newScore >= 5000) return { ...prev, score: newScore, status: GameStatus.WIN };
        }
        return { ...prev, score: newScore };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState.status]);

  return (
    <div className="w-full h-full relative bg-black overflow-hidden select-none cursor-crosshair">
      {gameState.status === GameStatus.PLAYING && (
        <>
          <Canvas shadows camera={{ fov: 75, position: [0, 2, 5] }}>
            <Sky sunPosition={[15, 10, 15]} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <Environment preset="night" />
            
            <GameScene 
              gameState={gameState}
              onBotKill={handleBotKill}
              onChestOpen={handleChestOpen}
              onItemCollect={handleItemCollect}
              onPlayerDamage={handlePlayerDamage}
              onShoot={() => setGameState(p => ({ ...p, weapon: { ...p.weapon, ammo: Math.max(0, p.weapon.ammo - 1) } }))}
              onPointCapture={(id, team) => {
                setGameState(p => ({
                  ...p,
                  controlPoints: p.controlPoints.map(cp => cp.id === id ? { ...cp, owner: team } : cp),
                  logs: [...p.logs, `${team.toUpperCase()} Sector Secure`].slice(-5)
                }));
              }}
              onToggleAim={toggleAim}
              onToggleInvisibility={toggleInvisibility}
              onReload={reload}
            />

            <PointerLockControls 
              ref={controlsRef}
              onLock={() => setIsPointerLocked(true)} 
              onUnlock={() => setIsPointerLocked(false)} 
            />
          </Canvas>
          
          <HUD gameState={gameState} reload={reload} />
          
          {!isPointerLocked && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50">
              <div className="bg-zinc-950 border border-white/10 p-12 rounded-2xl text-center max-w-sm shadow-[0_0_100px_rgba(255,255,255,0.05)]">
                <h2 className="text-5xl font-black text-white mb-2 tracking-tighter italic">COMMS LOST</h2>
                <p className="text-zinc-500 mb-8 uppercase text-[10px] tracking-[0.4em]">Signal Re-routing...</p>
                <button 
                  onClick={() => controlsRef.current?.lock()}
                  className="w-full py-5 bg-white text-black font-black rounded hover:bg-red-600 hover:text-white transition-all transform active:scale-95 uppercase tracking-widest shadow-xl"
                >
                  Reconnect
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {(gameState.status === GameStatus.START || gameState.status === GameStatus.GAMEOVER || gameState.status === GameStatus.WIN) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="max-w-6xl w-full p-12 flex flex-col md:flex-row gap-16 items-center">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-block px-3 py-1 bg-red-600 text-[10px] font-black tracking-widest text-white uppercase mb-4">Tactical Evolved v2.0</div>
              <h1 className="text-8xl font-black text-white mb-2 tracking-tighter italic leading-none">STRIKE FORCE</h1>
              <h2 className="text-4xl font-bold text-red-600 mb-10 tracking-[0.6em] uppercase">Gemini</h2>
              
              {gameState.status !== GameStatus.START && (
                <div className="mb-10 p-8 bg-zinc-900 border border-white/5 rounded-2xl shadow-2xl">
                  <p className={`text-5xl font-black mb-2 ${gameState.status === GameStatus.WIN ? 'text-emerald-400' : 'text-red-500'}`}>
                    {gameState.status === GameStatus.WIN ? 'DEBRIEF SUCCESS' : 'KIA'}
                  </p>
                  <p className="text-zinc-500 uppercase font-black tracking-[0.3em]">Operational Score: {gameState.score.toLocaleString()}</p>
                </div>
              )}
              
              <p className="text-zinc-500 text-lg max-w-md border-l-2 border-red-600 pl-6 italic">
                "Evolution is the only constant. Scavenge attachments, master the scopes, and survive the rising threat level."
              </p>
            </div>

            <div className="flex-1 grid grid-cols-1 gap-5 w-full max-w-md">
               <button onClick={() => initGame(GameMode.SKIRMISH)} className="group p-6 bg-zinc-900 border border-white/5 hover:border-white/20 rounded-xl transition-all hover:translate-x-2">
                  <div className="text-white font-black text-xl">SKIRMISH ELITE</div>
                  <div className="text-zinc-500 text-xs mt-1 uppercase tracking-widest">Elimination & Scavenge</div>
               </button>
               <button onClick={() => initGame(GameMode.DOMINATION)} className="group p-6 bg-zinc-900 border border-white/5 hover:border-white/20 rounded-xl transition-all hover:translate-x-2">
                  <div className="text-white font-black text-xl">SECTOR DOMINATION</div>
                  <div className="text-zinc-500 text-xs mt-1 uppercase tracking-widest">Point Capture (A/B/C)</div>
               </button>
               <button onClick={() => initGame(GameMode.KING_OF_THE_HILL)} className="group p-6 bg-zinc-900 border border-white/5 hover:border-white/20 rounded-xl transition-all hover:translate-x-2">
                  <div className="text-white font-black text-xl">ZENITH CONTROL</div>
                  <div className="text-zinc-500 text-xs mt-1 uppercase tracking-widest">Hold Strategic Peak</div>
               </button>
               <button onClick={() => initGame(GameMode.SCAVENGER)} className="group p-6 bg-zinc-900 border border-white/5 hover:border-white/20 rounded-xl transition-all hover:translate-x-2">
                  <div className="text-white font-black text-xl">DATA RETRIEVAL</div>
                  <div className="text-zinc-500 text-xs mt-1 uppercase tracking-widest">Secure Intel Cores</div>
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
