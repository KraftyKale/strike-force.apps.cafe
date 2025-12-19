
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GameState, Bot, Chest, GameMode } from '../types';
import { MAP_SIZE, BATTLEFIELD_OBSTACLES, LADDERS, VENTS } from '../constants';

interface BulletData {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  direction: THREE.Vector3;
  speed: number;
  life: number;
  owner: 'player' | 'bot';
}

interface GameSceneProps {
  gameState: GameState;
  onBotKill: (id: string) => void;
  onChestOpen: (id: string) => void;
  onItemCollect: (id: string) => void;
  onPlayerDamage: (amount: number) => void;
  onShoot: () => void;
  onPointCapture: (id: string, team: 'player' | 'bots') => void;
  onToggleAim: (aiming: boolean) => void;
  onToggleInvisibility: (invisible: boolean) => void;
  onReload: () => void;
}

const GameScene: React.FC<GameSceneProps> = ({ 
  gameState, onBotKill, onChestOpen, onItemCollect, onPlayerDamage, onShoot, onPointCapture, onToggleAim, onToggleInvisibility, onReload 
}) => {
  const { camera, raycaster, scene } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const moveState = useRef({ forward: false, backward: false, left: false, right: false, jump: false });
  const jumpsRemaining = useRef(2);
  const lastShotTime = useRef(0);
  
  // Camera state
  const bobTimer = useRef(0);
  const landingImpact = useRef(0);
  const jumpKick = useRef(0);
  
  const botRefs = useRef<{ [key: string]: THREE.Group }>({});
  const [botMuzzleFlashes, setBotMuzzleFlashes] = useState<{ [key: string]: boolean }>({});
  const botRaycaster = useRef(new THREE.Raycaster());

  const bulletsRef = useRef<BulletData[]>([]);
  const bulletGroupRef = useRef<THREE.Group>(null);

  const obstacleBounds = useMemo(() => {
    return BATTLEFIELD_OBSTACLES.map(obs => {
      const box = new THREE.Box3();
      const pos = new THREE.Vector3(...obs.position);
      box.setFromCenterAndSize(pos, new THREE.Vector3(...obs.size));
      return box;
    });
  }, []);

  const ventBounds = useMemo(() => {
    return VENTS.map(v => {
      const box = new THREE.Box3();
      const pos = new THREE.Vector3(...v.position);
      box.setFromCenterAndSize(pos, new THREE.Vector3(...v.size));
      return box;
    });
  }, []);

  const ladderBounds = useMemo(() => {
    return LADDERS.map(l => {
      const box = new THREE.Box3();
      const pos = new THREE.Vector3(...l.position);
      box.setFromCenterAndSize(pos, new THREE.Vector3(...l.size).multiplyScalar(1.5)); // Larger interaction area
      return box;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState.status !== 'PLAYING') return;
      switch (e.code) {
        case 'KeyW': moveState.current.forward = true; break;
        case 'KeyS': moveState.current.backward = true; break;
        case 'KeyA': moveState.current.left = true; break;
        case 'KeyD': moveState.current.right = true; break;
        case 'KeyR': onReload(); break;
        case 'Space': 
          if (jumpsRemaining.current > 0) {
            handleJump();
          }
          break;
        case 'KeyE': checkInteraction(); break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': moveState.current.forward = false; break;
        case 'KeyS': moveState.current.backward = false; break;
        case 'KeyA': moveState.current.left = false; break;
        case 'KeyD': moveState.current.right = false; break;
      }
    };
    
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) shoot();
      if (e.button === 2) {
        // Contextual Right-Click: Open Chest or Aim
        const opened = tryInteractWithChest();
        if (!opened) {
          onToggleAim(true);
        }
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2) onToggleAim(false);
    };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
    };
  }, [gameState.weapon, gameState.status, onToggleAim, onReload]);

  const handleJump = () => {
    velocity.current.y = 12; 
    jumpsRemaining.current -= 1;
    jumpKick.current = 0.15; 
  };

  const tryInteractWithChest = () => {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.distance < 4.5) {
        let target = hit.object;
        // Traverse up to find the group with chest data
        while (target && !target.userData.id && target.parent) {
          target = target.parent as THREE.Object3D;
        }
        
        if (target && target.userData.type === 'chest' && !target.userData.opened) {
          onChestOpen(target.userData.id);
          return true;
        }
      }
    }
    return false;
  };

  const spawnVisualBullet = (pos: THREE.Vector3, dir: THREE.Vector3, color: string, owner: 'player' | 'bot', maxDist: number = 200) => {
    if (!bulletGroupRef.current) return;

    const geometry = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(geometry, material);
    
    const matrix = new THREE.Matrix4();
    matrix.lookAt(new THREE.Vector3(0,0,0), dir, new THREE.Vector3(0,1,0));
    mesh.quaternion.setFromRotationMatrix(matrix);
    mesh.rotateX(Math.PI / 2);
    mesh.position.copy(pos);

    const light = new THREE.PointLight(color, 2, 5);
    mesh.add(light);
    bulletGroupRef.current.add(mesh);

    bulletsRef.current.push({
      mesh,
      light,
      direction: dir.clone(),
      speed: owner === 'player' ? 180 : 80,
      life: maxDist / (owner === 'player' ? 180 : 80),
      owner
    });
  };

  const shoot = () => {
    const now = Date.now();
    if (now - lastShotTime.current < gameState.weapon.fireRate) return;
    if (gameState.weapon.ammo <= 0) return;
    lastShotTime.current = now;
    onShoot();

    const bulletDir = new THREE.Vector3();
    camera.getWorldDirection(bulletDir);
    
    const bulletStart = camera.position.clone();
    const right = new THREE.Vector3().crossVectors(bulletDir, new THREE.Vector3(0, 1, 0)).normalize();
    bulletStart.add(right.multiplyScalar(0.3)).add(new THREE.Vector3(0, -0.2, 0));

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    let maxDist = 200;

    if (intersects.length > 0) {
      const hit = intersects[0];
      maxDist = hit.distance;
      let target = hit.object;
      while (target && !target.userData.id && target.parent) {
        target = target.parent as THREE.Object3D;
      }
      if (target && target.userData.type === 'bot') onBotKill(target.userData.id);
    }

    spawnVisualBullet(bulletStart, bulletDir, '#fffb00', 'player', maxDist);
  };

  const checkInteraction = () => {
    const pos = camera.position;
    gameState.chests.forEach(c => {
      if (!c.opened && pos.distanceTo(new THREE.Vector3(...c.position)) < 4) onChestOpen(c.id);
    });
    gameState.items.forEach(it => {
      if (!it.collected && pos.distanceTo(new THREE.Vector3(...it.position)) < 3) onItemCollect(it.id);
    });
  };

  const checkCollision = (nextPos: THREE.Vector3, radius: number = 0.6) => {
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(nextPos.x, nextPos.y - 0.5, nextPos.z), 
      new THREE.Vector3(radius * 1.5, 1, radius * 1.5)
    );
    for (const obs of obstacleBounds) {
      if (playerBox.intersectsBox(obs)) return true;
    }
    return false;
  };

  useFrame((state, delta) => {
    if (gameState.status !== 'PLAYING') return;
    const currentTime = state.clock.getElapsedTime();

    // Check Invisibility (Vents)
    let inVent = false;
    for (const vent of ventBounds) {
      if (vent.containsPoint(camera.position)) {
        inVent = true;
        break;
      }
    }
    onToggleInvisibility(inVent);

    // Check Ladder
    let nearLadder = false;
    for (const ladder of ladderBounds) {
      if (ladder.containsPoint(camera.position)) {
        nearLadder = true;
        break;
      }
    }

    const bullets = bulletsRef.current;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.mesh.position.add(b.direction.clone().multiplyScalar(b.speed * delta));
      b.life -= delta;

      let hitWall = false;
      const bulletBox = new THREE.Box3().setFromObject(b.mesh);
      for (const obs of obstacleBounds) {
        if (bulletBox.intersectsBox(obs)) {
          hitWall = true;
          break;
        }
      }

      if (b.life <= 0 || hitWall) {
        if (bulletGroupRef.current) bulletGroupRef.current.remove(b.mesh);
        bullets.splice(i, 1);
      }
    }

    const targetFov = gameState.isAiming ? 75 - gameState.weapon.zoomAmount : 75;
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 12 * delta);
    camera.updateProjectionMatrix();

    velocity.current.x -= velocity.current.x * 10.0 * delta;
    velocity.current.z -= velocity.current.z * 10.0 * delta;
    
    const isGround = camera.position.y <= 2;
    if (!isGround && !nearLadder) {
      velocity.current.y -= 35 * delta; 
    }

    if (nearLadder && moveState.current.forward) {
      velocity.current.y = 8;
    } else if (nearLadder && moveState.current.backward) {
      velocity.current.y = -8;
    } else if (nearLadder) {
      velocity.current.y = 0;
    }

    const groundSpeed = gameState.isAiming ? 60.0 : 150.0;
    const airControl = 0.4;
    const currentSpeed = isGround ? groundSpeed : groundSpeed * airControl;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    forward.y = 0; right.y = 0;
    forward.normalize(); right.normalize();

    const moveVector = new THREE.Vector3();
    if (moveState.current.forward) moveVector.add(forward);
    if (moveState.current.backward) moveVector.sub(forward);
    if (moveState.current.right) moveVector.add(right);
    if (moveState.current.left) moveVector.sub(right);
    moveVector.normalize().multiplyScalar(currentSpeed * delta * 0.1);

    const nextPosX = camera.position.clone().add(new THREE.Vector3(moveVector.x, 0, 0));
    if (!checkCollision(nextPosX)) camera.position.x = nextPosX.x;
    const nextPosZ = camera.position.clone().add(new THREE.Vector3(0, 0, moveVector.z));
    if (!checkCollision(nextPosZ)) camera.position.z = nextPosZ.z;

    camera.position.y += velocity.current.y * delta;

    if (camera.position.y < 2) { 
      if (velocity.current.y < -5) {
        landingImpact.current = Math.min(0.2, Math.abs(velocity.current.y) * 0.015);
      }
      velocity.current.y = 0; 
      camera.position.y = 2; 
      jumpsRemaining.current = 2; 
    }

    landingImpact.current = THREE.MathUtils.lerp(landingImpact.current, 0, 10 * delta);
    jumpKick.current = THREE.MathUtils.lerp(jumpKick.current, 0, 8 * delta);
    
    const isMoving = moveVector.length() > 0;
    if (isMoving && isGround) {
      bobTimer.current += delta * (gameState.isAiming ? 5 : 12);
      camera.position.y += Math.sin(bobTimer.current) * (gameState.isAiming ? 0.005 : 0.04);
    }
    
    camera.position.y -= landingImpact.current;
    camera.position.y += jumpKick.current;

    camera.position.x = Math.max(-MAP_SIZE/2 + 1, Math.min(MAP_SIZE/2 - 1, camera.position.x));
    camera.position.z = Math.max(-MAP_SIZE/2 + 1, Math.min(MAP_SIZE/2 - 1, camera.position.z));

    gameState.controlPoints.forEach(p => {
       if (camera.position.distanceTo(new THREE.Vector3(...p.position)) < 5 && p.owner !== 'player') onPointCapture(p.id, 'player');
    });

    gameState.bots.forEach(bot => {
      const ref = botRefs.current[bot.id];
      if (!ref) return;

      const playerPos = new THREE.Vector3(camera.position.x, 1.5, camera.position.z);
      const botPosVec = ref.position.clone().add(new THREE.Vector3(0, 0.5, 0));
      const distToPlayer = botPosVec.distanceTo(playerPos);

      // Stealth logic: Bots ignore the player if they are in a vent
      if (distToPlayer < 45 && !gameState.isInvisible) {
        ref.lookAt(playerPos.x, ref.position.y, playerPos.z);
        const directionToPlayer = new THREE.Vector3().subVectors(playerPos, botPosVec).normalize();
        
        botRaycaster.current.set(botPosVec, directionToPlayer);
        const intersects = botRaycaster.current.intersectObjects(scene.children, true);
        const hasLOS = intersects.length > 0 && intersects[0].distance >= distToPlayer - 1;

        if (hasLOS) {
          const moveSpeed = (bot.speed || 1.2) * delta;
          let botMove = new THREE.Vector3(0,0,0);
          if (distToPlayer > 18) botMove = directionToPlayer.clone().multiplyScalar(moveSpeed);
          else if (distToPlayer < 12) botMove = directionToPlayer.clone().multiplyScalar(-moveSpeed);

          if (botMove.length() > 0) {
            const nextBotPos = ref.position.clone().add(botMove);
            if (!checkCollision(nextBotPos, 0.7)) ref.position.copy(nextBotPos);
          }

          const walkCycle = currentTime * 8;
          ref.rotation.z = Math.sin(walkCycle) * 0.1;
          ref.position.y = 1 + Math.abs(Math.sin(walkCycle)) * 0.12;

          const shotCooldown = Math.max(0.4, 2.2 - (gameState.aiLevel * 0.3));
          if (!bot.lastShot || (currentTime - bot.lastShot > shotCooldown)) {
            bot.lastShot = currentTime;
            
            const bDir = new THREE.Vector3().subVectors(playerPos, botPosVec).normalize();
            const spread = 0.2 / (gameState.aiLevel + 1);
            bDir.x += (Math.random() - 0.5) * spread;
            bDir.y += (Math.random() - 0.5) * spread;
            bDir.normalize();

            spawnVisualBullet(botPosVec.clone(), bDir, '#ff3300', 'bot', distToPlayer);

            setBotMuzzleFlashes(prev => ({ ...prev, [bot.id]: true }));
            setTimeout(() => setBotMuzzleFlashes(prev => ({ ...prev, [bot.id]: false })), 60);
            
            if (Math.random() < (0.15 + gameState.aiLevel * 0.04)) onPlayerDamage(2 + gameState.aiLevel);
          }
        }
      }
    });
  });

  return (
    <>
      <group ref={bulletGroupRef} />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[MAP_SIZE, MAP_SIZE]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <gridHelper args={[MAP_SIZE, 40, '#cccccc', '#eeeeee']} />

      {BATTLEFIELD_OBSTACLES.map((obs, i) => (
        <mesh key={`obs-${i}`} position={obs.position} castShadow receiveShadow>
          <boxGeometry args={obs.size} />
          <meshStandardMaterial color={obs.color} roughness={0.8} />
        </mesh>
      ))}

      {LADDERS.map((l, i) => (
        <group key={`ladder-${i}`} position={l.position}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={l.size} />
            <meshStandardMaterial color={l.color} metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Rungs */}
          {Array.from({ length: 12 }).map((_, j) => (
            <mesh key={j} position={[0, -4 + j * 0.7, 0.1]} rotation={[0, 0, 0]}>
              <boxGeometry args={[l.size[0] === 0.2 ? 0.3 : 1.6, 0.1, 0.1]} />
              <meshStandardMaterial color="#333" />
            </mesh>
          ))}
        </group>
      ))}

      {VENTS.map((v, i) => (
        <mesh key={`vent-${i}`} position={v.position} castShadow receiveShadow>
          <boxGeometry args={v.size} />
          <meshStandardMaterial color={v.color} transparent opacity={0.5} metalness={1} roughness={0} />
        </mesh>
      ))}

      {gameState.bots.map(bot => (
        <group key={bot.id} position={bot.position} ref={(el) => { if (el) botRefs.current[bot.id] = el; }} userData={{ id: bot.id, type: 'bot' }}>
          <mesh castShadow><cylinderGeometry args={[0.4, 0.5, 1.8, 8]} /><meshStandardMaterial color="#ff2222" metalness={0.8} /></mesh>
          <mesh position={[0, 0.6, 0.35]}><boxGeometry args={[0.5, 0.1, 0.1]} /><meshStandardMaterial color="#000" emissive="#ff0000" emissiveIntensity={2} /></mesh>
          <mesh position={[0, 1.1, 0]}><sphereGeometry args={[0.35]} /><meshStandardMaterial color="#111" /></mesh>
          <group position={[0.5, 0, 0.4]}>
            <mesh rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.06, 0.06, 1.2]} /><meshStandardMaterial color="#111" /></mesh>
            {botMuzzleFlashes[bot.id] && (
              <group position={[0, 0, 0.7]}><mesh><sphereGeometry args={[0.2]} /><meshBasicMaterial color="#ffcc00" transparent opacity={0.8} /></mesh><pointLight color="#ffaa00" intensity={4} distance={6} /></group>
            )}
          </group>
        </group>
      ))}

      {gameState.controlPoints.map(p => (
        <group key={p.id} position={p.position}>
           <mesh rotation={[-Math.PI/2, 0, 0]}><ringGeometry args={[5, 5.2, 32]} /><meshBasicMaterial color={p.owner === 'player' ? '#3b82f6' : p.owner === 'bots' ? '#ef4444' : '#444'} /></mesh>
           <mesh position={[0, 4, 0]}><cylinderGeometry args={[0.08, 0.08, 8]} /><meshStandardMaterial color="#222" /></mesh>
           <pointLight position={[0, 2, 0]} color={p.owner === 'player' ? '#3b82f6' : '#666'} intensity={2} />
        </group>
      ))}

      {gameState.items.map(it => !it.collected && (
        <mesh key={it.id} position={it.position} rotation={[0, Date.now() * 0.002, 0]}>
           <octahedronGeometry args={[0.5]} />
           <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={3} />
        </mesh>
      ))}

      {gameState.chests.map(c => (
        <group key={c.id} position={c.position} userData={{ id: c.id, type: 'chest', opened: c.opened }}>
          <mesh castShadow><boxGeometry args={[1.5, 0.8, 1.5]} /><meshStandardMaterial color={c.opened ? "#1a1a1a" : "#ca8a04"} metalness={0.9} roughness={0.1} /></mesh>
          {!c.opened && <pointLight position={[0, 1.5, 0]} color="#fbbf24" intensity={2} />}
        </group>
      ))}
      
      <ambientLight intensity={0.4} />
      <directionalLight position={[20, 30, 10]} intensity={0.6} castShadow />
    </>
  );
};

export default GameScene;
