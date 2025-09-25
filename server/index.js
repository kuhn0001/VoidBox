// Server-Authoritative Multiplayer server for Void Sky (race mode)
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const uuid = require('uuid');
const _ = require('lodash');
const path = require('path');

// Serve static files from the parent directory (where index.html and multi.html are)
app.use(express.static(path.join(__dirname, '..')));

const PORT = process.env.PORT || 8080;
const rooms = {};
const TICK_RATE = 20; // 20 ticks per second (50ms intervals)

// Game constants (matching client)
const W = 960, H = 540;

// Seeded random number generator (improved)
function createSeededRandom(seed) {
  // Convert string seed to number if needed
  if (typeof seed === 'string') {
    seed = seed.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
  }
  
  let state = seed;
  return function() {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// Enemy configurations (matching client)
const enemyConfigs = {
  drone: { r: 10, v: 80, vx: 0, hp: 20, color: '#C0C0C0', xp: 5, score: 50, shards: 1, fireRateChance: 0.004 },
  hunter: { r: 20, v: 100, vx: 0, hp: 15, color: '#DC143C', xp: 8, score: 80, shards: 1, fireRateChance: 0.005 },
  phantom: { r: 14, v: 90, vx: 0, hp: 30, color: '#FFFFFF', xp: 10, score: 100, shards: 2, fireRateChance: 0.006, fireCooldown: 1.5 },
  mech: { r: 18, v: 40, vx: 0, hp: 70, color: '#FF8500', xp: 15, score: 150, shards: 3, fireRateChance: 0.007, attackPhase: 0 },
  angler: { r: 22, v: 30, vx: 0, hp: 120, color: '#00008b', xp: 18, score: 180, shards: 4, fireRateChance: 0.008 },
  manta: { r: 26, v: 50, vx: 0, hp: 150, color: '#53B6FF', xp: 22, score: 220, shards: 5, fireRateChance: 0.009 }
};

// Server-side game state management
class GameRoom {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.sockets = [];
    this.gameStarted = false;
    this.gameState = {
      wave: 1,
      enemies: [],
      boss: null,
      players: {},
      waveStartTime: 0,
      enemyHealthBonus: 1.0,
      enemyDensityBonus: 1.0
    };
    this.seedRandom = createSeededRandom(id);
    console.log(`Created seeded random for room ${id}, test values:`, 
      this.seedRandom().toFixed(3), this.seedRandom().toFixed(3), this.seedRandom().toFixed(3));
    this.enemyIdCounter = 0;
    this.gameLoop = null;
  }

  startGame() {
    this.gameStarted = true;
    this.gameState.waveStartTime = Date.now();
    this.initWave();
    
    // Start server game loop
    this.gameLoop = setInterval(() => {
      this.updateGame();
      this.broadcastGameState();
    }, 1000 / TICK_RATE);
    
    console.log(`Game started in room ${this.id}`);
  }

  stopGame() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }

  spawnEnemy(type = 'drone') {
    const cfg = { ...enemyConfigs[type] };
    const wave = this.gameState.wave;
    cfg.hp *= Math.pow(1.075, wave) * this.gameState.enemyHealthBonus;
    
    const randomX = this.seedRandom();
    const randomY = this.seedRandom();
    const x = 20 + randomX * (W - 40);
    const y = -50 - randomY * 250;
    
    console.log(`Spawning ${type} at x=${x.toFixed(1)}, y=${y.toFixed(1)} (randomX=${randomX.toFixed(3)}, randomY=${randomY.toFixed(3)})`);
    
    const enemy = {
      ...cfg,
      type,
      id: this.enemyIdCounter++,
      x: x,
      y: y,
      hpMax: cfg.hp,
      phase: type === 'phantom',
      t: 0,
      fireT: cfg.fireCooldown || 0,
      isBursting: false,
      burstTimer: 0,
      stunTimer: 0,
      knockback: null
    };
    
    if (enemy.type === 'manta') {
      enemy.startX = enemy.x;
      enemy.amplitude = 150 + this.seedRandom() * 100;
      enemy.frequency = 0.5 + this.seedRandom() * 0.5;
      enemy.dodgeCooldown = 0;
      enemy.isDodging = false;
    }
    
    return enemy;
  }

  initWave() {
    const isBossWave = this.gameState.wave % 5 === 0;
    this.gameState.enemies = [];
    this.gameState.waveStartTime = Date.now();
    
    if (!isBossWave) {
      const spawnCount = Math.floor((7 + Math.floor(this.gameState.wave * 1.8)) * this.gameState.enemyDensityBonus);
      
      for (let i = 0; i < spawnCount; i++) {
        const types = ['drone', 'drone', 'hunter'];
        if (this.gameState.wave > 3) types.push('phantom');
        if (this.gameState.wave > 5) types.push('mech');
        if (this.gameState.wave > 7) types.push('angler');
        if (this.gameState.wave > 9) types.push('manta');
        
        const type = types[Math.floor(this.seedRandom() * types.length)];
        const enemy = this.spawnEnemy(type);
        this.gameState.enemies.push(enemy);
      }
    }
  }

  updateGame() {
    const dt = 1 / TICK_RATE;
    
    // Update enemies
    this.gameState.enemies.forEach(enemy => {
      enemy.t += dt;
      enemy.y += enemy.v * dt;
      
      // Manta movement pattern
      if (enemy.type === 'manta' && enemy.startX !== undefined) {
        enemy.x = enemy.startX + Math.sin(enemy.t * enemy.frequency) * enemy.amplitude;
      }
      
      // Remove enemies that are off-screen
      if (enemy.y > H + 100) {
        const index = this.gameState.enemies.indexOf(enemy);
        if (index > -1) this.gameState.enemies.splice(index, 1);
      }
    });
    
    // Check wave completion - only progress wave if enemies have been cleared for a short time
    // This prevents instant wave progression when enemies spawn off-screen
    if (this.gameState.enemies.length === 0 && !this.gameState.boss) {
      // Add a small delay before progressing to next wave to prevent rapid progression
      if (!this.waveClearTimer) {
        this.waveClearTimer = 0;
      }
      this.waveClearTimer += dt;
      
      if (this.waveClearTimer >= 0.5) { // Wait 0.5 seconds after enemies clear
        this.gameState.wave++;
        this.waveClearTimer = 0;
        this.initWave();
        console.log(`Wave ${this.gameState.wave} started in room ${this.id}`);
      }
    } else {
      this.waveClearTimer = 0;
    }
  }

  broadcastGameState() {
    const stateUpdate = {
      wave: this.gameState.wave,
      waveStartTime: this.gameState.waveStartTime,
      enemies: this.gameState.enemies,
      boss: this.gameState.boss,
      players: this.gameState.players
    };
    
    this.sockets.forEach(socket => {
      socket.emit('gameState', stateUpdate);
    });
  }

  addPlayer(socket) {
    this.sockets.push(socket);
    this.gameState.players[socket.id] = {
      id: socket.id,
      name: socket.playerName || 'Player',
      x: W/2,
      y: H - 100,
      hp: 100,
      score: 0
    };
  }

  removePlayer(socket) {
    this.sockets = this.sockets.filter(s => s !== socket);
    delete this.gameState.players[socket.id];
    
    if (this.sockets.length === 0) {
      this.stopGame();
    }
  }
}

