import math
import random
import sys
import pygame

##############################################
# Void Skies — v0.1 (Python/Pygame)
# Two‑player top‑down shooter with light RPG.
# P1: mouse to move, left click to shoot, Shift for special
# P2: arrows to move, RCTRL to shoot, RSHIFT for special
# Start: click "Start" or press Enter. Pause: P. Quit: Esc.
##############################################

WIDTH, HEIGHT = 960, 540
FPS = 60
VERSION = "Void Skies v0.1 (pygame)"

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption(VERSION)
clock = pygame.time.Clock()

# Fonts
FONT = pygame.font.SysFont(None, 24)
FONT_BIG = pygame.font.SysFont(None, 48)

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
BG = (10, 13, 18)
P1C = (96, 165, 250)
P2C = (244, 114, 182)
GOLD = (253, 224, 71)
RED = (248, 113, 113)

# Starfield
stars = [
    [random.uniform(0, WIDTH), random.uniform(0, HEIGHT), random.uniform(0.2, 1.0)]
    for _ in range(180)
]

def draw_stars(dt):
    screen.fill(BG)
    for s in stars:
        s[1] += 40 * s[2] * dt
        if s[1] > HEIGHT:
            s[1] = 0
            s[0] = random.uniform(0, WIDTH)
        alpha = int(80 + 175 * s[2])
        col = (255, 255, 255, alpha)
        # Draw tiny star as a 2x2 rect
        pygame.draw.rect(screen, (255, 255, 255), pygame.Rect(int(s[0]), int(s[1]), max(1, int(2 * s[2])), max(1, int(2 * s[2]))))

class Bullet:
    def __init__(self, x, y, vx, vy, owner, color):
        self.x, self.y = x, y
        self.vx, self.vy = vx, vy
        self.r = 3
        self.owner = owner
        self.color = color
        self.alive = True
        self.dmg = getattr(getattr(owner, 'stats', None), 'bullet_damage', 6) or 6

    def update(self, dt):
        self.x += self.vx * dt
        self.y += self.vy * dt
        if self.y < -10 or self.y > HEIGHT + 10 or self.x < -10 or self.x > WIDTH + 10:
            self.alive = False

    def draw(self):
        pygame.draw.circle(screen, self.color, (int(self.x), int(self.y)), self.r)

class Enemy:
    def __init__(self, x, y, etype=0):
        self.x, self.y = x, y
        self.r = 14
        self.hp = 28 if etype == 1 else 18
        self.speed = 55 if etype == 1 else 65
        self.type = etype
        self.t = 0
        self.alive = True
        self.value = 18 if etype == 1 else 12

    def update(self, dt, bullets):
        self.t += dt
        self.y += self.speed * dt
        self.x += math.sin(self.t * 3) * (60 if self.type else 40) * dt
        if self.y > HEIGHT + 30:
            self.alive = False
        if random.random() < 0.005:
            bullets.append(Bullet(self.x, self.y + 10, 0, 180, self, RED))

    def draw(self):
        pts = [(self.x, self.y - 12), (self.x + 10, self.y + 10), (self.x - 10, self.y + 10)]
        pygame.draw.polygon(screen, (249, 115, 22) if self.type else (234, 179, 8), pts)

class Particle:
    def __init__(self, x, y, vx, vy, col):
        self.x, self.y = x, y
        self.vx, self.vy = vx, vy
        self.life = 0.6
        self.col = col
        self.alive = True

    def update(self, dt):
        self.life -= dt
        if self.life <= 0:
            self.alive = False
        self.x += self.vx * dt
        self.y += self.vy * dt
        self.vy += 60 * dt

    def draw(self):
        if self.alive:
            a = max(0, int(255 * (self.life / 0.6)))
            pygame.draw.rect(screen, self.col, pygame.Rect(int(self.x), int(self.y), 3, 3))

