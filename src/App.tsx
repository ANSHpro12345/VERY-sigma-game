import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

// 3D Break Room Component - Player can walk around with a TV on the wall
function BreakRoom3D({ 
  onBreakEnd, 
  payment, 
  shiftNumber, 
  videoTime, 
  setVideoTime 
}: { 
  onBreakEnd: () => void
  payment: number
  shiftNumber: number
  videoTime: number
  setVideoTime: (t: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const animationIdRef = useRef<number>(0);
  // TV screen position is calculated dynamically in the animation loop
  const tvScreenMeshRef = useRef<THREE.Mesh | null>(null);
  const lockedRef = useRef(false);
  const breakStartTimeRef = useRef<number>(Date.now());
  
  const [timeLeft, setTimeLeft] = useState(120);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const [tvScreenStyle, setTvScreenStyle] = useState<React.CSSProperties>({});
  const [showTV, setShowTV] = useState(false);
  
  const formatTime = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const startSeconds = Math.floor(videoTime);

  useEffect(() => {
    breakStartTimeRef.current = Date.now();
    // Reset keys when entering break room
    keysRef.current = {};
    
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          // Calculate actual time spent in break room and add to video time
          // Video plays at 2x speed, so multiply by 2
          const timeSpentSeconds = (Date.now() - breakStartTimeRef.current) / 1000;
          setVideoTime(videoTime + (timeSpentSeconds * 2));
          document.exitPointerLock();
          onBreakEnd();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onBreakEnd, videoTime, setVideoTime]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1f);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.7, 3);
    camera.rotation.order = 'YXZ';
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    clockRef.current = new THREE.Clock();

    // Room materials
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.85 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 });
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x454550, roughness: 0.9 });

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    scene.add(ceiling);

    // Walls - Back wall (with TV)
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 4), wallMat);
    backWall.position.set(0, 2, -6);
    scene.add(backWall);

    // Front wall
    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 4), wallMat);
    frontWall.position.set(0, 2, 6);
    frontWall.rotation.y = Math.PI;
    scene.add(frontWall);

    // Left wall (with door)
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), wallMat);
    leftWall.position.set(-6, 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    // Right wall (with windows)
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), wallMat);
    rightWall.position.set(6, 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    // WINDOWS on right wall
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x112244, transparent: true, opacity: 0.6 });
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5 });
    
    for (let i = 0; i < 2; i++) {
      // Window glass
      const windowGlass = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.8), windowMat);
      windowGlass.position.set(5.98, 2.2, -2 + i * 4);
      windowGlass.rotation.y = -Math.PI / 2;
      scene.add(windowGlass);

      // Window frame
      const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.1), windowFrameMat);
      frameTop.position.set(5.95, 3.15, -2 + i * 4);
      scene.add(frameTop);
      const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.1), windowFrameMat);
      frameBottom.position.set(5.95, 1.25, -2 + i * 4);
      scene.add(frameBottom);
      const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 0.1), windowFrameMat);
      frameLeft.position.set(5.95, 2.2, -3.05 + i * 4);
      scene.add(frameLeft);
      const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 0.1), windowFrameMat);
      frameRight.position.set(5.95, 2.2, -0.95 + i * 4);
      scene.add(frameRight);
      
      // Window light (moonlight from outside)
      const windowLight = new THREE.PointLight(0x4466aa, 3, 8);
      windowLight.position.set(5, 2.2, -2 + i * 4);
      scene.add(windowLight);
    }

    // Carpet
    const carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 5),
      new THREE.MeshStandardMaterial({ color: 0x442233, roughness: 1 })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.01, 0);
    scene.add(carpet);

    // Ceiling lights
    for (const pos of [[-2, 0], [2, 0]]) {
      const lightFixture = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.1, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xffffee })
      );
      lightFixture.position.set(pos[0], 3.95, pos[1]);
      scene.add(lightFixture);
    }

    // TV Stand/Cabinet
    const tvCabinet = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.6, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.3 })
    );
    tvCabinet.position.set(0, 0.3, -5.5);
    tvCabinet.castShadow = true;
    scene.add(tvCabinet);

    // TV Frame (flat screen mounted on wall)
    const tvFrame = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 2.6, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2, metalness: 0.8 })
    );
    tvFrame.position.set(0, 2.3, -5.9);
    scene.add(tvFrame);

    // TV Screen - we'll track this to position the iframe
    const tvScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(3.9, 2.3),
      new THREE.MeshBasicMaterial({ color: 0x111122 })
    );
    tvScreen.position.set(0, 2.3, -5.83);
    scene.add(tvScreen);
    tvScreenMeshRef.current = tvScreen;

    // TV LED indicator
    const tvLed = new THREE.Mesh(
      new THREE.CircleGeometry(0.03, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    tvLed.position.set(-1.9, 1.05, -5.82);
    scene.add(tvLed);

    // Couch
    const couchMat = new THREE.MeshStandardMaterial({ color: 0x553344, roughness: 0.9 });
    
    const couchBase = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.5, 1.6), couchMat);
    couchBase.position.set(0, 0.35, 1.5);
    couchBase.castShadow = true;
    scene.add(couchBase);

    const couchBack = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.3, 0.35), couchMat);
    couchBack.position.set(0, 1, 2.25);
    scene.add(couchBack);

    const couchSeat = new THREE.Mesh(
      new THREE.BoxGeometry(4.3, 0.2, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x664455, roughness: 0.95 })
    );
    couchSeat.position.set(0, 0.65, 1.45);
    scene.add(couchSeat);

    // Armrests
    for (const x of [-2.1, 2.1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 1.6), couchMat);
      arm.position.set(x, 0.55, 1.5);
      scene.add(arm);
    }

    // Coffee table
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.5 });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.1), tableMat);
    tableTop.position.set(0, 0.45, -0.5);
    scene.add(tableTop);

    for (const [x, z] of [[-0.95, -0.9], [0.95, -0.9], [-0.95, -0.1], [0.95, -0.1]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42), tableMat);
      leg.position.set(x, 0.21, z);
      scene.add(leg);
    }

    // Magazine on table
    const magazine = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.02, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xcc4444 })
    );
    magazine.position.set(0.3, 0.5, -0.5);
    magazine.rotation.y = 0.2;
    scene.add(magazine);

    // Payment display on wall (positioned clearly ON the wall surface)
    const payCanvas = document.createElement('canvas');
    payCanvas.width = 256;
    payCanvas.height = 128;
    const pctx = payCanvas.getContext('2d')!;
    pctx.fillStyle = '#000800';
    pctx.fillRect(0, 0, 256, 128);
    pctx.strokeStyle = '#00ff00';
    pctx.lineWidth = 4;
    pctx.strokeRect(4, 4, 248, 120);
    pctx.fillStyle = '#00ff00';
    pctx.font = 'bold 20px monospace';
    pctx.textAlign = 'center';
    pctx.fillText(`SHIFT ${shiftNumber} PAY`, 128, 45);
    pctx.font = 'bold 36px monospace';
    pctx.fillStyle = '#ffff00';
    pctx.fillText(`$${payment.toLocaleString()}`, 128, 95);
    const payTexture = new THREE.CanvasTexture(payCanvas);
    
    // Payment display frame - clearly mounted ON the wall
    const payFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6 })
    );
    payFrame.position.set(-4, 2.2, -5.7);
    scene.add(payFrame);
    
    const payDisplay = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.85),
      new THREE.MeshBasicMaterial({ map: payTexture })
    );
    payDisplay.position.set(-4, 2.2, -5.63);
    scene.add(payDisplay);

    // Exit door - positioned clearly ON the left wall (wall is at X=-6)
    // Door frame flush against the wall
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 3.2, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x444444 })
    );
    doorFrame.position.set(-5.9, 1.6, 3);
    scene.add(doorFrame);

    // Door itself - mounted on the frame, facing into the room
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 2.8, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6 })
    );
    door.position.set(-5.82, 1.4, 3);
    scene.add(door);

    // Door handle on the room-facing side
    const doorHandle = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xccaa00, metalness: 0.9 })
    );
    doorHandle.position.set(-5.7, 1.3, 3.35);
    scene.add(doorHandle);

    // Exit sign above door - on the wall facing into the room
    const exitCanvas = document.createElement('canvas');
    exitCanvas.width = 128;
    exitCanvas.height = 48;
    const ectx = exitCanvas.getContext('2d')!;
    ectx.fillStyle = '#001100';
    ectx.fillRect(0, 0, 128, 48);
    ectx.fillStyle = '#00ff00';
    ectx.font = 'bold 24px monospace';
    ectx.textAlign = 'center';
    ectx.fillText('EXIT', 64, 33);
    const exitTexture = new THREE.CanvasTexture(exitCanvas);
    const exitSign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.3),
      new THREE.MeshBasicMaterial({ map: exitTexture })
    );
    exitSign.position.set(-5.75, 3.1, 3);
    exitSign.rotation.y = Math.PI / 2;
    scene.add(exitSign);
    
    // Add a glow to the exit sign
    const exitGlow = new THREE.PointLight(0x00ff00, 2, 3);
    exitGlow.position.set(-5.5, 3.1, 3);
    scene.add(exitGlow);

    // Skip break instruction sign - next to the door, facing into room
    const skipCanvas = document.createElement('canvas');
    skipCanvas.width = 200;
    skipCanvas.height = 100;
    const sctx = skipCanvas.getContext('2d')!;
    sctx.fillStyle = '#100800';
    sctx.fillRect(0, 0, 200, 100);
    sctx.strokeStyle = '#ff6600';
    sctx.lineWidth = 3;
    sctx.strokeRect(3, 3, 194, 94);
    sctx.fillStyle = '#ff6600';
    sctx.font = 'bold 16px monospace';
    sctx.textAlign = 'center';
    sctx.fillText('SKIP BREAK', 100, 35);
    sctx.font = '14px monospace';
    sctx.fillText('Press [SPACE]', 100, 60);
    sctx.fillText('near door', 100, 80);
    const skipTexture = new THREE.CanvasTexture(skipCanvas);
    const skipSign = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 0.5),
      new THREE.MeshBasicMaterial({ map: skipTexture })
    );
    skipSign.position.set(-5.75, 1.8, 4.2);
    skipSign.rotation.y = Math.PI / 2;
    scene.add(skipSign);

    // Wall poster
    const posterCanvas = document.createElement('canvas');
    posterCanvas.width = 128;
    posterCanvas.height = 180;
    const postctx = posterCanvas.getContext('2d')!;
    postctx.fillStyle = '#1a1a1a';
    postctx.fillRect(0, 0, 128, 180);
    postctx.fillStyle = '#00ff00';
    postctx.font = 'bold 14px monospace';
    postctx.textAlign = 'center';
    postctx.fillText('STAY CALM', 64, 45);
    postctx.fillText('TRUST', 64, 70);
    postctx.fillText('THE VOID', 64, 95);
    postctx.strokeStyle = '#00ff00';
    postctx.lineWidth = 2;
    postctx.strokeRect(10, 10, 108, 160);
    postctx.font = '10px monospace';
    postctx.fillStyle = '#555';
    postctx.fillText('Bunker S7', 64, 145);
    postctx.fillText('Morale Div.', 64, 160);
    const posterTexture = new THREE.CanvasTexture(posterCanvas);
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 1),
      new THREE.MeshBasicMaterial({ map: posterTexture })
    );
    poster.position.set(-5.85, 2.2, -2);
    poster.rotation.y = Math.PI / 2;
    scene.add(poster);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);

    const mainLight1 = new THREE.PointLight(0xffffee, 25, 12);
    mainLight1.position.set(-2, 3.5, 0);
    mainLight1.castShadow = true;
    scene.add(mainLight1);

    const mainLight2 = new THREE.PointLight(0xffffee, 25, 12);
    mainLight2.position.set(2, 3.5, 0);
    mainLight2.castShadow = true;
    scene.add(mainLight2);

    // TV glow
    const tvGlow = new THREE.PointLight(0x6688ff, 8, 6);
    tvGlow.position.set(0, 2.3, -4.5);
    scene.add(tvGlow);

    // Show TV after a short delay
    setTimeout(() => setShowTV(true), 500);

    // Animate
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      clockRef.current?.getDelta();

      if (lockedRef.current && cameraRef.current) {
        const cam = cameraRef.current;
        const speed = 0.05;
        const dir = new THREE.Vector3();

        if (keysRef.current['KeyW']) dir.z -= 1;
        if (keysRef.current['KeyS']) dir.z += 1;
        if (keysRef.current['KeyA']) dir.x -= 1;
        if (keysRef.current['KeyD']) dir.x += 1;

        if (dir.length() > 0) {
          dir.normalize().applyQuaternion(cam.quaternion);
          dir.y = 0;
          dir.normalize();
          cam.position.addScaledVector(dir, speed);
        }

        // Bounds
        cam.position.x = Math.max(-5.2, Math.min(5.2, cam.position.x));
        cam.position.z = Math.max(-5, Math.min(5, cam.position.z));
        cam.position.y = 1.7;
        cam.rotation.z = 0;

        // Near exit door?
        if (cam.position.x < -4 && cam.position.z > 2 && cam.position.z < 4.5) {
          setShowSkipButton(true);
        } else {
          setShowSkipButton(false);
        }

        // TV glow flicker
        tvGlow.intensity = 8 + Math.sin(Date.now() * 0.008) * 1.5;
      }

      // Update TV screen position for iframe overlay
      if (cameraRef.current && tvScreenMeshRef.current && rendererRef.current) {
        const cam = cameraRef.current;
        const tvMesh = tvScreenMeshRef.current;
        
        // Get the corners of the TV screen in world space
        const corners = [
          new THREE.Vector3(-1.95, 3.45, -5.83), // top-left
          new THREE.Vector3(1.95, 3.45, -5.83),  // top-right
          new THREE.Vector3(-1.95, 1.15, -5.83), // bottom-left
          new THREE.Vector3(1.95, 1.15, -5.83),  // bottom-right
        ];

        // Project to screen coordinates
        const screenCorners = corners.map(corner => {
          const projected = corner.clone().project(cam);
          return {
            x: (projected.x * 0.5 + 0.5) * window.innerWidth,
            y: (-projected.y * 0.5 + 0.5) * window.innerHeight
          };
        });

        // Check if TV is in front of camera
        const tvDir = tvMesh.position.clone().sub(cam.position);
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
        const dotProduct = tvDir.dot(camForward);

        if (dotProduct > 0) {
          // TV is in front of camera
          const left = Math.min(screenCorners[0].x, screenCorners[2].x);
          const right = Math.max(screenCorners[1].x, screenCorners[3].x);
          const top = Math.min(screenCorners[0].y, screenCorners[1].y);
          const bottom = Math.max(screenCorners[2].y, screenCorners[3].y);

          // Clamp to screen bounds with some margin
          const margin = 50;
          const clampedLeft = Math.max(margin, left);
          const clampedTop = Math.max(margin, top);
          const clampedWidth = Math.min(window.innerWidth - margin, right) - clampedLeft;
          const clampedHeight = Math.min(window.innerHeight - margin, bottom) - clampedTop;

          if (clampedWidth > 100 && clampedHeight > 60) {
            setTvScreenStyle({
              display: 'block',
              left: `${clampedLeft}px`,
              top: `${clampedTop}px`,
              width: `${clampedWidth}px`,
              height: `${clampedHeight}px`,
            });
          } else {
            setTvScreenStyle({ display: 'none' });
          }
        } else {
          setTvScreenStyle({ display: 'none' });
        }
      }

      rendererRef.current?.render(sceneRef.current!, cameraRef.current!);
    };
    animate();

    // Events
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'Space' && cameraRef.current) {
        const cam = cameraRef.current;
        if (cam.position.x < -4 && cam.position.z > 2 && cam.position.z < 4.5) {
          // Save video progress before exiting (video plays at 2x speed)
          const timeSpentSeconds = (Date.now() - breakStartTimeRef.current) / 1000;
          setVideoTime(videoTime + (timeSpentSeconds * 2));
          document.exitPointerLock();
          onBreakEnd();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!lockedRef.current || !cameraRef.current) return;
      const cam = cameraRef.current;
      cam.rotation.y -= e.movementX * 0.002;
      cam.rotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, cam.rotation.x - e.movementY * 0.002));
    };

    const handlePointerLockChange = () => {
      lockedRef.current = document.pointerLockElement !== null;
    };

    const handleClick = () => {
      if (!lockedRef.current) {
        document.body.requestPointerLock();
      }
    };

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    window.addEventListener('resize', handleResize);

    setTimeout(() => document.body.requestPointerLock(), 500);

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      document.exitPointerLock();
    };
  }, [payment, shiftNumber, onBreakEnd, videoTime, setVideoTime]);

  return (
    <div className="fixed inset-0 z-[2000] bg-black">
      {/* 3D Scene Container */}
      <div ref={containerRef} className="absolute inset-0 cursor-none" />

      {/* TV Video - positioned dynamically to match 3D TV screen */}
      {showTV && (
        <div 
          className="absolute pointer-events-none overflow-hidden"
          style={{
            ...tvScreenStyle,
            transition: 'none',
          }}
        >
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/1ZM6ztUlLWY?autoplay=1&start=${startSeconds}&controls=0&showinfo=0&rel=0&modestbranding=1`}
            title="Break Room TV"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            style={{ pointerEvents: 'none' }}
          />
        </div>
      )}

      {/* HUD */}
      <div className="absolute inset-0 pointer-events-none z-[100]">
        {/* Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-white/60 rounded-full" />
        </div>

        {/* Timer */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/85 border-2 border-green-400 px-8 py-4 text-green-400 font-mono rounded">
          <div className="text-xs opacity-70 text-center mb-1 tracking-wider">BREAK TIME REMAINING</div>
          <div className="text-3xl font-bold text-center tracking-widest">{formatTime(timeLeft)}</div>
        </div>

        {/* Payment HUD */}
        <div className="absolute top-6 right-6 bg-black/85 border-2 border-yellow-400 px-5 py-3 text-yellow-400 font-mono rounded">
          <div className="text-xs opacity-70 tracking-wider">SHIFT {shiftNumber} EARNINGS</div>
          <div className="text-2xl font-bold">${payment.toLocaleString()}</div>
        </div>

        {/* Controls hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 border border-gray-600 px-6 py-3 text-gray-400 font-mono text-sm text-center rounded">
          <p>WASD - Move | Mouse - Look | Click to lock cursor</p>
          <p className="text-xs opacity-60 mt-1">Walk to the EXIT door and press SPACE to skip break</p>
        </div>

        {/* Skip button indicator */}
        {showSkipButton && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-500 text-black px-8 py-4 font-mono font-bold text-xl animate-pulse rounded shadow-lg">
            PRESS [SPACE] TO SKIP BREAK
          </div>
        )}
      </div>
    </div>
  );
}

// Game Configuration
const CONFIG = {
  SENSITIVITY: 0.002,
  WALK_SPEED: 0.06,
  RUN_SPEED: 0.1,
  NPC_Z: -5,
  SCARE_COOLDOWN: 2500,
  JUMPSCARE_IMAGE: 'https://play-lh.googleusercontent.com/qBiLTYKuDA9aecK01rKoBYMp19lLOSq3xJvLkjTxlLCOJ_blR9ZPvBUblRaKFbDQ8P29=w600-h300-pc0xffffff-pd',
  ENTITY_JUMPSCARE_IMAGE: 'https://preview.redd.it/which-fnaf-game-has-the-best-jumpscares-v0-u2gs29q0jc9c1.jpeg?auto=webp&s=620045480378a48c49056d4ceb1becd63cf2e6f6',
  HALLWAY_LENGTH: 60,
  ENTITY_SPEED: 0.045,
  PLAYER_ESCAPE_SPEED: 0.08,
  GUN_STUN_DURATION: 1500,
  GUN_COOLDOWN: 800,
  ESCAPE_TIME_LIMIT: 35,
  AUTO_APPROVE_TIME: 25,
  REST_STRESS_REDUCTION: 30,
  SHIFTS: [
    { quota: 3, stressRate: 1.5, anomalyChance: 0.55, criminalChance: 0.15, basePay: 100, name: "ORIENTATION" },
    { quota: 5, stressRate: 2.0, anomalyChance: 0.65, criminalChance: 0.2, basePay: 150, name: "CONTAINMENT_BREACH" },
    { quota: 6, stressRate: 2.8, anomalyChance: 0.70, criminalChance: 0.2, basePay: 200, name: "VOID_EMERGENCE" },
    { quota: 8, stressRate: 3.5, anomalyChance: 0.80, criminalChance: 0.25, basePay: 300, name: "CRITICAL_MASS" },
    { quota: 10, stressRate: 4.5, anomalyChance: 0.90, criminalChance: 0.3, basePay: 500, name: "FINAL_PROTOCOL" }
  ],
  LORE: [
    { day: "001", text: "First batch of subjects arrived at Bunker S7. All biometric readings within normal parameters." },
    { day: "015", text: "Subject #47 displayed 6 limbs during deep scan. Terminated per protocol." },
    { day: "031", text: "17 operators reported 'shadow figures' in peripheral vision." },
    { day: "047", text: "Dr. Vasquez missing. Last entry: 'They don't come FROM the void. They ARE the void.'" },
    { day: "062", text: "All surface contact lost. I'm the last operator in S7." },
    { day: "078", text: "Sleep is impossible. Every time I close my eyes, I see their faces." },
    { day: "089", text: "The neural gateway is breathing. I can hear it pulse through the walls." },
    { day: "095", text: "I processed my own reflection today. It had too many eyes." },
    { day: "???", text: "If you're reading this, you've already been chosen." }
  ],
  PERSONALITIES: [
    { type: 'nervous', greetings: ["P-please... I just want to pass...", "I'm not one of them, I swear!"], fidget: true },
    { type: 'aggressive', greetings: ["Hurry it up, I don't have all day!", "What are you looking at?!"], fidget: false },
    { type: 'calm', greetings: ["Good evening, officer.", "I understand the procedure."], fidget: false },
    { type: 'suspicious', greetings: ["...", "*stares silently*"], fidget: true },
    { type: 'friendly', greetings: ["Hello! Nice bunker you have here!", "How's your shift going?"], fidget: false },
    { type: 'criminal', greetings: ["Look, about my record...", "I can explain everything..."], fidget: true }
  ]
};

const FIRST_NAMES = ['John', 'Sarah', 'Marcus', 'Elena', 'David', 'Lisa', 'Alex', 'Maria', 'James', 'Anna', 'Unknown'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'DOE'];

interface NPCData {
  id: string;
  name: string;
  isAnomaly: boolean;
  isCriminal: boolean;
  personality: typeof CONFIG.PERSONALITIES[0];
  actualLimbs: number;
  reportedLimbs: number;
  actualEyes: number;
  reportedEyes: number;
  actualFingers: number;
  reportedFingers: number;
  group: THREE.Group;
  breatheTime: number;
  twitchTime: number;
  walkingIn: boolean;
  walkingOut: boolean;
  autoApproveTimer: number;
}

interface Entity {
  mesh: THREE.Group;
  stunned: boolean;
  stunnedUntil: number;
  speed: number;
  active: boolean;
  spawnTime: number;
}

// Sound effects
const playSound = (ctx: AudioContext, type: string) => {
  if (!ctx) return;
  
  const now = ctx.currentTime;
  
  switch(type) {
    case 'approve': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now + 0.1);
      osc.frequency.setValueAtTime(784, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
      break;
    }
    case 'detain': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
      // Cage clang
      setTimeout(() => {
        const clang = ctx.createOscillator();
        const clangGain = ctx.createGain();
        clang.type = 'square';
        clang.frequency.setValueAtTime(150, ctx.currentTime);
        clangGain.gain.setValueAtTime(0.2, ctx.currentTime);
        clangGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        clang.connect(clangGain).connect(ctx.destination);
        clang.start();
        clang.stop(ctx.currentTime + 0.2);
      }, 400);
      break;
    }
    case 'terminate': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
      // Crackle
      const noise = ctx.createOscillator();
      const noiseGain = ctx.createGain();
      noise.type = 'square';
      noise.frequency.setValueAtTime(1500, now);
      noiseGain.gain.setValueAtTime(0.1, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      noise.connect(noiseGain).connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.3);
      break;
    }
    case 'jumpscare': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
      osc.frequency.setValueAtTime(180, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
    }
    case 'entityCatch': {
      // Deep roar
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(50, now);
      osc1.frequency.exponentialRampToValueAtTime(250, now + 0.1);
      osc1.frequency.exponentialRampToValueAtTime(60, now + 0.4);
      gain1.gain.setValueAtTime(0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      osc1.connect(gain1).connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.8);
      // Screech layer
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(800, now);
      osc2.frequency.exponentialRampToValueAtTime(200, now + 0.3);
      gain2.gain.setValueAtTime(0.2, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.4);
      break;
    }
    case 'gunFire': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1000, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
      // Electric crackle
      const crackle = ctx.createOscillator();
      const crackleGain = ctx.createGain();
      crackle.type = 'sawtooth';
      crackle.frequency.setValueAtTime(2500, now + 0.05);
      crackle.frequency.setValueAtTime(1200, now + 0.1);
      crackleGain.gain.setValueAtTime(0.08, now + 0.05);
      crackleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      crackle.connect(crackleGain).connect(ctx.destination);
      crackle.start(now + 0.05);
      crackle.stop(now + 0.2);
      break;
    }
    case 'doorClose': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
    }
    case 'footstep': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    }
    case 'rest': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.setValueAtTime(300, now + 0.2);
      osc.frequency.setValueAtTime(250, now + 0.4);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
      break;
    }
    case 'error': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.setValueAtTime(150, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
      break;
    }
    case 'hallucination': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(40, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.5);
      osc.frequency.linearRampToValueAtTime(30, now + 1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.2);
      break;
    }
  }
};

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  const bunkerRef = useRef<THREE.Group | null>(null);
  const hallwayRef = useRef<THREE.Group | null>(null);
  const consoleGroupRef = useRef<THREE.Group | null>(null);
  const currentNPCRef = useRef<NPCData | null>(null);
  const roomLightRef = useRef<THREE.PointLight | null>(null);
  const flickerLightRef = useRef<THREE.PointLight | null>(null);
  const spotlightRef = useRef<THREE.SpotLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const animationIdRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const entitiesRef = useRef<Entity[]>([]);
  const escapeDoorRef = useRef<THREE.Mesh | null>(null);
  const escapeSwitchRef = useRef<THREE.Mesh | null>(null);
  const gunRef = useRef<THREE.Group | null>(null);
  const buttonsRef = useRef<THREE.Mesh[]>([]);
  const couchRef = useRef<THREE.Mesh | null>(null);
  const cageRef = useRef<THREE.Mesh | null>(null);
  const approveGateRef = useRef<THREE.Mesh | null>(null);
  const hallwayDoorRef = useRef<THREE.Mesh | null>(null);
  const stressAccumulator = useRef(0);
  const lastEntitySpawnRef = useRef(0);
  const entitySpawnIndexRef = useRef(0);
  
  const [gameState, setGameState] = useState({
    active: false,
    locked: false,
    health: 100,
    stress: 0,
    quota: 0,
    shiftIndex: 0,
    processing: false,
    lastScare: 0,
    anomalyCount: 0,
    correctDecisions: 0,
    wrongDecisions: 0,
    gameTime: 0,
    currentLoreIndex: 0,
    escapeMode: false,
    hasGun: false,
    gunCooldown: 0,
    nightVision: false,
    doorClosed: false,
    compromiseLevel: 0,
    escapeTimer: CONFIG.ESCAPE_TIME_LIMIT,
    entitiesActive: false,
    money: 0,
    shiftMoney: 0,
    isResting: false,
    npcWalkingIn: false,
    hallucinating: false
  });
  
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  
  const [screen, setScreen] = useState<'loading' | 'menu' | 'game' | 'transition' | 'gameover' | 'break' | 'howtoplay' | 'credits'>('loading');
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStatus, setLoadStatus] = useState('INITIALIZING...');
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [hoverAction, setHoverAction] = useState<string | null>(null);
  const [showJumpscare, setShowJumpscare] = useState(false);
  const [jumpscareType, setJumpscareType] = useState<'normal' | 'entity'>('normal');
  const [terminalText, setTerminalText] = useState('AWAITING SUBJECT...');
  const [currentSubject, setCurrentSubject] = useState('[AWAITING_SUBJECT]');
  const [transitionData, setTransitionData] = useState({ title: '', message: '', stats: '', isWin: false });
  const [showGunFlash, setShowGunFlash] = useState(false);
  const [npcDialogue, setNpcDialogue] = useState<string | null>(null);
  const [videoTime, setVideoTime] = useState(0);
  const [hallucinationEffect, setHallucinationEffect] = useState<string | null>(null);

  // Loading
  useEffect(() => {
    const steps = [
      { p: 15, t: "ESTABLISHING_NEURAL_LINK..." },
      { p: 35, t: "LOADING_BUNKER_SCHEMATICS..." },
      { p: 55, t: "CALIBRATING_BIOMETRICS..." },
      { p: 75, t: "INITIALIZING_CONTAINMENT..." },
      { p: 90, t: "BREACHING_REALITY..." },
      { p: 100, t: "SYSTEM_READY" }
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setLoadProgress(steps[i].p);
        setLoadStatus(steps[i].t);
        i++;
      } else {
        clearInterval(interval);
        setScreen('menu');
      }
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const createWorld = useCallback(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    const bunker = new THREE.Group();
    bunkerRef.current = bunker;

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.4, metalness: 0.8 });

    // Room
    const room = new THREE.Mesh(new THREE.BoxGeometry(30, 8, 40), concreteMat);
    room.position.set(0, 4, -5);
    room.material.side = THREE.BackSide;
    bunker.add(room);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 40),
      new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -5;
    bunker.add(floor);

    // Ceiling lights
    for (let x = -8; x <= 8; x += 8) {
      for (let z = -18; z <= 8; z += 8) {
        const lightPanel = new THREE.Mesh(
          new THREE.PlaneGeometry(2, 4),
          new THREE.MeshBasicMaterial({ color: 0xffffee })
        );
        lightPanel.rotation.x = Math.PI / 2;
        lightPanel.position.set(x, 7.9, z);
        bunker.add(lightPanel);
      }
    }

    // Partition with OPEN window
    const partLeft = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 0.5), concreteMat);
    partLeft.position.set(-6, 2.5, -2);
    bunker.add(partLeft);

    const partRight = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 0.5), concreteMat);
    partRight.position.set(6, 2.5, -2);
    bunker.add(partRight);

    const partTop = new THREE.Mesh(new THREE.BoxGeometry(12, 1.5, 0.5), concreteMat);
    partTop.position.set(0, 5.25, -2);
    bunker.add(partTop);

    const partBottom = new THREE.Mesh(new THREE.BoxGeometry(12, 0.8, 0.5), concreteMat);
    partBottom.position.set(0, 0.4, -2);
    bunker.add(partBottom);

    // Window frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9 });
    const frameT = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.15, 0.6), frameMat);
    frameT.position.set(0, 4.5, -2);
    bunker.add(frameT);
    const frameB = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.15, 0.6), frameMat);
    frameB.position.set(0, 0.8, -2);
    bunker.add(frameB);
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.85, 0.6), frameMat);
    frameL.position.set(-4.17, 2.65, -2);
    bunker.add(frameL);
    const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.85, 0.6), frameMat);
    frameR.position.set(4.17, 2.65, -2);
    bunker.add(frameR);

    // Spotlight circle
    const spotCircle = new THREE.Mesh(
      new THREE.CircleGeometry(2, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0.3 })
    );
    spotCircle.rotation.x = -Math.PI / 2;
    spotCircle.position.set(0, 0.02, CONFIG.NPC_Z);
    bunker.add(spotCircle);

    // Cage for DETAIN
    const cage = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 4, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x888888, wireframe: true })
    );
    cage.position.set(0, 12, CONFIG.NPC_Z);
    bunker.add(cage);
    cageRef.current = cage;

    // Gate for APPROVE
    const gate = new THREE.Mesh(
      new THREE.BoxGeometry(5, 5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x006600, metalness: 0.8 })
    );
    gate.position.set(0, 2.5, -14);
    bunker.add(gate);
    approveGateRef.current = gate;

    // COUCH for resting
    const couch = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.8, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x442222, roughness: 0.9 })
    );
    couch.position.set(-10, 0.4, 5);
    couch.userData = { action: 'REST', label: 'REST [F] - Reduce Stress' };
    bunker.add(couch);
    couchRef.current = couch;

    // Couch back
    const couchBack = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.2, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x442222, roughness: 0.9 })
    );
    couchBack.position.set(-10, 1, 5.5);
    bunker.add(couchBack);

    // Couch sign
    const couchCanvas = document.createElement('canvas');
    couchCanvas.width = 128;
    couchCanvas.height = 64;
    const cctx = couchCanvas.getContext('2d')!;
    cctx.fillStyle = '#000';
    cctx.fillRect(0, 0, 128, 64);
    cctx.fillStyle = '#00ff00';
    cctx.font = 'bold 14px monospace';
    cctx.textAlign = 'center';
    cctx.fillText('REST AREA', 64, 25);
    cctx.fillText('[F] to rest', 64, 45);
    const couchTexture = new THREE.CanvasTexture(couchCanvas);
    const couchSign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.75),
      new THREE.MeshBasicMaterial({ map: couchTexture })
    );
    couchSign.position.set(-10, 2.5, 5.6);
    bunker.add(couchSign);

    // HALLWAY DOOR (always present, initially closed)
    const hallwayDoor = new THREE.Mesh(
      new THREE.BoxGeometry(4, 5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x880000, metalness: 0.6 })
    );
    hallwayDoor.position.set(10, 2.5, -20);
    bunker.add(hallwayDoor);
    hallwayDoorRef.current = hallwayDoor;

    // Emergency exit sign
    const exitCanvas = document.createElement('canvas');
    exitCanvas.width = 128;
    exitCanvas.height = 64;
    const ectx = exitCanvas.getContext('2d')!;
    ectx.fillStyle = '#000';
    ectx.fillRect(0, 0, 128, 64);
    ectx.fillStyle = '#ff0000';
    ectx.font = 'bold 20px monospace';
    ectx.textAlign = 'center';
    ectx.fillText('EMERGENCY', 64, 25);
    ectx.fillText('EXIT', 64, 50);
    const exitTexture = new THREE.CanvasTexture(exitCanvas);
    const exitSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 1),
      new THREE.MeshBasicMaterial({ map: exitTexture })
    );
    exitSign.position.set(10, 5.5, -20);
    bunker.add(exitSign);

    // Grid
    const grid = new THREE.GridHelper(40, 60, 0x00ff41, 0x003300);
    grid.position.set(0, 0.02, -5);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    bunker.add(grid);

    // Pipes
    for (let i = 0; i < 5; i++) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 40), metalMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(-14.5 + i * 0.2, 6.5, -5);
      bunker.add(pipe);
    }

    scene.add(bunker);

    // LIGHTING
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    ambientLightRef.current = ambient;

    const mainLight = new THREE.PointLight(0xffffff, 35, 40);
    mainLight.position.set(0, 6, 2);
    mainLight.castShadow = true;
    scene.add(mainLight);
    roomLightRef.current = mainLight;

    // Spotlight on NPC - BRIGHT
    const spotLight = new THREE.SpotLight(0xffffff, 120, 25, Math.PI / 5, 0.3);
    spotLight.position.set(0, 7, CONFIG.NPC_Z);
    spotLight.target.position.set(0, 1, CONFIG.NPC_Z);
    scene.add(spotLight);
    scene.add(spotLight.target);
    spotlightRef.current = spotLight;

    // Front light on NPC
    const frontLight = new THREE.PointLight(0xffffff, 25, 15);
    frontLight.position.set(0, 3, CONFIG.NPC_Z + 3);
    scene.add(frontLight);

    // Flicker light
    const flickerLight = new THREE.PointLight(0xff0000, 0, 25);
    flickerLight.position.set(5, 5, -10);
    scene.add(flickerLight);
    flickerLightRef.current = flickerLight;
  }, []);

  const createHallway = useCallback(() => {
    if (!sceneRef.current) return;
    
    const hallway = new THREE.Group();
    hallwayRef.current = hallway;
    hallway.visible = false;

    const hallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
    const len = CONFIG.HALLWAY_LENGTH;
    const hallwayStartZ = -22; // Where hallway starts (after bunker)

    // Floor - starts right after the bunker entrance
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(8, len + 10), 
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(10, 0.01, hallwayStartZ - len/2);
    hallway.add(floor);

    // Left Wall
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(len + 10, 5), hallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(6, 2.5, hallwayStartZ - len/2);
    hallway.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(len + 10, 5), hallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(14, 2.5, hallwayStartZ - len/2);
    hallway.add(rightWall);

    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(8, len + 10), hallMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(10, 5, hallwayStartZ - len/2);
    hallway.add(ceiling);

    // Emergency lights along the hallway - more of them and brighter
    for (let z = hallwayStartZ; z > hallwayStartZ - len; z -= 8) {
      // Left side light
      const lightBoxL = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      lightBoxL.position.set(6.5, 4, z);
      hallway.add(lightBoxL);

      // Right side light
      const lightBoxR = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      lightBoxR.position.set(13.5, 4, z);
      hallway.add(lightBoxR);

      // Actual point light
      const pLight = new THREE.PointLight(0xff3333, 8, 15);
      pLight.position.set(10, 4, z);
      hallway.add(pLight);
    }

    // ============ EXIT DOOR AT END OF HALLWAY ============
    const exitZ = hallwayStartZ - len;
    
    // Door frame
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(6, 5.5, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 })
    );
    doorFrame.position.set(10, 2.75, exitZ + 1);
    hallway.add(doorFrame);

    // Door OPENING - visible green area showing where to go
    const doorOpening = new THREE.Mesh(
      new THREE.BoxGeometry(4, 4.5, 0.8),
      new THREE.MeshBasicMaterial({ color: 0x004400 })
    );
    doorOpening.position.set(10, 2.25, exitZ + 1);
    hallway.add(doorOpening);

    // Big bright "ESCAPE" arrow sign
    const escapeSignCanvas = document.createElement('canvas');
    escapeSignCanvas.width = 256;
    escapeSignCanvas.height = 64;
    const esctx = escapeSignCanvas.getContext('2d')!;
    esctx.fillStyle = '#001100';
    esctx.fillRect(0, 0, 256, 64);
    esctx.fillStyle = '#00ff00';
    esctx.font = 'bold 36px monospace';
    esctx.textAlign = 'center';
    esctx.fillText('>>> EXIT >>>', 128, 45);
    const escapeTexture = new THREE.CanvasTexture(escapeSignCanvas);
    const escapeSign = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 1),
      new THREE.MeshBasicMaterial({ map: escapeTexture })
    );
    escapeSign.position.set(10, 5.5, exitZ + 2);
    hallway.add(escapeSign);

    // The actual sliding door - starts WIDE OPEN (far to the side)
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(4, 4.5, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x006600, metalness: 0.6, emissive: 0x003300, emissiveIntensity: 0.5 })
    );
    door.position.set(18, 2.25, exitZ + 0.8); // X=18 means door is slid VERY FAR to the right = WIDE OPEN
    hallway.add(door);
    escapeDoorRef.current = door;
    
    // Add bright "DOOR OPEN" indicator arrow pointing through the doorway
    const arrowCanvas = document.createElement('canvas');
    arrowCanvas.width = 128;
    arrowCanvas.height = 64;
    const arrowCtx = arrowCanvas.getContext('2d')!;
    arrowCtx.fillStyle = '#00ff00';
    arrowCtx.font = 'bold 40px monospace';
    arrowCtx.textAlign = 'center';
    arrowCtx.fillText('↓↓↓', 64, 45);
    const arrowTexture = new THREE.CanvasTexture(arrowCanvas);
    const arrowSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 1),
      new THREE.MeshBasicMaterial({ map: arrowTexture, transparent: true })
    );
    arrowSign.position.set(10, 4.5, exitZ + 3);
    hallway.add(arrowSign);

    // ============ SAFE ROOM BEHIND EXIT DOOR ============
    const safeRoom = new THREE.Mesh(
      new THREE.BoxGeometry(10, 5, 10),
      new THREE.MeshStandardMaterial({ color: 0x1a2a1a, side: THREE.BackSide })
    );
    safeRoom.position.set(10, 2.5, exitZ - 4);
    hallway.add(safeRoom);

    // Safe room floor
    const safeFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshStandardMaterial({ color: 0x224422 })
    );
    safeFloor.rotation.x = -Math.PI / 2;
    safeFloor.position.set(10, 0.02, exitZ - 4);
    hallway.add(safeFloor);

    // Bright green safe light
    const safeLight = new THREE.PointLight(0x00ff00, 20, 20);
    safeLight.position.set(10, 4, exitZ - 4);
    hallway.add(safeLight);

    // "SAFE ZONE" sign inside safe room
    const safeSignCanvas = document.createElement('canvas');
    safeSignCanvas.width = 256;
    safeSignCanvas.height = 128;
    const safectx = safeSignCanvas.getContext('2d')!;
    safectx.fillStyle = '#001100';
    safectx.fillRect(0, 0, 256, 128);
    safectx.fillStyle = '#00ff00';
    safectx.font = 'bold 28px monospace';
    safectx.textAlign = 'center';
    safectx.fillText('SAFE ZONE', 128, 50);
    safectx.font = '18px monospace';
    safectx.fillText('Close the door!', 128, 85);
    const safeSignTexture = new THREE.CanvasTexture(safeSignCanvas);
    const safeSign = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 1.5),
      new THREE.MeshBasicMaterial({ map: safeSignTexture })
    );
    safeSign.position.set(10, 3, exitZ - 8.9);
    hallway.add(safeSign);

    // ============ DOOR CLOSE SWITCH ============
    // Big obvious switch inside the safe room
    const switchBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00aa00, emissiveIntensity: 0.8 })
    );
    switchBox.position.set(13, 1.5, exitZ - 2);
    switchBox.userData = { action: 'CLOSE_DOOR' };
    hallway.add(switchBox);
    escapeSwitchRef.current = switchBox;

    // Switch sign
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 128;
    signCanvas.height = 80;
    const ctx = signCanvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 128, 80);
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 122, 74);
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CLOSE DOOR', 64, 30);
    ctx.font = 'bold 24px monospace';
    ctx.fillText('[E]', 64, 60);
    const signTexture = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.8),
      new THREE.MeshBasicMaterial({ map: signTexture })
    );
    signMesh.position.set(13, 2.8, exitZ - 1.8);
    signMesh.rotation.y = -0.3;
    hallway.add(signMesh);

    // Add switch glow
    const switchGlow = new THREE.PointLight(0x00ff00, 5, 5);
    switchGlow.position.set(13, 1.5, exitZ - 2);
    hallway.add(switchGlow);

    sceneRef.current.add(hallway);
  }, []);

  const createGun = useCallback(() => {
    if (!sceneRef.current) return;

    const gun = new THREE.Group();
    gunRef.current = gun;
    gun.visible = false;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.15, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 })
    );
    gun.add(body);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.03, 0.3, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.95 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.3);
    gun.add(barrel);

    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.18, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x331111 })
    );
    handle.position.set(0, -0.12, 0.1);
    handle.rotation.x = 0.3;
    gun.add(handle);

    const coil = new THREE.Mesh(
      new THREE.TorusGeometry(0.04, 0.01, 8, 16),
      new THREE.MeshBasicMaterial({ color: 0x00aaff })
    );
    coil.rotation.y = Math.PI / 2;
    coil.position.set(0, 0.02, -0.15);
    gun.add(coil);

    gun.position.set(0.35, -0.25, -0.5);
    sceneRef.current.add(gun);
  }, []);

  const spawnEntity = useCallback((index: number) => {
    if (!sceneRef.current || !cameraRef.current) return;

    const entity = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x440000, emissiveIntensity: 0.8 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.8, 8), bodyMat);
    body.position.y = 1.2;
    entity.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), bodyMat);
    head.position.y = 2.3;
    entity.add(head);

    // Glowing red eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMat);
    leftEye.position.set(-0.12, 2.35, 0.28);
    entity.add(leftEye);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMat);
    rightEye.position.set(0.12, 2.35, 0.28);
    entity.add(rightEye);

    // Long creepy arms
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 1.8, 6), bodyMat);
      arm.position.set(side * 0.55, 1.0, 0.3);
      arm.rotation.z = side * 0.5;
      arm.rotation.x = -0.4;
      entity.add(arm);
    }

    // Add bright entity light for visibility in dark hallway
    const entityLight = new THREE.PointLight(0xff0000, 8, 12);
    entityLight.position.set(0, 2, 0);
    entity.add(entityLight);

    // Player runs towards NEGATIVE Z, so spawn entities at HIGHER Z (behind them)
    // The hallway entrance is around Z=-22, exit is at Z=-22-HALLWAY_LENGTH
    // Player starts at around Z=-27, so spawn entities at the hallway entrance area
    const cam = cameraRef.current;
    const hallwayStartZ = -22; // Entrance of hallway
    
    // Spawn at the START of hallway (behind the player who is running towards exit)
    // Each subsequent entity spawns slightly further back
    const spawnZ = hallwayStartZ + 2 + (index * 3); // Spawn near/at hallway entrance
    
    entity.position.set(
      10 + (Math.random() - 0.5) * 2, // X position in hallway center
      0,
      spawnZ
    );

    // Add to main scene for proper world coordinates
    sceneRef.current.add(entity);

    entitiesRef.current.push({
      mesh: entity,
      stunned: false,
      stunnedUntil: 0,
      speed: CONFIG.ENTITY_SPEED + Math.random() * 0.02 + (index * 0.005), // Each entity slightly faster
      active: true,
      spawnTime: Date.now() + 200 // Quick activation after spawn
    });
    
    console.log(`Entity ${index} spawned at Z=${entity.position.z.toFixed(1)}, player at Z=${cam.position.z.toFixed(1)}`);
    
    // Alert player
    setSubtitle(`⚠ ENTITY ${index + 1} HUNTING! ⚠`);
    setTimeout(() => setSubtitle(null), 1500);
  }, []);

  const createTerminal = useCallback(() => {
    if (!sceneRef.current) return;

    const console = new THREE.Group();
    consoleGroupRef.current = console;
    buttonsRef.current = [];

    const deskMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.6, metalness: 0.4 });

    const desk = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 2.5), deskMat);
    desk.position.set(0, 0.6, 2);
    console.add(desk);

    const monitor = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.8, 0.2), deskMat);
    monitor.position.set(0, 2.1, 1.2);
    console.add(monitor);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.5),
      new THREE.MeshBasicMaterial({ color: 0x003300 })
    );
    screen.position.set(0, 2.1, 1.31);
    console.add(screen);

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.15, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7 })
    );
    panel.position.set(0, 1.25, 2.3);
    console.add(panel);

    const buttons = [
      { x: -1.4, color: 0x00ff00, action: 'APPROVE', label: 'APPROVE [E]' },
      { x: 0, color: 0xffaa00, action: 'DETAIN', label: 'DETAIN [Q]' },
      { x: 1.4, color: 0xff0000, action: 'TERMINATE', label: 'TERMINATE [R]' }
    ];

    buttons.forEach(({ x, color, action, label }) => {
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.12, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6 })
      );
      housing.position.set(x, 1.33, 2.3);
      console.add(housing);

      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.28, 0.15, 16),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 })
      );
      btn.position.set(x, 1.45, 2.3);
      btn.userData = { action, label };
      console.add(btn);
      buttonsRef.current.push(btn);

      const light = new THREE.PointLight(color, 5, 3);
      light.position.set(x, 1.6, 2.3);
      console.add(light);
    });

    sceneRef.current.add(console);
  }, []);

  const createNPC = useCallback((shiftIndex: number): NPCData => {
    const shift = CONFIG.SHIFTS[shiftIndex];
    const isAnomaly = Math.random() < shift.anomalyChance;
    const isCriminal = !isAnomaly && Math.random() < shift.criminalChance;
    const personality = isCriminal ? 
      CONFIG.PERSONALITIES.find(p => p.type === 'criminal')! :
      CONFIG.PERSONALITIES[Math.floor(Math.random() * (CONFIG.PERSONALITIES.length - 1))];

    const group = new THREE.Group();
    const id = `SUBJ-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const name = `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;

    const skinColor = isAnomaly ? 0xcccccc : 0xf5ddc8;
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const clothMat = new THREE.MeshStandardMaterial({ color: isAnomaly ? 0x333333 : (isCriminal ? 0x553333 : 0x555577), roughness: 0.85 });

    // Body
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.1, 12), clothMat);
    torso.position.y = 1.45;
    group.add(torso);

    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 0.35), clothMat);
    shoulders.position.y = 1.9;
    group.add(shoulders);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.2, 8), skinMat);
    neck.position.y = 2.05;
    group.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), skinMat);
    head.position.y = 2.35;
    group.add(head);

    // Biometrics
    let actualLimbs = 4, reportedLimbs = 4;
    let actualEyes = 2, reportedEyes = 2;
    let actualFingers = 10, reportedFingers = 10;

    if (isAnomaly) {
      const type = Math.random();
      if (type < 0.33) {
        actualLimbs = Math.random() > 0.5 ? 6 : 2;
      } else if (type < 0.66) {
        actualEyes = Math.floor(Math.random() * 3) + 3;
      } else {
        actualFingers = Math.random() > 0.5 ? 8 : 12;
      }
    }

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: isAnomaly && actualEyes > 2 ? 0xff0000 : 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    const eyePos: [number, number, number][] = [[-0.1, 2.4, 0.22], [0.1, 2.4, 0.22]];
    if (actualEyes > 2) {
      for (let i = 2; i < actualEyes; i++) {
        eyePos.push([(Math.random() - 0.5) * 0.25, 2.3 + Math.random() * 0.15, 0.2]);
      }
    }

    for (let i = 0; i < actualEyes && i < eyePos.length; i++) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
      eye.position.set(...eyePos[i]);
      group.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), pupilMat);
      pupil.position.set(eyePos[i][0], eyePos[i][1], eyePos[i][2] + 0.025);
      group.add(pupil);
    }

    // Limbs
    const limbMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });

    // Arms
    for (let i = 0; i < Math.min(actualLimbs, 2); i++) {
      const side = i === 0 ? -1 : 1;
      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.5, 8), clothMat);
      upperArm.position.set(side * 0.55, 1.7, 0);
      upperArm.rotation.z = side * 0.4;
      group.add(upperArm);

      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.45, 8), limbMat);
      forearm.position.set(side * 0.75, 1.35, 0);
      forearm.rotation.z = side * 0.2;
      group.add(forearm);

      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.15), limbMat);
      hand.position.set(side * 0.8, 1.08, 0);
      group.add(hand);

      // Fingers
      const fingersPerHand = Math.floor(actualFingers / 2);
      for (let f = 0; f < Math.min(fingersPerHand, 6); f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.08, 4), limbMat);
        finger.position.set(side * 0.8 + (f - fingersPerHand / 2) * 0.025, 1.0, 0);
        group.add(finger);
      }
    }

    // Legs
    for (let i = 0; i < Math.min(Math.max(0, actualLimbs - 2), 2); i++) {
      const side = i === 0 ? -1 : 1;
      const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.5, 8), clothMat);
      upperLeg.position.set(side * 0.2, 0.65, 0);
      group.add(upperLeg);
      const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.5, 8), clothMat);
      lowerLeg.position.set(side * 0.2, 0.25, 0);
      group.add(lowerLeg);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.2), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      foot.position.set(side * 0.2, 0.04, 0.05);
      group.add(foot);
    }

    // Extra limbs for anomalies
    if (actualLimbs > 4) {
      for (let i = 4; i < actualLimbs; i++) {
        const extra = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.06, 0.7, 8),
          new THREE.MeshStandardMaterial({ color: 0x777777, emissive: 0x220000, emissiveIntensity: 0.3 })
        );
        const angle = ((i - 4) / (actualLimbs - 4)) * Math.PI - Math.PI / 2;
        extra.position.set(Math.cos(angle) * 0.5, 1.3 + (Math.random() - 0.5) * 0.3, Math.sin(angle) * 0.25);
        extra.rotation.z = angle + Math.PI / 2;
        group.add(extra);
      }
    }

    // Start off-screen, walk in
    group.position.set(0, 0, -20);
    group.visible = true;
    sceneRef.current?.add(group);

    return {
      id,
      name,
      isAnomaly,
      isCriminal,
      personality,
      actualLimbs,
      reportedLimbs,
      actualEyes,
      reportedEyes,
      actualFingers,
      reportedFingers,
      group,
      breatheTime: 0,
      twitchTime: Math.random() * 5,
      walkingIn: true,
      walkingOut: false,
      autoApproveTimer: CONFIG.AUTO_APPROVE_TIME
    };
  }, []);

  const destroyNPC = useCallback(() => {
    if (currentNPCRef.current && sceneRef.current) {
      sceneRef.current.remove(currentNPCRef.current.group);
      currentNPCRef.current = null;
    }
  }, []);

  const triggerJumpscare = useCallback((type: 'normal' | 'entity') => {
    const now = Date.now();
    if (now - gameStateRef.current.lastScare < CONFIG.SCARE_COOLDOWN && type !== 'entity') return;

    setGameState(prev => ({ ...prev, lastScare: now }));
    setJumpscareType(type);
    setShowJumpscare(true);

    if (audioContextRef.current) {
      playSound(audioContextRef.current, type === 'entity' ? 'entityCatch' : 'jumpscare');
    }

    // Camera shake
    if (cameraRef.current) {
      const cam = cameraRef.current;
      const origPos = cam.position.clone();
      const intensity = type === 'entity' ? 0.5 : 0.25;
      let count = 0;
      const shake = setInterval(() => {
        cam.position.x = origPos.x + (Math.random() - 0.5) * intensity;
        cam.position.y = origPos.y + (Math.random() - 0.5) * intensity;
        cam.rotation.z = (Math.random() - 0.5) * 0.15;
        count++;
        if (count > (type === 'entity' ? 30 : 15)) {
          clearInterval(shake);
          cam.position.copy(origPos);
          cam.rotation.z = 0;
        }
      }, 30);
    }

    setTimeout(() => setShowJumpscare(false), type === 'entity' ? 1000 : 400);
  }, []);

  const showActionEffect = useCallback((action: string) => {
    if (audioContextRef.current) {
      playSound(audioContextRef.current, action.toLowerCase());
    }

    // DETAIN - cage drops
    if (action === 'DETAIN' && cageRef.current && currentNPCRef.current) {
      const cage = cageRef.current;
      cage.position.y = 12;
      const drop = setInterval(() => {
        if (cage.position.y > 2) {
          cage.position.y -= 0.8;
        } else {
          clearInterval(drop);
          if (currentNPCRef.current) {
            currentNPCRef.current.group.scale.y = 0.7;
            currentNPCRef.current.group.position.y = -0.3;
          }
          setTimeout(() => {
            if (cage) cage.position.y = 12;
          }, 1500);
        }
      }, 20);
    }

    // APPROVE - gate opens, NPC walks out
    if (action === 'APPROVE' && approveGateRef.current && currentNPCRef.current) {
      const gate = approveGateRef.current;
      currentNPCRef.current.walkingOut = true;
      const raise = setInterval(() => {
        if (gate.position.y < 7) {
          gate.position.y += 0.15;
        } else {
          clearInterval(raise);
          setTimeout(() => { gate.position.y = 2.5; }, 2500);
        }
      }, 20);
    }

    // TERMINATE - NPC dissolves
    if (action === 'TERMINATE' && currentNPCRef.current) {
      if (flickerLightRef.current) {
        flickerLightRef.current.intensity = 30;
        setTimeout(() => { if (flickerLightRef.current) flickerLightRef.current.intensity = 0; }, 300);
      }

      const npc = currentNPCRef.current.group;
      let step = 0;
      const dissolve = setInterval(() => {
        step++;
        npc.scale.multiplyScalar(0.85);
        npc.position.y -= 0.1;
        npc.rotation.y += 0.3;
        npc.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissive.setHex(0x330000);
            child.material.emissiveIntensity = step * 0.1;
          }
        });
        if (step > 15) {
          clearInterval(dissolve);
          npc.visible = false;
        }
      }, 30);
    }
  }, []);

  const spawnCandidate = useCallback(() => {
    destroyNPC();

    const state = gameStateRef.current;
    const npc = createNPC(state.shiftIndex);
    currentNPCRef.current = npc;

    setCurrentSubject(`[SUBJECT: ${npc.id}]`);
    setNpcDialogue(npc.personality.greetings[Math.floor(Math.random() * npc.personality.greetings.length)]);

    const hint = npc.isAnomaly ? 'Biometric irregularity detected' :
      npc.isCriminal ? '⚠ CRIMINAL RECORD DETECTED ⚠' : 'All readings nominal';

    setTerminalText(`
SUBJECT ID: ${npc.id}
NAME: ${npc.name}
STATUS: ${hint}
TYPE: ${npc.personality.type.toUpperCase()}
${npc.isCriminal ? '\n⚠ WANTED FOR: Minor offenses\n⚠ Approving criminals reduces pay!' : ''}

REPORTED BIOMETRICS:
  • Limbs: ${npc.reportedLimbs}
  • Eyes: ${npc.reportedEyes}
  • Fingers: ${npc.reportedFingers}

VERIFY VISUAL COUNT AGAINST DATA
    `);

    setGameState(prev => ({ ...prev, processing: false, npcWalkingIn: true }));
  }, [createNPC, destroyNPC]);

  const processVerdict = useCallback((action: string) => {
    const state = gameStateRef.current;
    if (state.processing || !currentNPCRef.current || state.escapeMode || state.npcWalkingIn) return;

    const npc = currentNPCRef.current;
    let correct = false;
    let payPenalty = 0;

    if (action === 'APPROVE') {
      if (!npc.isAnomaly) {
        correct = true;
        if (npc.isCriminal) payPenalty = 50; // Lose money for approving criminals
      }
    } else if (action === 'DETAIN') {
      correct = npc.isAnomaly || npc.isCriminal;
    } else if (action === 'TERMINATE') {
      correct = npc.isAnomaly;
    }

    showActionEffect(action);
    setNpcDialogue(null);

    setGameState(prev => {
      const newState = { ...prev, processing: true };
      const shift = CONFIG.SHIFTS[prev.shiftIndex];

      if (!correct && !npc.isCriminal) {
        newState.health = prev.health - 20;
        newState.stress = Math.min(100, prev.stress + 20);
        newState.wrongDecisions = prev.wrongDecisions + 1;
        newState.compromiseLevel = Math.min(100, prev.compromiseLevel + 12);
        setTimeout(() => triggerJumpscare('normal'), 800);
        setSubtitle("⚠ CONTAINMENT PROTOCOL VIOLATED ⚠");
      } else {
        newState.quota = prev.quota + 1;
        newState.correctDecisions = prev.correctDecisions + 1;
        newState.stress = Math.max(0, prev.stress - 3);
        newState.shiftMoney = prev.shiftMoney + shift.basePay - payPenalty;
        if (npc.isAnomaly) newState.anomalyCount = prev.anomalyCount + 1;
        setSubtitle(action === 'TERMINATE' ? "Subject eliminated." :
          action === 'DETAIN' ? "Subject contained." :
            npc.isCriminal ? "Criminal approved. Pay reduced." : "Subject cleared.");
      }

      return newState;
    });

    setTimeout(() => setSubtitle(null), 2500);

    setTimeout(() => {
      const current = gameStateRef.current;

      if (current.health <= 0 && !current.escapeMode) {
        startEscapeSequence();
        return;
      }

      if (current.quota >= CONFIG.SHIFTS[current.shiftIndex].quota) {
        completeShift();
        return;
      }

      spawnCandidate();
    }, 1500);
  }, [showActionEffect, triggerJumpscare, spawnCandidate]);

  const startEscapeSequence = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      escapeMode: true,
      hasGun: true,
      nightVision: true,
      health: 30,
      escapeTimer: CONFIG.ESCAPE_TIME_LIMIT,
      entitiesActive: false
    }));

    destroyNPC();
    
    // Clean up any existing entities
    entitiesRef.current.forEach(e => {
      if (sceneRef.current) sceneRef.current.remove(e.mesh);
    });
    entitiesRef.current = [];
    entitySpawnIndexRef.current = 0;
    // 3 second head start before first entity spawns
    lastEntitySpawnRef.current = Date.now() + 3000;

    setSubtitle("⚠ CONTAINMENT FAILURE - RUN! ⚠");
    setTimeout(() => setSubtitle("3 SECONDS HEAD START - RUN FORWARD!"), 500);
    setTimeout(() => setSubtitle("CLICK to stun entities! Run to the GREEN LIGHT!"), 3500);
    setTimeout(() => setSubtitle(null), 6000);

    // OPEN the hallway entrance door (slide it aside and hide)
    if (hallwayDoorRef.current) {
      hallwayDoorRef.current.position.x = 25;
      hallwayDoorRef.current.visible = false;
    }
    
    // Make sure the exit door at end of hallway is OPEN
    if (escapeDoorRef.current) {
      escapeDoorRef.current.position.x = 18; // Far to the side = wide open
    }
    
    // Show the hallway
    if (hallwayRef.current) hallwayRef.current.visible = true;
    if (gunRef.current) gunRef.current.visible = true;

    // Position player IN THE HALLWAY - near the start, facing the exit (negative Z direction)
    // Hallway runs from Z=-22 to Z=-22-HALLWAY_LENGTH
    const hallwayStartZ = -22;
    if (cameraRef.current) {
      cameraRef.current.position.set(10, 1.7, hallwayStartZ - 5); // 5 units into the hallway
      cameraRef.current.rotation.set(0, Math.PI, 0); // Face towards negative Z (towards exit)
    }

    // Dim the bunker lights dramatically
    if (roomLightRef.current) roomLightRef.current.intensity = 1;
    if (spotlightRef.current) spotlightRef.current.intensity = 0;
    if (ambientLightRef.current) ambientLightRef.current.intensity = 0.02;
    
    // Add escape ambient sound
    if (audioContextRef.current) {
      playSound(audioContextRef.current, 'hallucination');
    }
  }, [destroyNPC]);

  const fireGun = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.hasGun || state.gunCooldown > 0) return;

    setShowGunFlash(true);
    setTimeout(() => setShowGunFlash(false), 100);
    setGameState(prev => ({ ...prev, gunCooldown: CONFIG.GUN_COOLDOWN }));

    if (audioContextRef.current) playSound(audioContextRef.current, 'gunFire');

    if (cameraRef.current && raycasterRef.current) {
      raycasterRef.current.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);

      for (const entity of entitiesRef.current) {
        if (entity.stunned) continue;
        const hits = raycasterRef.current.intersectObject(entity.mesh, true);
        if (hits.length > 0) {
          entity.stunned = true;
          entity.stunnedUntil = Date.now() + CONFIG.GUN_STUN_DURATION;
          entity.mesh.children.forEach(child => {
            if (child instanceof THREE.Mesh) {
              if (child.material instanceof THREE.MeshStandardMaterial) {
                child.material.emissive.setHex(0x0000ff);
                child.material.emissiveIntensity = 0.8;
              }
              if (child.material instanceof THREE.MeshBasicMaterial) {
                child.material.color.setHex(0x0000ff);
              }
            }
          });
          setSubtitle("ENTITY STUNNED!");
          setTimeout(() => setSubtitle(null), 800);
          break;
        }
      }
    }
  }, []);

  const closeDoorAndComplete = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.escapeMode || state.doorClosed) return;

    setGameState(prev => ({ ...prev, doorClosed: true, entitiesActive: false }));

    if (audioContextRef.current) playSound(audioContextRef.current, 'doorClose');

    // Stop all entities
    entitiesRef.current.forEach(e => { e.active = false; });

    if (escapeDoorRef.current) {
      const door = escapeDoorRef.current;
      // Animate door closing from X=16 to X=10 (center)
      const closeInterval = setInterval(() => {
        if (door.position.x > 10) {
          door.position.x -= 0.3;
        } else {
          door.position.x = 10;
          clearInterval(closeInterval);
        }
      }, 20);
    }

    setSubtitle("DOOR SEALED! You survived... for now.");

    // Complete shift after delay
    setTimeout(() => {
      setSubtitle("Returning to duty...");
      setTimeout(() => {
        // Manual shift completion without the useCallback reference
        const currentState = gameStateRef.current;
        const totalPay = currentState.shiftMoney + (currentState.correctDecisions * 20) - (currentState.wrongDecisions * 30);
        const nextShift = currentState.shiftIndex + 1;

        keysRef.current = {};
        document.exitPointerLock();

        setGameState(prev => ({
          ...prev,
          active: false,
          locked: false,
          escapeMode: false,
          hasGun: false,
          nightVision: false,
          doorClosed: false,
          money: prev.money + Math.max(0, totalPay),
          entitiesActive: false,
          processing: false,
          health: 50 // Restore some health after escape
        }));

        if (nextShift >= CONFIG.SHIFTS.length) {
          setTransitionData({
            title: "CONTAINMENT ACHIEVED",
            message: "All shifts completed. Bunker S7 secured... for now.",
            stats: `Total Earnings: $${(currentState.money + Math.max(0, totalPay)).toLocaleString()}`,
            isWin: true
          });
          setScreen('gameover');
        } else {
          setScreen('break');
        }
      }, 2000);
    }, 2000);
  }, []);

  const restOnCouch = useCallback(() => {
    const state = gameStateRef.current;
    if (state.isResting || state.escapeMode) return;
    
    // Check if stress is too low to need rest
    if (state.stress < 5) {
      setSubtitle("You don't need rest right now.");
      setTimeout(() => setSubtitle(null), 1500);
      return;
    }

    setGameState(prev => ({ ...prev, isResting: true }));

    if (audioContextRef.current) playSound(audioContextRef.current, 'rest');
    setSubtitle("Resting... Stress decreasing...");

    // Gradual stress reduction over 3 seconds
    let restTicks = 0;
    const restInterval = setInterval(() => {
      restTicks++;
      setGameState(prev => ({
        ...prev,
        stress: Math.max(0, prev.stress - (CONFIG.REST_STRESS_REDUCTION / 10))
      }));
      if (restTicks >= 10) {
        clearInterval(restInterval);
        setGameState(prev => ({ ...prev, isResting: false }));
        setSubtitle("Feeling much better.");
        setTimeout(() => setSubtitle(null), 1500);
      }
    }, 300);
  }, []);

  const completeShift = useCallback(() => {
    const state = gameStateRef.current;
    const totalPay = state.shiftMoney + (state.correctDecisions * 20) - (state.wrongDecisions * 30);
    const nextShift = state.shiftIndex + 1;

    // Reset keys to prevent stuck movement
    keysRef.current = {};
    document.exitPointerLock();

    setGameState(prev => ({
      ...prev,
      active: false,
      locked: false,
      escapeMode: false,
      hasGun: false,
      nightVision: false,
      doorClosed: false,
      money: prev.money + Math.max(0, totalPay),
      entitiesActive: false,
      processing: false
    }));

    if (nextShift >= CONFIG.SHIFTS.length) {
      setTransitionData({
        title: "CONTAINMENT ACHIEVED",
        message: "All shifts completed. Bunker S7 secured... for now.",
        stats: `Total Earnings: $${(state.money + Math.max(0, totalPay)).toLocaleString()}`,
        isWin: true
      });
      setScreen('gameover');
      return;
    }

    // Go to break room
    setTransitionData({
      title: `${CONFIG.SHIFTS[state.shiftIndex].name} COMPLETE`,
      message: '',
      stats: '',
      isWin: false
    });
    setScreen('break');
  }, []);

  const startNextShift = useCallback(() => {
    // IMPORTANT: Reset all key states to prevent stuck movement
    keysRef.current = {};
    stressAccumulator.current = 0;
    
    setGameState(prev => ({
      ...prev,
      shiftIndex: prev.shiftIndex + 1,
      quota: 0,
      active: true,
      locked: false, // Will be re-locked when pointer lock happens
      currentLoreIndex: Math.min(prev.currentLoreIndex + 1, CONFIG.LORE.length - 1),
      stress: Math.max(0, prev.stress - 10),
      shiftMoney: 0,
      health: Math.max(50, prev.health),
      processing: false,
      npcWalkingIn: false,
      isResting: false
    }));

    // Reset scene
    if (bunkerRef.current) bunkerRef.current.visible = true;
    if (hallwayRef.current) hallwayRef.current.visible = false;
    if (gunRef.current) gunRef.current.visible = false;
    if (hallwayDoorRef.current) hallwayDoorRef.current.position.x = 10;
    if (escapeDoorRef.current) escapeDoorRef.current.position.x = 14;

    entitiesRef.current.forEach(e => hallwayRef.current?.remove(e.mesh));
    entitiesRef.current = [];

    if (roomLightRef.current) roomLightRef.current.intensity = 35;
    if (spotlightRef.current) spotlightRef.current.intensity = 120;
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = 0.5;
      ambientLightRef.current.color.setRGB(1, 1, 1);
    }

    if (cameraRef.current) {
      cameraRef.current.position.set(0, 1.7, 5);
      cameraRef.current.rotation.set(0, 0, 0);
    }

    setScreen('game');
    document.body.requestPointerLock();
    setTimeout(spawnCandidate, 500);
  }, [spawnCandidate]);

  const initGame = useCallback(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.015);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 5);
    camera.rotation.order = 'YXZ';
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    clockRef.current = new THREE.Clock();
    raycasterRef.current = new THREE.Raycaster();
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

    createWorld();
    createTerminal();
    createHallway();
    createGun();

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const dt = clockRef.current?.getDelta() || 0;
      const state = gameStateRef.current;

      if (!state.active || !state.locked) {
        rendererRef.current?.render(sceneRef.current!, cameraRef.current!);
        return;
      }

      setGameState(prev => ({ ...prev, gameTime: prev.gameTime + dt }));

      // Movement
      const cam = cameraRef.current!;
      let speed = state.escapeMode ? CONFIG.PLAYER_ESCAPE_SPEED : (keysRef.current['ShiftLeft'] ? CONFIG.RUN_SPEED : CONFIG.WALK_SPEED);

      const dir = new THREE.Vector3();
      if (keysRef.current['KeyW']) dir.z -= 1;
      if (keysRef.current['KeyS']) dir.z += 1;
      if (keysRef.current['KeyA']) dir.x -= 1;
      if (keysRef.current['KeyD']) dir.x += 1;

      if (dir.length() > 0) {
        dir.normalize().applyQuaternion(cam.quaternion);
        dir.y = 0;
        dir.normalize();
        cam.position.addScaledVector(dir, speed);
      }

      // Bounds
      if (state.escapeMode) {
        // Hallway runs from Z=-22 (start) to Z=-22-HALLWAY_LENGTH-10 (safe room)
        const hallwayStartZ = -22;
        const hallwayEndZ = hallwayStartZ - CONFIG.HALLWAY_LENGTH - 8;
        cam.position.x = Math.max(7, Math.min(13, cam.position.x));
        cam.position.z = Math.max(hallwayEndZ, Math.min(hallwayStartZ + 2, cam.position.z));
      } else {
        cam.position.x = Math.max(-13, Math.min(13, cam.position.x));
        cam.position.z = Math.max(-1, Math.min(8, cam.position.z));
      }
      cam.position.y = 1.7;
      cam.rotation.z = 0;

      // Gun position
      if (gunRef.current && state.hasGun) {
        gunRef.current.position.copy(cam.position);
        gunRef.current.position.add(new THREE.Vector3(0.35, -0.25, -0.5).applyQuaternion(cam.quaternion));
        gunRef.current.quaternion.copy(cam.quaternion);
      }

      // STRESS ACCUMULATION - runs every frame when active
      if (!state.escapeMode && !state.isResting && state.active) {
        const shift = CONFIG.SHIFTS[state.shiftIndex];
        const healthFactor = 1 + (100 - state.health) / 50; // More impact from low health
        const stressIncrease = dt * shift.stressRate * healthFactor;
        stressAccumulator.current += stressIncrease;

        // Update stress more frequently for visible feedback
        if (stressAccumulator.current >= 0.05) {
          const add = stressAccumulator.current;
          stressAccumulator.current = 0;
          setGameState(prev => ({
            ...prev,
            stress: Math.min(100, prev.stress + add),
            compromiseLevel: Math.min(100, prev.compromiseLevel + add * 0.1)
          }));
        }

        // Hallucinations at high stress
        if (state.stress >= 80 && Math.random() > 0.995) {
          setGameState(prev => ({ ...prev, hallucinating: true }));
          const effects = ['shadow', 'static', 'invert', 'blur'];
          setHallucinationEffect(effects[Math.floor(Math.random() * effects.length)]);
          if (audioContextRef.current) playSound(audioContextRef.current, 'hallucination');
          setTimeout(() => {
            setGameState(prev => ({ ...prev, hallucinating: false }));
            setHallucinationEffect(null);
          }, 500 + Math.random() * 1000);
        }

        // Dynamic lighting based on compromise
        if (roomLightRef.current && ambientLightRef.current) {
          const comp = state.compromiseLevel + (100 - state.health) * 0.3;
          roomLightRef.current.intensity = Math.max(10, 35 - comp * 0.2);
          ambientLightRef.current.intensity = Math.max(0.15, 0.5 - comp * 0.003);

          // Flicker
          if (comp > 30 && Math.random() > (1 - comp / 200)) {
            roomLightRef.current.intensity = Math.random() > 0.5 ? 5 : 45;
            if (flickerLightRef.current) {
              flickerLightRef.current.intensity = Math.random() * comp * 0.2;
            }
          }
        }

        // Auto-approve timer
        if (currentNPCRef.current && !state.processing && !state.npcWalkingIn) {
          currentNPCRef.current.autoApproveTimer -= dt;
          if (currentNPCRef.current.autoApproveTimer <= 0) {
            const npc = currentNPCRef.current;
            // Mark as processing to prevent multiple triggers
            setGameState(prev => ({ ...prev, processing: true }));
            
            if (npc.isAnomaly) {
              // Anomaly got through - damage player
              setSubtitle("⚠ ANOMALY AUTO-APPROVED! Containment breach! ⚠");
              setGameState(prev => ({
                ...prev,
                health: Math.max(1, prev.health - 20), // Don't kill, just damage
                stress: Math.min(100, prev.stress + 15),
                wrongDecisions: prev.wrongDecisions + 1,
                compromiseLevel: Math.min(100, prev.compromiseLevel + 10)
              }));
              setTimeout(() => triggerJumpscare('normal'), 500);
            } else if (npc.isCriminal) {
              // Criminal got through - lose money
              setSubtitle("Criminal auto-approved. Pay reduced.");
              setGameState(prev => ({
                ...prev,
                shiftMoney: prev.shiftMoney - 50
              }));
            } else {
              // Normal person - no penalty
              setSubtitle("Subject auto-approved.");
            }
            
            // Show approve animation
            showActionEffect('APPROVE');
            
            setTimeout(() => {
              setSubtitle(null);
              const current = gameStateRef.current;
              
              // Check if health is critical AFTER the damage
              if (current.health <= 10) {
                startEscapeSequence();
                return;
              }
              
              // Increment quota and check completion
              const newQuota = current.quota + 1;
              if (newQuota >= CONFIG.SHIFTS[current.shiftIndex].quota) {
                setGameState(prev => ({ ...prev, quota: newQuota }));
                completeShift();
              } else {
                setGameState(prev => ({ ...prev, quota: newQuota }));
                spawnCandidate();
              }
            }, 1800);
          }
        }
      }

      // Gun cooldown
      if (state.gunCooldown > 0) {
        setGameState(prev => ({ ...prev, gunCooldown: Math.max(0, prev.gunCooldown - dt * 1000) }));
      }

      // NPC walking in
      if (currentNPCRef.current && currentNPCRef.current.walkingIn) {
        const npc = currentNPCRef.current;
        if (npc.group.position.z < CONFIG.NPC_Z) {
          npc.group.position.z += 0.08;
        } else {
          npc.group.position.z = CONFIG.NPC_Z;
          npc.walkingIn = false;
          setGameState(prev => ({ ...prev, npcWalkingIn: false }));
        }
      }

      // NPC walking out
      if (currentNPCRef.current && currentNPCRef.current.walkingOut) {
        currentNPCRef.current.group.position.z -= 0.12;
      }

      // NPC animation
      if (currentNPCRef.current && !state.escapeMode) {
        const npc = currentNPCRef.current;
        npc.breatheTime += dt;
        npc.twitchTime += dt;
        npc.group.scale.y = 1 + Math.sin(npc.breatheTime * 1.5) * 0.015;

        if (npc.isAnomaly && npc.twitchTime > 3 && Math.random() > 0.95) {
          npc.group.rotation.y += (Math.random() - 0.5) * 0.3;
          npc.twitchTime = 0;
        }

        if (npc.personality.fidget && Math.random() > 0.99) {
          npc.group.position.x += (Math.random() - 0.5) * 0.05;
        }
      }

      // ESCAPE MODE
      if (state.escapeMode) {
        const now = Date.now();

        // Timer
        setGameState(prev => ({
          ...prev,
          escapeTimer: Math.max(0, prev.escapeTimer - dt)
        }));

        if (state.escapeTimer <= 0 && !state.doorClosed) {
          triggerJumpscare('entity');
          setGameState(prev => ({ ...prev, health: 0, entitiesActive: false }));
          setTimeout(() => {
            setTransitionData({
              title: "TIME'S UP",
              message: "They caught you in the darkness.",
              stats: '',
              isWin: false
            });
            setScreen('gameover');
          }, 1200);
          return;
        }

        // Spawn entities one at a time
        if (now > lastEntitySpawnRef.current && entitySpawnIndexRef.current < 3 + state.shiftIndex) {
          spawnEntity(entitySpawnIndexRef.current);
          entitySpawnIndexRef.current++;
          lastEntitySpawnRef.current = now + 5000; // 5 seconds between spawns
          if (!state.entitiesActive) {
            setGameState(prev => ({ ...prev, entitiesActive: true }));
            setSubtitle("⚠ ENTITY DETECTED BEHIND YOU! ⚠");
            setTimeout(() => setSubtitle(null), 2000);
          }
        }

        // Entity AI - chase and kill
        for (let i = 0; i < entitiesRef.current.length; i++) {
          const entity = entitiesRef.current[i];
          
          // Check spawn delay
          if (now < entity.spawnTime) {
            continue;
          }
          
          entity.active = true;

          // Check stun status
          if (entity.stunned) {
            if (now > entity.stunnedUntil) {
              entity.stunned = false;
              // Reset colors back to red
              entity.mesh.children.forEach(child => {
                if (child instanceof THREE.Mesh) {
                  if (child.material instanceof THREE.MeshStandardMaterial) {
                    child.material.emissive.setHex(0x220000);
                    child.material.emissiveIntensity = 0.5;
                  }
                  if (child.material instanceof THREE.MeshBasicMaterial) {
                    child.material.color.setHex(0xff0000);
                  }
                }
              });
            }
            // Skip movement while stunned
            continue;
          }

          // ACTIVE CHASE - entity moves toward player
          const entityPos = entity.mesh.position;
          const playerPos = cam.position;
          
          const dx = playerPos.x - entityPos.x;
          const dz = playerPos.z - entityPos.z;
          const distXZ = Math.sqrt(dx * dx + dz * dz);
          
          // Move towards player
          if (distXZ > 0.5) {
            const moveX = (dx / distXZ) * entity.speed;
            const moveZ = (dz / distXZ) * entity.speed;
            entityPos.x += moveX;
            entityPos.z += moveZ;
            
            // Face the player
            entity.mesh.lookAt(playerPos.x, entityPos.y, playerPos.z);
          }

          // Bob animation
          entityPos.y = Math.sin(now * 0.008 + i * 2) * 0.15;

          // COLLISION CHECK - kill player if too close
          const dist3D = entityPos.distanceTo(playerPos);
          if (dist3D < 2.0) {
            // CAUGHT!
            console.log("Entity caught player! Distance:", dist3D);
            triggerJumpscare('entity');
            setGameState(prev => ({ ...prev, health: 0, entitiesActive: false, escapeMode: false }));
            
            // Stop all entities
            entitiesRef.current.forEach(e => { e.active = false; });
            
            setTimeout(() => {
              setTransitionData({
                title: "CONSUMED BY THE VOID",
                message: "They caught you in the darkness. Your screams echo forever in Bunker S7.",
                stats: `Shifts survived: ${gameStateRef.current.shiftIndex}`,
                isWin: false
              });
              setScreen('gameover');
            }, 1200);
            return;
          }
        }

        // Switch detection - check if player is near the door close switch
        if (escapeSwitchRef.current && !state.doorClosed) {
          const hallwayStartZ = -22;
          const exitZ = hallwayStartZ - CONFIG.HALLWAY_LENGTH;
          const switchPos = new THREE.Vector3(13, 1.5, exitZ - 2);
          const dist = cam.position.distanceTo(switchPos);
          
          if (dist < 4) {
            setHoverAction('>>> CLOSE DOOR [E] <<<');
          } else {
            setHoverAction(null);
          }
        } else if (state.doorClosed) {
          setHoverAction(null);
        }
      }

      // Button hover and couch detection
      if (!state.escapeMode && buttonsRef.current.length > 0 && raycasterRef.current) {
        raycasterRef.current.setFromCamera(new THREE.Vector2(0, 0), cam);
        const hits = raycasterRef.current.intersectObjects(buttonsRef.current);
        if (hits.length > 0 && hits[0].object.userData.action) {
          setHoverAction(hits[0].object.userData.label);
        } else if (couchRef.current) {
          // Check distance to couch (couch is at -10, 0.4, 5)
          const couchPos = new THREE.Vector3(-10, 0.4, 5);
          const distToCouch = cam.position.distanceTo(couchPos);
          if (distToCouch < 5) {
            setHoverAction(state.isResting ? 'RESTING...' : 'REST [F] - Reduce Stress');
          } else {
            setHoverAction(null);
          }
        } else {
          setHoverAction(null);
        }
      }

      rendererRef.current?.render(sceneRef.current!, cameraRef.current!);
    };

    animate();

    // Events
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      const state = gameStateRef.current;

      if (state.escapeMode) {
        if ((e.key === 'e' || e.key === 'E') && cameraRef.current) {
          // Check distance to switch
          const hallwayStartZ = -22;
          const exitZ = hallwayStartZ - CONFIG.HALLWAY_LENGTH;
          const switchPos = new THREE.Vector3(13, 1.5, exitZ - 2);
          if (cameraRef.current.position.distanceTo(switchPos) < 4) {
            closeDoorAndComplete();
          }
        }
      } else {
        if (e.key === 'e' || e.key === 'E') processVerdict('APPROVE');
        if (e.key === 'q' || e.key === 'Q') processVerdict('DETAIN');
        if (e.key === 'r' || e.key === 'R') processVerdict('TERMINATE');
        if (e.key === 'f' || e.key === 'F') {
          if (cameraRef.current) {
            // Check distance to couch (couch is at -10, 0.4, 5)
            const couchPos = new THREE.Vector3(-10, 0.4, 5);
            const distToCouch = cameraRef.current.position.distanceTo(couchPos);
            if (distToCouch < 5) {
              restOnCouch();
            }
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!cameraRef.current || !gameStateRef.current.locked) return;
      const cam = cameraRef.current;
      cam.rotation.y -= e.movementX * CONFIG.SENSITIVITY;
      cam.rotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, cam.rotation.x - e.movementY * CONFIG.SENSITIVITY));
    };

    const handleMouseDown = () => {
      const state = gameStateRef.current;

      if (state.escapeMode && state.hasGun) {
        fireGun();
        return;
      }

      if (!state.escapeMode && state.locked && buttonsRef.current.length > 0 && raycasterRef.current && cameraRef.current) {
        raycasterRef.current.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);
        const hits = raycasterRef.current.intersectObjects(buttonsRef.current);
        if (hits.length > 0 && hits[0].object.userData.action) {
          processVerdict(hits[0].object.userData.action);
        }
      }
    };

    const handlePointerLockChange = () => {
      setGameState(prev => ({ ...prev, locked: document.pointerLockElement !== null }));
    };

    const handleClick = () => {
      if (gameStateRef.current.active && !document.pointerLockElement) {
        document.body.requestPointerLock();
      }
    };

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    // Reset keys when window loses focus to prevent stuck movement
    const handleBlur = () => {
      keysRef.current = {};
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('blur', handleBlur);

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('blur', handleBlur);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [createWorld, createTerminal, createHallway, createGun, processVerdict, fireGun, closeDoorAndComplete, restOnCouch, triggerJumpscare, spawnEntity, spawnCandidate, startEscapeSequence, completeShift]);

  useEffect(() => {
    if (screen === 'game') return initGame();
  }, [screen, initGame]);

  const startGame = () => {
    // Reset key states
    keysRef.current = {};
    stressAccumulator.current = 0;
    
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setScreen('game');
    setGameState(prev => ({ ...prev, active: true, locked: false }));
    setTimeout(() => {
      document.body.requestPointerLock();
      spawnCandidate();
    }, 500);
  };

  const currentLore = CONFIG.LORE[Math.min(gameState.currentLoreIndex, CONFIG.LORE.length - 1)];
  const showCursor = screen !== 'game' || !gameState.locked;

  return (
    <div className={`relative w-full h-screen bg-black text-green-400 font-mono overflow-hidden ${showCursor ? 'cursor-default' : 'cursor-none'}`}>
      {/* CRT Effect */}
      <div className="pointer-events-none fixed inset-0 z-[2000]"
        style={{
          background: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.04), rgba(0,255,0,0.02), rgba(0,0,255,0.04))',
          backgroundSize: '100% 2px, 3px 100%'
        }}
      />

      {/* Scanline */}
      <div className="pointer-events-none fixed w-full h-24 z-[2001] opacity-10 animate-scan"
        style={{ background: 'linear-gradient(0deg, transparent 0%, rgba(0,255,0,0.1) 50%, transparent 100%)' }}
      />

      {/* Night Vision */}
      {gameState.nightVision && screen === 'game' && (
        <div className="fixed inset-0 z-[150] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,80,0,0.4) 0%, rgba(0,40,0,0.7) 100%)', mixBlendMode: 'screen' }}
        />
      )}

      {/* Hallucination Effects */}
      {hallucinationEffect === 'static' && (
        <div className="fixed inset-0 z-[300] pointer-events-none opacity-40"
          style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.2) 2px, rgba(255,255,255,0.2) 4px)' }}
        />
      )}
      {hallucinationEffect === 'shadow' && (
        <div className="fixed inset-0 z-[300] pointer-events-none bg-black opacity-60" />
      )}
      {hallucinationEffect === 'invert' && (
        <div className="fixed inset-0 z-[300] pointer-events-none" style={{ filter: 'invert(1)', mixBlendMode: 'difference' }} />
      )}
      {hallucinationEffect === 'blur' && (
        <div className="fixed inset-0 z-[300] pointer-events-none backdrop-blur-sm" />
      )}

      {/* Gun Flash */}
      {showGunFlash && <div className="fixed inset-0 z-[200] bg-cyan-200 opacity-50 pointer-events-none" />}

      {/* Jumpscare */}
      {showJumpscare && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
          <img
            src={jumpscareType === 'entity' ? CONFIG.ENTITY_JUMPSCARE_IMAGE : CONFIG.JUMPSCARE_IMAGE}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'contrast(180%) brightness(120%) saturate(60%)' }}
          />
        </div>
      )}

      {/* Blood Vignette */}
      <div className="fixed inset-0 z-[99] pointer-events-none transition-opacity duration-500"
        style={{
          background: 'radial-gradient(circle, transparent 0%, rgba(139,0,0,0.7) 100%)',
          opacity: gameState.health < 50 ? (50 - gameState.health) / 50 : 0
        }}
      />

      {/* Stress Vignette */}
      <div className="fixed inset-0 z-[98] pointer-events-none transition-opacity duration-300"
        style={{
          background: 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.9) 100%)',
          opacity: Math.min(0.85, gameState.stress / 100)
        }}
      />

      {/* Loading */}
      {screen === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[1000] bg-black">
          <h1 className="text-5xl font-bold tracking-[0.3em] text-green-400 mb-4 animate-pulse" style={{ textShadow: '0 0 60px #00ff41' }}>
            VOID GATE
          </h1>
          <p className="tracking-[0.2em] opacity-70 text-sm mb-2">BUNKER S7 - UNDERGROUND CONTAINMENT</p>
          <div className="w-96 h-1.5 bg-black border border-green-900 mb-4">
            <div className="h-full bg-green-400 transition-all duration-100" style={{ width: `${loadProgress}%`, boxShadow: '0 0 20px #00ff41' }} />
          </div>
          <p className="text-xs text-green-800 tracking-wider">{loadStatus}</p>
        </div>
      )}

      {/* Menu */}
      {screen === 'menu' && (
        <div className="absolute inset-0 flex z-[1000] bg-black">
          {/* Left side - Title and Decorative */}
          <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Animated background grid */}
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'linear-gradient(rgba(0,255,65,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.3) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                animation: 'gridMove 20s linear infinite'
              }}
            />
            
            {/* Glowing orb effect */}
            <div className="absolute w-96 h-96 rounded-full opacity-20"
              style={{
                background: 'radial-gradient(circle, rgba(0,255,65,0.4) 0%, transparent 70%)',
                filter: 'blur(40px)',
                animation: 'pulse 4s ease-in-out infinite'
              }}
            />
            
            {/* Title container - centered */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <h1 className="text-8xl font-bold tracking-[0.25em] text-green-400 mb-2" style={{ textShadow: '0 0 80px #00ff41, 0 0 120px #00ff41' }}>
                VOID GATE
              </h1>
              <p className="text-4xl tracking-[0.5em] text-green-400/80 font-bold mb-6" style={{ textShadow: '0 0 40px #00ff41' }}>
                THE BUNKER
              </p>
              <p className="tracking-[0.4em] opacity-40 text-sm mb-4">SECTOR 7 - UNDERGROUND CONTAINMENT</p>
            </div>
            
            {/* Decorative line */}
            <div className="w-80 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-50 mb-8 relative z-10" />
            
            {/* Warning text */}
            <div className="max-w-md text-center text-red-500/80 text-xs leading-relaxed relative z-10">
              <p className="animate-pulse text-lg mb-2">⚠ CLASSIFIED MATERIAL ⚠</p>
              <p className="opacity-60">CONTAINMENT PROTOCOL ACTIVE</p>
              <p className="opacity-40">SURVIVAL RATE: 0.003%</p>
            </div>
          </div>
          
          {/* Right side - Menu buttons */}
          <div className="w-96 flex flex-col justify-center items-start px-12 bg-black/50 border-l border-green-900/50">
            <div className="mb-12">
              <p className="text-xs text-green-600 tracking-widest mb-2">MAIN TERMINAL</p>
              <div className="w-20 h-0.5 bg-green-400" />
            </div>
            
            <button onClick={startGame}
              className="w-full text-left border-l-4 border-green-400 bg-green-400/10 text-green-400 px-6 py-4 text-lg tracking-widest hover:bg-green-400 hover:text-black transition-all cursor-pointer mb-4 group">
              <span className="opacity-50 group-hover:opacity-100 mr-2">►</span> START GAME
            </button>
            
            <button onClick={() => setScreen('howtoplay')}
              className="w-full text-left border-l-4 border-yellow-400 bg-yellow-400/10 text-yellow-400 px-6 py-4 text-lg tracking-widest hover:bg-yellow-400 hover:text-black transition-all cursor-pointer mb-4 group">
              <span className="opacity-50 group-hover:opacity-100 mr-2">►</span> HOW TO PLAY
            </button>
            
            <button onClick={() => setScreen('credits')}
              className="w-full text-left border-l-4 border-cyan-400 bg-cyan-400/10 text-cyan-400 px-6 py-4 text-lg tracking-widest hover:bg-cyan-400 hover:text-black transition-all cursor-pointer mb-4 group">
              <span className="opacity-50 group-hover:opacity-100 mr-2">►</span> CREDITS
            </button>
            
            <div className="mt-12 text-xs opacity-40">
              <p>VERSION 1.0.8</p>
              <p className="mt-1">© 2043 VOID INDUSTRIES</p>
            </div>
          </div>
        </div>
      )}
      
      {/* How To Play */}
      {screen === 'howtoplay' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[1000] bg-black p-8">
          <h1 className="text-4xl font-bold tracking-[0.2em] text-yellow-400 mb-8" style={{ textShadow: '0 0 40px #ffaa00' }}>
            HOW TO PLAY
          </h1>
          
          <div className="max-w-3xl grid grid-cols-2 gap-6 mb-8">
            <div className="border border-green-900 bg-green-950/20 p-5">
              <h3 className="text-green-400 font-bold mb-3 tracking-wider">🎮 CONTROLS</h3>
              <ul className="text-sm text-gray-400 space-y-2">
                <li><span className="text-white">WASD</span> - Move around</li>
                <li><span className="text-white">Mouse</span> - Look around</li>
                <li><span className="text-white">E</span> - Approve subject</li>
                <li><span className="text-white">Q</span> - Detain subject</li>
                <li><span className="text-white">R</span> - Terminate subject</li>
                <li><span className="text-white">F</span> - Rest on couch</li>
                <li><span className="text-white">Click</span> - Fire gun (escape mode)</li>
              </ul>
            </div>
            
            <div className="border border-red-900 bg-red-950/20 p-5">
              <h3 className="text-red-400 font-bold mb-3 tracking-wider">⚠ OBJECTIVE</h3>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>• Inspect subjects through the window</li>
                <li>• Count their limbs, eyes, and fingers</li>
                <li>• Compare with reported biometrics</li>
                <li>• <span className="text-green-400">APPROVE</span> - Normal humans</li>
                <li>• <span className="text-yellow-400">DETAIN</span> - Criminals & anomalies</li>
                <li>• <span className="text-red-400">TERMINATE</span> - Dangerous anomalies</li>
              </ul>
            </div>
            
            <div className="border border-yellow-900 bg-yellow-950/20 p-5">
              <h3 className="text-yellow-400 font-bold mb-3 tracking-wider">😰 STRESS & REST</h3>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>• Stress increases over time</li>
                <li>• High stress causes hallucinations</li>
                <li>• Find the couch and press F to rest</li>
                <li>• Don't take too long - subjects auto-approve!</li>
                <li>• Auto-approved anomalies damage you</li>
              </ul>
            </div>
            
            <div className="border border-purple-900 bg-purple-950/20 p-5">
              <h3 className="text-purple-400 font-bold mb-3 tracking-wider">🏃 ESCAPE MODE</h3>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>• Triggers when integrity is critical</li>
                <li>• Run through the emergency hallway</li>
                <li>• Use your stun gun on entities</li>
                <li>• Reach the exit and close the door</li>
                <li>• Entities are FASTER than you!</li>
              </ul>
            </div>
          </div>
          
          <div className="border border-cyan-900 bg-cyan-950/20 p-5 max-w-3xl w-full mb-8">
            <h3 className="text-cyan-400 font-bold mb-3 tracking-wider">💰 PAYMENT</h3>
            <p className="text-sm text-gray-400">
              Earn money for correct decisions. Lose money for mistakes and approving criminals. 
              After each shift, enjoy a break in your room and watch TV. Your total earnings accumulate across shifts.
            </p>
          </div>
          
          <button onClick={() => setScreen('menu')}
            className="border-2 border-yellow-400 text-yellow-400 px-10 py-3 tracking-widest hover:bg-yellow-400 hover:text-black transition-all cursor-pointer">
            ← BACK TO MENU
          </button>
        </div>
      )}
      
      {/* Credits */}
      {screen === 'credits' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[1000] bg-black">
          <h1 className="text-4xl font-bold tracking-[0.2em] text-cyan-400 mb-12" style={{ textShadow: '0 0 40px #00aaff' }}>
            CREDITS
          </h1>
          
          <div className="max-w-lg text-center space-y-8">
            <div>
              <h3 className="text-xl text-white font-bold mb-2">VOID GATE: THE BUNKER</h3>
              <p className="text-gray-400 text-sm">A horror checkpoint game</p>
              <p className="text-green-400 text-xs mt-2">© 2043 VOID INDUSTRIES</p>
            </div>
            
            <div className="border-t border-gray-800 pt-8">
              <h3 className="text-green-400 font-bold mb-3 tracking-wider">DEVELOPMENT</h3>
              <p className="text-gray-400">Game Design & Programming</p>
              <p className="text-white">Created with React, Three.js & Tailwind</p>
              <p className="text-green-400/60 text-sm mt-2">VOID INDUSTRIES R&D Division</p>
            </div>
            
            <div className="border-t border-gray-800 pt-8">
              <h3 className="text-yellow-400 font-bold mb-3 tracking-wider">INSPIRATION</h3>
              <p className="text-gray-400">Papers, Please</p>
              <p className="text-gray-400">Five Nights at Freddy's</p>
              <p className="text-gray-400">SCP Foundation</p>
            </div>
            
            <div className="border-t border-gray-800 pt-8">
              <h3 className="text-red-400 font-bold mb-3 tracking-wider">SPECIAL THANKS</h3>
              <p className="text-gray-400">To all the brave operators of Bunker S7</p>
              <p className="text-gray-500 text-xs mt-2">(None have survived)</p>
            </div>
            
            <div className="border-t border-gray-800 pt-8">
              <h3 className="text-purple-400 font-bold mb-3 tracking-wider">ASSETS</h3>
              <p className="text-gray-500 text-sm">Jumpscare images from public sources</p>
              <p className="text-gray-500 text-sm">Audio generated procedurally</p>
            </div>
          </div>
          
          <button onClick={() => setScreen('menu')}
            className="mt-12 border-2 border-cyan-400 text-cyan-400 px-10 py-3 tracking-widest hover:bg-cyan-400 hover:text-black transition-all cursor-pointer">
            ← BACK TO MENU
          </button>
        </div>
      )}

      {/* Break Room */}
      {screen === 'break' && (
        <BreakRoom3D
          onBreakEnd={startNextShift}
          payment={gameState.shiftMoney + (gameState.correctDecisions * 20) - (gameState.wrongDecisions * 30)}
          shiftNumber={gameState.shiftIndex + 1}
          videoTime={videoTime}
          setVideoTime={setVideoTime}
        />
      )}

      {/* Game */}
      {screen === 'game' && (
        <>
          <div ref={containerRef} className="absolute inset-0" onClick={() => !gameState.locked && document.body.requestPointerLock()} />

          {/* HUD */}
          <div className="absolute inset-0 pointer-events-none z-[100]">
            {/* Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className={`w-6 h-6 border-2 rounded-full ${gameState.escapeMode ? 'border-red-500' : 'border-green-400/60'}`}>
                <div className={`absolute w-0.5 h-3 left-1/2 -translate-x-1/2 -top-4 ${gameState.escapeMode ? 'bg-red-500' : 'bg-green-400'}`} />
                <div className={`absolute w-0.5 h-3 left-1/2 -translate-x-1/2 -bottom-4 ${gameState.escapeMode ? 'bg-red-500' : 'bg-green-400'}`} />
                <div className={`absolute h-0.5 w-3 top-1/2 -translate-y-1/2 -left-4 ${gameState.escapeMode ? 'bg-red-500' : 'bg-green-400'}`} />
                <div className={`absolute h-0.5 w-3 top-1/2 -translate-y-1/2 -right-4 ${gameState.escapeMode ? 'bg-red-500' : 'bg-green-400'}`} />
              </div>
            </div>

            {/* Interaction Label */}
            {hoverAction && (
              <div className={`absolute top-[55%] left-1/2 -translate-x-1/2 px-6 py-2 font-bold tracking-wider animate-pulse ${gameState.escapeMode ? 'bg-red-500 text-black' : 'bg-green-400 text-black'}`}>
                [ {hoverAction} ]
              </div>
            )}

            {/* NPC Dialogue */}
            {npcDialogue && !gameState.escapeMode && (
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 bg-black/90 border border-gray-600 px-6 py-3 text-white text-lg italic">
                "{npcDialogue}"
              </div>
            )}

            {/* Escape HUD */}
            {gameState.escapeMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
                <div className="text-red-500 text-2xl font-bold animate-pulse mb-2">⚠ ESCAPE PROTOCOL ⚠</div>
                <div className="text-3xl font-bold text-yellow-400 mb-2">TIME: {Math.ceil(gameState.escapeTimer)}s</div>
                {gameState.entitiesActive && (
                  <div className="text-xl text-red-400 animate-pulse">ENTITIES HUNTING!</div>
                )}
                <div className={`text-sm mt-2 ${gameState.gunCooldown > 0 ? 'text-red-500' : 'text-cyan-400'}`}>
                  GUN: {gameState.gunCooldown > 0 ? 'RECHARGING...' : 'READY - CLICK TO STUN'}
                </div>
              </div>
            )}

            {/* Stats Panel */}
            {!gameState.escapeMode && (
              <div className="absolute top-8 left-8 w-80 bg-black/95 border-2 border-green-400 p-5" style={{ boxShadow: '0 0 30px rgba(0,255,0,0.2)' }}>
                <div className="text-xs tracking-wider opacity-70 mb-1">NEURAL_INTEGRITY</div>
                <div className="w-full h-3 bg-green-950 border border-green-800 mb-4">
                  <div className="h-full bg-green-400 transition-all duration-300" style={{ width: `${gameState.health}%`, boxShadow: '0 0 10px #00ff41' }} />
                </div>

                <div className="text-xs tracking-wider text-red-500 mb-1">PSYCHOSIS_LEVEL {gameState.stress >= 80 && <span className="animate-pulse">(HALLUCINATING)</span>}</div>
                <div className="w-full h-3 bg-red-950 border border-red-800 mb-4">
                  <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${gameState.stress}%`, boxShadow: '0 0 15px #ff0000' }} />
                </div>

                <div className="border-t border-green-800 pt-3 font-bold">
                  SHIFT: {String(gameState.shiftIndex + 1).padStart(2, '0')} | PROCESSED: {gameState.quota} / {CONFIG.SHIFTS[gameState.shiftIndex]?.quota || 0}
                </div>

                <div className="mt-3 text-xs opacity-50">
                  <div>ANOMALIES: {gameState.anomalyCount}</div>
                  <div className="text-yellow-400">SHIFT PAY: ${gameState.shiftMoney}</div>
                  <div className="text-green-400">TOTAL: ${gameState.money}</div>
                  {gameState.isResting && <div className="text-cyan-400 animate-pulse">RESTING...</div>}
                </div>
              </div>
            )}

            {/* Auto-approve timer */}
            {!gameState.escapeMode && currentNPCRef.current && !gameState.npcWalkingIn && !gameState.processing && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2 text-yellow-400">
                Auto-approve in: {Math.ceil(currentNPCRef.current.autoApproveTimer)}s
              </div>
            )}

            {/* Lore */}
            {!gameState.escapeMode && (
              <div className="absolute top-8 right-8 w-72 bg-black/95 border-2 border-red-700 p-4" style={{ boxShadow: '0 0 30px rgba(255,0,0,0.2)' }}>
                <div className="text-xs tracking-wider text-red-500 mb-2">INCIDENT_LOG</div>
                <div className="text-xs text-gray-400 leading-relaxed h-36 overflow-y-auto">
                  <div className="border-l-2 border-red-900 pl-2">
                    <span className="text-red-500 font-bold">DAY_{currentLore.day}:</span><br />
                    {currentLore.text}
                  </div>
                </div>
              </div>
            )}

            {/* Terminal */}
            {!gameState.escapeMode && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[850px] bg-black/95 border-2 border-green-400 p-5" style={{ boxShadow: '0 0 30px rgba(0,255,0,0.2)' }}>
                <div className="flex justify-between border-b border-green-800 pb-2 mb-3">
                  <span className="text-yellow-400 font-bold tracking-wider">{currentSubject}</span>
                  <span className="text-xs opacity-50">BIOMETRIC_SCAN: ACTIVE</span>
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-line h-24 overflow-y-auto">{terminalText}</div>
                <div className="mt-3 pt-2 border-t border-green-800 flex justify-around text-xs opacity-60">
                  <span className="text-green-400">[E] APPROVE</span>
                  <span className="text-yellow-400">[Q] DETAIN</span>
                  <span className="text-red-400">[R] TERMINATE</span>
                  <span className="text-cyan-400">[F] REST (near couch)</span>
                </div>
              </div>
            )}

            {/* Subtitle */}
            {subtitle && (
              <div className={`absolute bottom-48 left-1/2 -translate-x-1/2 px-8 py-4 text-center border ${gameState.escapeMode ? 'bg-red-950/90 border-red-500 text-red-400' : 'bg-black/90 border-green-400'}`}>
                {subtitle}
              </div>
            )}
          </div>
        </>
      )}

      {/* Transition */}
      {screen === 'transition' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[1000] bg-black">
          <h1 className="text-4xl font-bold text-green-400 mb-6">{transitionData.title}</h1>
          <p className="max-w-lg text-center text-gray-400 leading-relaxed whitespace-pre-line mb-6">{transitionData.message}</p>
          <p className="text-sm text-gray-600 mb-8">{transitionData.stats}</p>
          <button onClick={startNextShift}
            className="border-2 border-green-400 text-green-400 px-10 py-3 tracking-widest hover:bg-green-400 hover:text-black transition-all cursor-pointer">
            CONTINUE
          </button>
        </div>
      )}

      {/* Game Over */}
      {screen === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[1000] bg-black">
          <h1 className={`text-4xl font-bold mb-6 ${transitionData.isWin ? 'text-green-400' : 'text-red-500'}`}>{transitionData.title}</h1>
          <p className="max-w-lg text-center text-gray-400 leading-relaxed mb-6">{transitionData.message}</p>
          <div className="text-sm text-gray-600 mb-8 whitespace-pre-line text-center">{transitionData.stats}</div>
          <button onClick={() => window.location.reload()}
            className="border-2 border-red-500 text-red-500 px-10 py-3 tracking-widest hover:bg-red-500 hover:text-black transition-all cursor-pointer">
            RESET SYSTEM
          </button>
        </div>
      )}

      <style>{`
        @keyframes scan { from { top: -100px; } to { top: 100%; } }
        .animate-scan { animation: scan 6s linear infinite; }
        @keyframes gridMove { 
          from { transform: translate(0, 0); } 
          to { transform: translate(40px, 40px); } 
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

export default App;