function leaveRooms(socket) {
  const roomsToDelete = [];
  for (const id in rooms) {
    const room = rooms[id];
    if (room.sockets.includes(socket)) {
      room.removePlayer(socket);
      socket.leave(id);
    }
    if (room.sockets.length === 0) {
      roomsToDelete.push(room);
    }
  }
  for (const room of roomsToDelete) {
    delete rooms[room.id];
  }
}

io.on('connection', (socket) => {
  socket.id = uuid.v1();
  console.log('a user connected:', socket.id);

  socket.on('setPlayerName', (name) => {
    socket.playerName = name;
  });

  socket.on('createRoom', (roomName, callback) => {
    console.log('CreateRoom request received, roomName:', roomName);
    try {
      const room = new GameRoom(uuid.v1(), roomName);
      rooms[room.id] = room;
      room.addPlayer(socket);
      socket.join(room.id);
      socket.roomId = room.id;
      console.log('Room created with ID:', room.id);
      callback(room.id);
    } catch (error) {
      console.error('Error creating room:', error);
      callback(null);
    }
  });

  socket.on('joinRoom', (roomId, callback) => {
    console.log('JoinRoom request received, roomId:', roomId);
    const room = rooms[roomId];
    if (!room) {
      console.log('Room not found:', roomId);
      return callback('Room not found');
    }
    if (room.gameStarted) {
      console.log('Game already started in room:', roomId);
      return callback('Game already started');
    }
    
    room.addPlayer(socket);
    socket.join(roomId);
    socket.roomId = roomId;
    
    // Notify other players
    room.sockets.forEach(player => {
      if (player !== socket) {
        player.emit('playerJoined', { 
          id: socket.id, 
          player: { name: socket.playerName || 'Player' } 
        });
      }
    });
    
    console.log('Successfully joined room:', roomId);
    callback(null);
  });

  socket.on('getRoomNames', (data, callback) => {
    const roomNames = Object.values(rooms)
      .filter(room => !room.gameStarted)
      .map(room => ({ name: room.name, id: room.id }));
    callback(roomNames);
  });

  socket.on('startGame', () => {
    const room = rooms[socket.roomId];
    if (!room || room.gameStarted) return;
    
    room.startGame();
    
    // Notify all players in the room
    room.sockets.forEach(player => {
      player.emit('gameStart', {
        seed: room.id,
        startTime: Date.now()
      });
    });
  });

  socket.on('playerInput', (input) => {
    const room = rooms[socket.roomId];
    if (!room || !room.gameStarted) return;
    
    // Update player position based on input
    const player = room.gameState.players[socket.id];
    if (player) {
      player.x = Math.max(0, Math.min(W, input.x || player.x));
      player.y = Math.max(0, Math.min(H, input.y || player.y));
      player.hp = input.hp || player.hp;
      player.score = input.score || player.score;
    }
  });

  socket.on('leaveRoom', () => {
    leaveRooms(socket);
  });

  socket.on('disconnect', (reason) => {
    console.log('user disconnected:', socket.id, 'reason:', reason);
    leaveRooms(socket);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

http.listen(PORT, '0.0.0.0', () => {
  console.log(`Server-authoritative multiplayer server listening on 0.0.0.0:${PORT}`);
});