class Player:
    def __init__(self, pid, x, y, color, keymap=None, mouse_control=False):
        self.id = pid
        self.x, self.y = x, y
        self.r = 14
        self.color = color
        self.keymap = keymap or {}
        self.mouse_control = mouse_control
        self.stats = {
            'max_hp': 100,
            'speed': 180,
            'fire_cd': 0.22,
            'bullet_damage': 10,
            'special_cd': 10,
            'special_dur': 3,
            'parts_bonus': 1.0,
        }
        self.hp = self.stats['max_hp']
        self.fire_timer = 0
        self.special_timer = 0
        self.special_active = 0
        self.level = 1
        self.xp = 0
        self.xp_next = 60
        self.skill_points = 0
        self.skills = set()
        self.drone = None
        self.want_fire = False

    def update(self, dt, mouse_pos, keys_pressed):
        # movement
        dx = dy = 0
        if self.mouse_control:
            mx, my = mouse_pos
            vx = mx - self.x
            vy = my - self.y
            d = math.hypot(vx, vy)
            if d > 1:
                dx = vx / d
                dy = vy / d
        else:
            if keys_pressed[self.keymap.get('up', 0)]:
                dy -= 1
            if keys_pressed[self.keymap.get('down', 0)]:
                dy += 1
            if keys_pressed[self.keymap.get('left', 0)]:
                dx -= 1
            if keys_pressed[self.keymap.get('right', 0)]:
                dx += 1
            if dx != 0 or dy != 0:
                mag = math.hypot(dx, dy)
                dx /= mag
                dy /= mag
        self.x += dx * self.stats['speed'] * dt
        self.y += dy * self.stats['speed'] * dt
        self.x = max(20, min(WIDTH - 20, self.x))
        self.y = max(20, min(HEIGHT - 20, self.y))

        # firing
        self.fire_timer -= dt
        if self.want_fire and self.fire_timer <= 0:
            self.shoot()
            self.fire_timer = self.stats['fire_cd'] * (0.5 if self.special_active > 0 else 1)

        # special
        self.special_timer -= dt
        special_pressed = keys_pressed[self.keymap.get('special', 0)] if not self.mouse_control else keys_pressed[pygame.K_LSHIFT] or keys_pressed[pygame.K_RSHIFT]
        if special_pressed and self.special_timer <= 0:
            self.special_active = self.stats['special_dur']
            self.special_timer = self.stats['special_cd']
        if self.special_active > 0:
            self.special_active = max(0, self.special_active - dt)

        # drone
        if self.drone:
            self.drone_update(dt)

    def draw(self):
        pts = [(self.x, self.y - 14), (self.x + 12, self.y + 10), (self.x - 12, self.y + 10)]
        pygame.draw.polygon(screen, self.color, pts)
        if self.special_active > 0:
            pygame.draw.circle(screen, self.color, (int(self.x), int(self.y)), 18, width=1)

    def shoot(self):
        bullets.append(Bullet(self.x - 6, self.y - 12, 0, -360, self, self.color))
        bullets.append(Bullet(self.x + 6, self.y - 12, 0, -360, self, self.color))

    def hit(self, dmg):
        self.hp -= dmg
        if self.hp <= 0:
            self.hp = 0
            set_game_over()

    def earn(self, xp, parts):
        global currency
        self.xp += xp
        currency += int(parts * self.stats.get('parts_bonus', 1.0))
        if self.xp >= self.xp_next:
            self.level += 1
            self.skill_points += 1
            self.xp -= self.xp_next
            self.xp_next = int(self.xp_next * 1.35)
            queue_level_up(self)

    def deploy_drone(self):
        # Minimal auto-firing helper
        self.drone_t = 0
        self.drone = True

    def drone_update(self, dt):
        self.drone_t += dt
        if random.randint(0, 25) == 0:
            bullets.append(Bullet(self.x, self.y - 24, 0, -340, self, (167, 243, 208)))

# Skill system
SKILLS = {
    'gunnery1': dict(name='Gunnery I', desc='+20% bullet damage', req=[], apply=lambda p: setattr(p.stats, 'bullet_damage', p.stats.__setitem__('bullet_damage', int(p.stats['bullet_damage'] * 1.2)))) ,
}
# We'll implement skills inline via simple functions to keep it compact

def apply_skill(player, key):
    if key == 'gunnery1':
        player.stats['bullet_damage'] = int(player.stats['bullet_damage'] * 1.2)
    elif key == 'gunnery2':
        player.stats['bullet_damage'] = int(player.stats['bullet_damage'] * 1.25)
    elif key == 'shields1':
        player.stats['max_hp'] = int(player.stats['max_hp'] * 1.25)
        player.hp = player.stats['max_hp']
    elif key == 'shields2':
        player.stats['max_hp'] = int(player.stats['max_hp'] * 1.35)
        player.hp = player.stats['max_hp']
    elif key == 'engine1':
        player.stats['speed'] *= 1.15
    elif key == 'reactor':
        player.stats['special_dur'] *= 2
    elif key == 'focus':
        player.stats['fire_cd'] *= 0.8
    elif key == 'drone':
        player.deploy_drone()
    elif key == 'salvage':
        player.stats['parts_bonus'] = 1.25

# Simple level-up: present 3 choices in HUD and press 1/2/3
LEVEL_CHOICES = [
    ('gunnery1', 'Gunnery I'),
    ('shields1', 'Shield Plating I'),
    ('engine1',  'Engine Tuning'),
    ('reactor',  'Reactor Overdrive'),
    ('focus',    'Targeting Focus'),
    ('drone',    'Auto‑Drone'),
    ('salvage',  'Salvage Ops'),
]

# Game state
game_state = 'menu'  # 'menu' | 'playing' | 'paused' | 'gameover' | 'levelup'
players = []
bullets = []
enemies = []
particles = []
wave = 1
currency = 0
levelup_for = None

# UI buttons
start_btn_rect = pygame.Rect(WIDTH//2 - 70, HEIGHT//2 + 40, 140, 44)

def start_game():
    global players, bullets, enemies, particles, wave, currency, game_state, levelup_for
    players = [
        Player(1, WIDTH * 0.3, HEIGHT - 60, P1C, mouse_control=True),
        Player(2, WIDTH * 0.7, HEIGHT - 60, P2C, keymap={
            'up': pygame.K_UP,
            'down': pygame.K_DOWN,
            'left': pygame.K_LEFT,
            'right': pygame.K_RIGHT,
            'fire': pygame.K_RCTRL,
            'special': pygame.K_RSHIFT,
        })
    ]
    bullets = []
    enemies = []
    particles = []
    wave = 1
    currency = 0
    levelup_for = None
    game_state = 'playing'
    spawn_wave()


def set_game_over():
    global game_state
    game_state = 'gameover'


def spawn_wave():
    count = 8 + wave * 2
    for i in range(count):
        pygame.time.set_timer(pygame.USEREVENT + 1, 300, loops=1)
        # schedule via a timer-like spread using frame updates
        enemies.append(Enemy(random.uniform(40, WIDTH - 40), -30, 1 if random.random() < 0.35 else 0))


def update(dt):
    global wave
    for p in players:
        p.update(dt, pygame.mouse.get_pos(), pygame.key.get_pressed())

    for b in bullets:
        b.update(dt)

    for e in enemies:
        e.update(dt, bullets)

    # Collisions: player bullets vs enemies
    for b in bullets:
        if not b.alive:
            continue
        if b.owner in players:
            for e in enemies:
                if not e.alive:
                    continue
                dx = b.x - e.x
                dy = b.y - e.y
                if dx * dx + dy * dy < (e.r + b.r) * (e.r + b.r):
                    e.hp -= b.dmg
                    b.alive = False
                    if e.hp <= 0:
                        e.alive = False
                        spawn_pop(e.x, e.y)
                        xp = e.value
                        parts = int(e.value / 2)
                        for pl in players:
                            pl.earn(xp / len(players), parts / len(players))

    # Enemy bullets vs players
    for b in bullets:
        if not b.alive:
            continue
        if b.owner in players:
            continue
        for p in players:
            dx = b.x - p.x
            dy = b.y - p.y
            if dx * dx + dy * dy < (p.r + b.r) * (p.r + b.r):
                p.hit(12)
                b.alive = False
                spawn_hit(p.x, p.y, p.color)

    # Enemies vs players
    for e in enemies:
        if not e.alive:
            continue
        for p in players:
            dx = e.x - p.x
            dy = e.y - p.y
            if dx * dx + dy * dy < (e.r + p.r) * (e.r + p.r):
                p.hit(18)
                e.alive = False
                spawn_pop(e.x, e.y)

    # Cleanup
    bullets[:] = [b for b in bullets if b.alive]
    enemies[:] = [e for e in enemies if e.alive]
    for prt in particles:
        prt.update(dt)
    particles[:] = [p for p in particles if p.alive]

    # Wave cleared
    if not enemies and game_state == 'playing':
        wave += 1
        for pl in players:
            pl.earn(20, 10)
        spawn_wave()


def spawn_pop(x, y):
    for _ in range(12):
        particles.append(Particle(x, y, random.uniform(-140, 140), random.uniform(-80, 40), GOLD))


def spawn_hit(x, y, col):
    for _ in range(8):
        particles.append(Particle(x, y, random.uniform(-120, 120), random.uniform(-60, 20), col))


def draw_hud():
    # Version/state badge
    badge = FONT.render(f"{VERSION} | state: {game_state}", True, WHITE)
    screen.blit(badge, (10, 8))

    # P1
    p1 = players[0]
    p2 = players[1]
    def bars(player, x):
        hp_txt = FONT.render(f"HP: {int(player.hp)}/{int(player.stats['max_hp'])}", True, WHITE)
        lvl_txt = FONT.render(f"Lvl {player.level} ({player.skill_points} SP)", True, WHITE)
        xp_pct = max(0.0, min(1.0, player.xp / player.xp_next))
        pygame.draw.rect(screen, (255, 255, 255), pygame.Rect(x, 30, 220, 10), 1)
        pygame.draw.rect(screen, (94, 234, 212), pygame.Rect(x + 1, 31, int(218 * xp_pct), 8))
        screen.blit(hp_txt, (x, 44))
        screen.blit(lvl_txt, (x + 110, 44))
    bars(p1, 20)
    bars(p2, WIDTH - 240)

    wave_txt = FONT.render(f"Wave {wave}   Parts: {currency}", True, WHITE)
    screen.blit(wave_txt, (WIDTH//2 - wave_txt.get_width()//2, 10))


def draw_menu():
    title = FONT_BIG.render("🎮 Void Skies", True, WHITE)
    version = FONT.render("v0.1 (pygame)", True, WHITE)
    info1 = FONT.render("P1: mouse to move, click to shoot, Shift special", True, WHITE)
    info2 = FONT.render("P2: arrows move, RCTRL shoot, RSHIFT special", True, WHITE)
    info3 = FONT.render("Click Start or press Enter", True, WHITE)

    screen.blit(title, (WIDTH//2 - title.get_width()//2, HEIGHT//2 - 120))
    screen.blit(version, (WIDTH//2 - version.get_width()//2, HEIGHT//2 - 80))
    screen.blit(info1, (WIDTH//2 - info1.get_width()//2, HEIGHT//2 - 40))
    screen.blit(info2, (WIDTH//2 - info2.get_width()//2, HEIGHT//2 - 18))
    screen.blit(info3, (WIDTH//2 - info3.get_width()//2, HEIGHT//2 + 8))

    pygame.draw.rect(screen, (30, 40, 60), start_btn_rect, border_radius=10)
    pygame.draw.rect(screen, (200, 220, 255), start_btn_rect, 2, border_radius=10)
    start_txt = FONT.render("Start", True, WHITE)
    screen.blit(start_txt, (start_btn_rect.centerx - start_txt.get_width()//2, start_btn_rect.centery - start_txt.get_height()//2))


def draw_game():
    for p in players:
        p.draw()
    for e in enemies:
        e.draw()
    for b in bullets:
        b.draw()
    for prt in particles:
        prt.draw()
    draw_hud()


def draw_game_over():
    msg = FONT_BIG.render("Game Over", True, WHITE)
    tip = FONT.render("Press Enter to restart", True, WHITE)
    screen.blit(msg, (WIDTH//2 - msg.get_width()//2, HEIGHT//2 - 14))
    screen.blit(tip, (WIDTH//2 - tip.get_width()//2, HEIGHT//2 + 24))


def queue_level_up(player):
    global game_state, levelup_for
    levelup_for = player
    game_state = 'levelup'


def draw_level_up():
    # Show three random choices; press 1/2/3 to pick
    pygame.draw.rect(screen, (20, 28, 40), pygame.Rect(WIDTH//2 - 260, HEIGHT//2 - 120, 520, 220), border_radius=12)
    pygame.draw.rect(screen, (200, 220, 255), pygame.Rect(WIDTH//2 - 260, HEIGHT//2 - 120, 520, 220), 2, border_radius=12)
    hdr = FONT.render(f"Player {levelup_for.id} leveled up! Choose a skill (1/2/3).", True, WHITE)
    screen.blit(hdr, (WIDTH//2 - hdr.get_width()//2, HEIGHT//2 - 110))

    random.seed(42 + levelup_for.level)  # deterministic per level for simplicity
    pool = ["gunnery1", "shields1", "engine1", "reactor", "focus", "drone", "salvage"]
    choices = random.sample(pool, 3)

    for i, key in enumerate(choices):
        box = pygame.Rect(WIDTH//2 - 240 + i*160, HEIGHT//2 - 70, 150, 140)
        pygame.draw.rect(screen, (32, 44, 64), box, border_radius=8)
        pygame.draw.rect(screen, (140, 170, 220), box, 2, border_radius=8)
        name = {
            'gunnery1':'Gunnery I','shields1':'Shield Plating I','engine1':'Engine Tuning',
            'reactor':'Reactor Overdrive','focus':'Targeting Focus','drone':'Auto‑Drone','salvage':'Salvage Ops'
        }[key]
        txt = FONT.render(f"{i+1}) {name}", True, WHITE)
        screen.blit(txt, (box.x + 8, box.y + 8))
        # Save on object so handler can read later
        pygame.draw.rect(screen, (60, 90, 140), pygame.Rect(box.x+8, box.y+36, 134, 4))
    return choices

# Maintain current level choices so keypress can apply
current_choices = None

# Main loop
mouse_down = False
running = True

# For smoother dt
prev_ms = pygame.time.get_ticks()

auto_started = False

while running:
    now_ms = pygame.time_get_ticks() if hasattr(pygame, 'time_get_ticks') else pygame.time.get_ticks()
    dt = (now_ms - prev_ms) / 1000.0
    prev_ms = now_ms
    dt = min(0.033, max(0.0, dt))

    # Auto-start fallback once, for environments where clicks/keys are blocked
    if not auto_started and game_state == 'menu' and pygame.time.get_ticks() > 900:
        start_game()
        auto_started = True

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                running = False
            elif event.key in (pygame.K_RETURN, pygame.K_KP_ENTER) and game_state in ('menu', 'gameover'):
                start_game()
            elif event.key == pygame.K_p:
                if game_state == 'playing':
                    game_state = 'paused'
                elif game_state == 'paused':
                    game_state = 'playing'
            elif game_state == 'levelup':
                if event.key in (pygame.K_1, pygame.K_2, pygame.K_3) and current_choices:
                    idx = {pygame.K_1:0, pygame.K_2:1, pygame.K_3:2}[event.key]
                    key = current_choices[idx]
                    apply_skill(levelup_for, key)
                    game_state = 'playing'
        elif event.type == pygame.MOUSEBUTTONDOWN:
            mouse_down = True
            if game_state == 'menu' and start_btn_rect.collidepoint(event.pos):
                start_game()
            if game_state in ('menu', 'gameover'):
                start_game()
        elif event.type == pygame.MOUSEBUTTONUP:
            mouse_down = False

    # Update want_fire
    if players:
        players[0].want_fire = mouse_down  # P1
        keys_pressed = pygame.key.get_pressed()
        players[1].want_fire = keys_pressed[pygame.K_RCTRL]

    # Update
    draw_stars(dt)

    if game_state == 'menu':
        draw_menu()
    elif game_state == 'playing':
        update(dt)
        draw_game()
    elif game_state == 'paused':
        draw_game()
        pause_txt = FONT_BIG.render("Paused", True, WHITE)
        screen.blit(pause_txt, (WIDTH//2 - pause_txt.get_width()//2, HEIGHT//2 - 10))
    elif game_state == 'gameover':
        draw_game()
        draw_game_over()
    elif game_state == 'levelup':
        update(dt)  # still update particles for some life
        draw_game()
        current_choices = draw_level_up()

    pygame.display.flip()
    clock.tick(FPS)

pygame.quit()
