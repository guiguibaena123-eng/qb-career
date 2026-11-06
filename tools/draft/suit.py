"""
Figuras de terno do Draft (comissário e jogador segurando a jersey) em pixel art.

Desenha numa grade de arte de 100×200 (1 px de arte = 2 px da figura de 200×400, como o resto do
jogo) e salva camadas em tons de cinza que o jogo tinge (multiply) com as cores certas:

  public/assets/draft_suit/
    s2_trou, s2_shoes, s2_shirt, s2_tie, s2_jacket   corpo (sem braços)
    s2_det                                           detalhes já coloridos (botões, sombra no chão)
    s2_jersey, s2_jtrim                              jersey segurada (corpo + gola/faixas)
    s2_<pose>_sleeve / _skin / _det                  braços de cada pose

Poses: rest (braços caídos), gest (mão erguida apresentando), clap0..clap4 (palmas: abertas → batida),
hold (segurando a jersey pelos ombros).

A luz vem de cima à esquerda. Cada peça tem contorno escuro; peças da frente desenham uma linha
escura sobre as de trás (contorno seletivo), então manga sobre paletó do mesmo tom continua legível.

Uso: python tools/draft/suit.py [--preview pasta]
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'assets' / 'draft_suit'
W, H = 100, 200
CX = 50  # centro: entre as colunas 49 e 50 (espelho: x -> 99 - x)

# Tons (multiply: 255 = cor pura, menores escurecem)
HI, BASE, MID, SH, DEEP, LINE = 250, 222, 188, 156, 122, 18


# ------------------------------------------------------------------ primitivas


def blank():
    return np.zeros((H, W), bool)


def poly(pts):
    im = Image.new('1', (W, H), 0)
    ImageDraw.Draw(im).polygon([(x, y) for x, y in pts], fill=1, outline=1)
    return np.array(im, bool)


def mirror(m):
    return m[:, ::-1]


def sym(m):
    return m | mirror(m)


def capsule(p0, p1, r0, r1=None):
    """Segmento grosso (raio r0 → r1), devolve máscara e um campo u ∈ [-1, 1] através da peça."""
    r1 = r0 if r1 is None else r1
    ys, xs = np.mgrid[0:H, 0:W]
    px, py = xs + 0.5, ys + 0.5
    (x0, y0), (x1, y1) = p0, p1
    dx, dy = x1 - x0, y1 - y0
    L2 = dx * dx + dy * dy
    t = np.clip(((px - x0) * dx + (py - y0) * dy) / L2, 0, 1)
    cx, cy = x0 + t * dx, y0 + t * dy
    r = r0 + (r1 - r0) * t
    ox, oy = px - cx, py - cy
    d = np.hypot(ox, oy)
    m = d <= r
    # Normal "acesa": aponta para cima/esquerda
    L = math.sqrt(L2)
    nx, ny = -dy / L, dx / L
    if nx * -1 + ny * -0.6 < 0:
        nx, ny = -nx, -ny
    u = -(ox * nx + oy * ny) / np.maximum(r, 0.1)  # -1 = lado aceso
    return m, u


def tone_from_u(u):
    """Cilindro: borda acesa, base, meia-sombra e sombra."""
    out = np.full(u.shape, BASE, np.int32)
    out[u < -0.62] = HI
    out[u > 0.30] = MID
    out[u > 0.68] = SH
    return out


def tone_rows(mask, hi=0.10, mid=0.70, sh=0.88):
    out = np.full((H, W), BASE, np.int32)
    for y in range(H):
        xs = np.nonzero(mask[y])[0]
        if len(xs) == 0:
            continue
        a, b = xs[0], xs[-1]
        span = max(1, b - a)
        t = (xs - a) / span
        v = np.full(len(xs), BASE)
        v[t < hi] = HI
        v[t > mid] = MID
        v[t > sh] = SH
        out[y, xs] = v
    return out


def tone_cols(mask, hi=0.18, mid=0.62, sh=0.84):
    return tone_rows(mask.T, hi, mid, sh).T if False else _cols(mask, hi, mid, sh)


def _cols(mask, hi, mid, sh):
    out = np.full((H, W), BASE, np.int32)
    for x in range(W):
        ys = np.nonzero(mask[:, x])[0]
        if len(ys) == 0:
            continue
        a, b = ys[0], ys[-1]
        span = max(1, b - a)
        t = (ys - a) / span
        v = np.full(len(ys), BASE)
        v[t < hi] = HI
        v[t > mid] = MID
        v[t > sh] = SH
        out[ys, x] = v
    return out


def dil(m):
    o = m.copy()
    o[1:] |= m[:-1]
    o[:-1] |= m[1:]
    o[:, 1:] |= m[:, :-1]
    o[:, :-1] |= m[:, 1:]
    return o


# ------------------------------------------------------------------ cena (peças em ordem z)


class Part:
    def __init__(self, name, mat, mask, tone, group=None):
        self.name, self.mat, self.mask, self.tone = name, mat, mask, tone
        self.group = group or name


class Scene:
    """Compõe peças: material e tom por pixel, contorno externo e contorno seletivo entre grupos."""

    def __init__(self):
        self.parts = []

    def add(self, name, mat, mask, tone, group=None):
        self.parts.append(Part(name, mat, mask, tone, group))
        return self.parts[-1]

    def render(self, outline=True, base=None):
        mat = np.full((H, W), '', object) if base is None else base['mat'].copy()
        tone = np.zeros((H, W), np.int32) if base is None else base['tone'].copy()
        grp = np.full((H, W), '', object) if base is None else base['grp'].copy()
        mine = np.zeros((H, W), bool)
        for p in self.parts:
            m = p.mask
            # contorno seletivo: o que já existe em volta desta peça (de outro grupo) ganha linha escura
            if outline:
                ring = dil(m) & ~m & (mat != '') & (grp != p.group)
                tone[ring] = LINE
                mat[ring] = p.mat
                grp[ring] = p.group
                mine |= ring
            mat[m] = p.mat
            tone[m] = p.tone[m] if isinstance(p.tone, np.ndarray) else p.tone
            grp[m] = p.group
            mine |= m
        if outline:
            # contorno externo (silhueta), atribuído ao material vizinho
            filled = mat != ''
            ring = dil(filled) & ~filled
            for y, x in zip(*np.nonzero(ring)):
                for dy, dx in ((-1, 0), (0, -1), (0, 1), (1, 0)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and mat[yy, xx] != '':
                        mat[y, x] = mat[yy, xx]
                        grp[y, x] = grp[yy, xx]
                        break
                tone[y, x] = LINE
                mine[y, x] = True
        return {'mat': mat, 'tone': tone, 'grp': grp, 'mine': mine}


# ------------------------------------------------------------------ corpo


def torso_half(y):
    """Meia-largura do paletó (do centro) em cada linha."""
    if y < 42:
        return 0
    if y < 48:  # caimento do pescoço até a ponta do ombro
        return 8 + round((y - 42) / 6 * 14)
    if y < 54:
        return 22
    if y < 60:
        return 22 - round((y - 54) / 6 * 3)
    if y < 82:
        return 19 - round((y - 60) / 22 * 2)
    if y < 100:
        return 17 + round((y - 82) / 18 * 2)
    return 19


def v_half(y):
    """Abertura em V do paletó (camisa e gravata), fecha no botão de cima."""
    if y < 42 or y >= 86:
        return 0
    return max(0, round(8 * (1 - (y - 42) / 44)))


HEM = 120


def body_scene(color_shirt=True):
    s = Scene()
    # Pernas (calça): coxa larga afinando até o tornozelo, com a barra quebrando sobre o sapato
    for side in (0, 1):
        pts = []
        for y in range(112, 190):
            t = (y - 116) / 72
            outer = 50 - (17 - t * 4.5)
            inner = 50 - (0.5 + max(0, min(1, (y - 118) / 8)) * 1.5)
            pts.append((outer, y, inner))
        m = blank()
        for x0, y, x1 in pts:
            m[y, int(round(x0)):int(round(x1)) + 1] = True
        # quebra da barra sobre o sapato
        m[186:190, int(50 - 13.5):49] = True
        if side:
            m = mirror(m)
        tone = tone_rows(m, 0.12, 0.62, 0.84)
        # vinco da calça (meio da perna) com luz
        for y in range(122, 184):
            xs = np.nonzero(m[y])[0]
            if len(xs):
                c = (xs[0] + xs[-1]) // 2
                tone[y, c] = min(HI, tone[y, c] + 18)
        # dobra no joelho e na barra
        for y in (150, 151, 185):
            xs = np.nonzero(m[y])[0]
            if len(xs):
                tone[y, xs[2:-2]] = np.minimum(tone[y, xs[2:-2]], MID)
        s.add(f'leg{side}', 'trou', m, tone)
    # Sapatos: bico arredondado virado um pouco para fora, brilho em cima
    for side in (0, 1):
        m = poly([(36, 188), (48, 188), (49, 193), (48, 197), (33, 197), (31, 195), (32, 191)])
        if side:
            m = mirror(m)
        tone = _cols(m, 0.25, 0.55, 0.8)
        s.add(f'shoe{side}', 'shoes', m, tone)
    # Camisa (só aparece no V) e gravata
    shirt = blank()
    for y in range(40, 90):
        h = v_half(y) + 1
        if h > 1:
            shirt[y, CX - h:CX + h] = True
    st = np.full((H, W), 240, np.int32)
    st[:, :CX] = 250
    s.add('shirt', 'shirt', shirt, st)
    tie = blank()
    for y in range(52, 88):
        hw = 2 if y < 58 else (3 if y < 82 else 3 - (y - 82) // 2)
        if hw > 0:
            tie[y, CX - hw:CX + hw] = True
    tt = tone_rows(tie, 0.3, 0.6, 0.8)
    for y in range(58, 84, 6):  # listras diagonais discretas
        for i in range(6):
            yy, xx = y + i, CX - 3 + i
            if tie[yy, xx]:
                tt[yy, xx] = MID
    s.add('tie', 'tie', tie, tt)
    # Paletó (tronco) com a abertura em V
    jk = blank()
    for y in range(42, HEM):
        h = torso_half(y)
        v = v_half(y)
        jk[y, CX - h:CX - v] = True
        jk[y, CX + v:CX + h] = True
    # barra: as duas frentes se abrem em curva abaixo dos botões
    for i, y in enumerate(range(HEM - 6, HEM)):
        w = i + 1
        jk[y, CX - w:CX + w] = False
    jt = tone_rows(jk, 0.07, 0.74, 0.9)
    # sombra embaixo dos braços e no meio
    s.add('jacket', 'jacket', jk, jt, group='jacket')
    # Lapelas: faixa larga ao longo do V até o recorte (notch) e afinando até o botão
    lap = blank()
    for y in range(43, 86):
        v = v_half(y)
        lw = 6 if y < 60 else max(0, 6 - round((y - 60) / 26 * 6))
        if y in (60, 61):  # recorte
            lw = 3
        if lw > 0:
            lap[y, CX - v - lw:CX - v] = True
    lap = sym(lap)
    lt = np.full((H, W), MID, np.int32)
    lt[:, :CX] = BASE + 8
    # bordas das lapelas: luz na esquerda, linha escura na borda externa
    for y in range(43, 86):
        xs = np.nonzero(lap[y, :CX])[0]
        if len(xs):
            lt[y, xs[0]] = LINE
            lt[y, xs[-1]] = HI
        xs = np.nonzero(lap[y, CX:])[0] + CX
        if len(xs):
            lt[y, xs[-1]] = LINE
            lt[y, xs[0]] = BASE
    s.add('lapel', 'jacket', lap, lt, group='jacket')
    out = s.render()
    # Detalhes pintados sobre o paletó
    t, m = out['tone'], out['mat']

    def paint(x, y, v, mat='jacket'):
        if 0 <= x < W and 0 <= y < H and m[y, x] == mat:
            t[y, x] = v

    # linha da frente (abaixo do V) e as duas frentes se abrindo na barra
    for y in range(86, HEM - 6):
        paint(49, y, LINE)
    for i, y in enumerate(range(HEM - 7, HEM)):
        paint(CX - i - 2, y, LINE)
        paint(CX + i + 1, y, LINE)
    # bolsos com aba
    for x in range(33, 44):
        paint(x, 100, LINE)
        paint(x, 101, HI)
        paint(99 - x, 100, LINE)
        paint(99 - x, 101, MID)
    # costura do ombro e pregas da cintura
    for i in range(6):
        paint(36 - i, 46 + i // 3, MID)
        paint(63 + i, 46 + i // 3, SH)
    for y in range(74, 84):
        paint(35, y, MID)
        paint(64, y, SH)
    # bolso do peito (lado esquerdo dele = direita da tela)
    for x in range(57, 65):
        paint(x, 66, LINE)
    out['tone'] = t
    return out


def det_body():
    """Detalhes já coloridos: botões, lenço no bolso, brilho dos sapatos, sombra no chão."""
    img = np.zeros((H, W, 4), np.uint8)

    def px(x, y, c, a=255):
        img[y, x] = (*c, a)

    # sombra no chão (elipse escura translúcida sob os pés)
    ys, xs = np.mgrid[0:H, 0:W]
    e = ((xs + 0.5 - CX) / 26) ** 2 + ((ys + 0.5 - 197) / 3.2) ** 2 <= 1
    img[e] = (0, 0, 0, 90)
    for y in (90, 102):
        px(49, y, (30, 30, 38))
        px(50, y, (30, 30, 38))
        px(49, y - 1, (90, 96, 120))
        px(50, y - 1, (60, 64, 80))
    # lenço no bolso do peito
    for x, y in ((58, 64), (59, 63), (60, 64), (61, 63), (62, 64), (59, 65), (60, 65), (61, 65), (58, 65), (62, 65)):
        px(x, y, (244, 241, 232))
    px(61, 63, (242, 107, 29))
    # brilho dos sapatos
    for x in (37, 38, 39):
        px(x, 190, (120, 124, 140))
        px(99 - x, 190, (90, 94, 108))
    return img


# ------------------------------------------------------------------ mãos (sprites)

# o = contorno, h = luz, b = base, s = sombra, d = vinco
HAND_REST = [  # pendurada, vista de frente/lado (esquerda da tela), dedos para baixo
    '.oooo..',
    'ohbbbo.',
    'ohbbbso',
    'ohbbbso',
    'ohbbsso',
    'ohbdbso',
    '.ohbbo.',
    '.obsso.',
    '..ooo..',
]
HAND_CLAP = [  # mão em pé, palma virada para o centro (direita), dedos para cima
    '..ooo..',
    '.ohbbo.',
    '.ohbbso',
    'ohbbbso',
    'ohbbbso',
    'ohbbbso',
    'ohbbsbo',
    'ohbbbbo',
    '.ohbbo.',
    '.obbso.',
]
HAND_OPEN = [  # mão aberta mostrando a palma (apresentando), dedos para cima
    '..o.o.o..',
    '.ohohoho.',
    '.ohbhbbo.',
    '.ohbbbbo.',
    'o.ohbbbbo',
    'ohohbbbbo',
    'ohhbbbbso',
    '.ohbbdbso',
    '..ohbbbo.',
    '..obbsso.',
    '...oooo..',
]
HAND_GRIP = [  # punho fechado por cima da jersey (dedos dobrados para a frente)
    '.oooooo.',
    'ohbbbbbo',
    'ohbbbbso',
    'odbdbdbo',
    'ohbbbbso',
    '.obsbso.',
    '..oooo..',
]
TONE = {'o': LINE, 'h': HI, 'b': BASE, 's': MID, 'd': SH}


def stamp_sprite(sprite, x0, y0, flip=False):
    m = blank()
    t = np.zeros((H, W), np.int32)
    for j, row in enumerate(sprite):
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            x = x0 + (len(row) - 1 - i if flip else i)
            y = y0 + j
            if 0 <= x < W and 0 <= y < H:
                m[y, x] = True
                t[y, x] = TONE[ch]
    return m, t


# ------------------------------------------------------------------ braços (poses)

SHOULDER = (29.5, 52.5)


def mx(p, side):
    return (100 - p[0], p[1]) if side else p


def arm_parts(elbow, wrist, side=0, r_up=4.8, r_fore=4.1):
    """Manga (braço + antebraço) e o punho branco da camisa; pontos dados no lado esquerdo da tela."""
    sh, el, wr = mx(SHOULDER, side), mx(elbow, side), mx(wrist, side)
    mu, uu = capsule(sh, el, r_up, r_up - 0.4)
    mf, uf = capsule(el, wr, r_fore, r_fore - 0.6)
    dx, dy = wr[0] - el[0], wr[1] - el[1]
    L = math.hypot(dx, dy)
    c0 = (wr[0] - dx / L * 1.6, wr[1] - dy / L * 1.6)
    mc, uc = capsule(c0, (wr[0] + dx / L * 0.4, wr[1] + dy / L * 0.4), r_fore - 0.9)
    return [('up', 'sleeve', mu, tone_from_u(uu)), ('fore', 'sleeve', mf, tone_from_u(uf)), ('cuff', 'cuff', mc, np.where(uc < 0, 252, 214))]


def hand(sprite, x0, y0, side):
    """Sprite de mão com o canto em (x0, y0) do lado esquerdo; do lado direito vai espelhado."""
    if side:
        x0 = 99 - x0 - (len(sprite[0]) - 1)
    return stamp_sprite(sprite, x0, y0, flip=bool(side))


def pose_side(name, side):
    if name == 'rest' or (name == 'gest' and side == 0):
        return arm_parts((27.5, 84), (28.5, 112), side), hand(HAND_REST, 25, 112, side)
    if name == 'gest':
        return arm_parts((19.5, 74), (17, 55), side), hand(HAND_OPEN, 12, 44, side)
    if name == 'hold':
        return arm_parts((26, 82), (33, 65), side), hand(HAND_GRIP, 29, 56, side)
    if name.startswith('clap'):
        k = int(name[4:])
        d = [12, 8.5, 5, 2, 0][k]  # distância de cada mão ao centro
        ex = 27 + (12 - d) * 0.25
        wrist = (CX - 4 - d, 72 - (12 - d) * 0.15)
        return arm_parts((ex, 84), wrist, side), hand(HAND_CLAP, int(round(wrist[0] - 3)), int(round(wrist[1])) - 10, side)
    raise ValueError(name)


def render_pose(name):
    s = Scene()
    for side in (0, 1):
        arm, (hm, ht) = pose_side(name, side)
        g = f'arm{side}'
        straight = name == 'rest' or (name == 'gest' and side == 0)
        for n, mt, m, t in arm:
            grp = f'{g}_fore' if n == 'cuff' else f'{g}_{n}'
            if straight and n != 'cuff':
                grp = f'{g}_up'  # braço reto: sem linha no cotovelo
            s.add(f'{g}_{n}', mt, m, t, group=grp)
        s.add(f'{g}_hand', 'skin', hm, ht, group=f'{g}_hand')
    return s


# ------------------------------------------------------------------ jersey segurada


def jersey_scene():
    s = Scene()
    pts = [
        (34, 59), (43, 58), (46, 61), (50, 63),  # ombro → gola
        (53, 61), (56, 58), (65, 59),  # gola → ombro
        (71, 64), (73, 74), (67, 76), (65, 72),  # manga direita (caída)
        (65, 113), (58, 115), (50, 114), (41, 115), (34, 113),  # barra
        (34, 72), (32, 76), (26, 74), (28, 64),  # manga esquerda
    ]
    m = poly(pts)
    t = tone_rows(m, 0.08, 0.76, 0.9)
    # dobras do pano saindo das mãos (caindo em direção ao centro)
    for (x0, y0, x1, y1) in ((37, 64, 41, 110), (62, 64, 58, 110)):
        n = y1 - y0
        for i in range(n):
            x = round(x0 + (x1 - x0) * i / n)
            y = y0 + i
            if m[y, x]:
                t[y, x] = min(t[y, x], MID)
            if m[y, x + 1] and x0 < 50:
                t[y, x + 1] = max(t[y, x + 1], HI - 10)
    s.add('jersey', 'jersey', m, t, group='jersey')
    # gola (faixa em V/redonda) e faixas das mangas
    trim = blank()
    for x in range(42, 58):
        yy = 57 + round(6 * (1 - abs(x - 49.5) / 8)) if 44 <= x <= 55 else 58
        trim[yy - 1:yy + 1, x] = True
    sl = poly([(26, 71), (32, 73), (32, 74), (26, 72)])
    trim |= sl | mirror(sl)
    trim &= m | dil(m)
    tt = np.full((H, W), BASE, np.int32)
    s.add('jtrim', 'jtrim', trim, tt, group='jersey')
    return s


# ------------------------------------------------------------------ saída


def save_layer(out, mat, name, only_mine=False):
    sel = out['mat'] == mat
    if only_mine:
        sel &= out['mine']
    img = np.zeros((H, W, 4), np.uint8)
    v = np.clip(out['tone'], 0, 255).astype(np.uint8)
    img[sel, 0] = v[sel]
    img[sel, 1] = v[sel]
    img[sel, 2] = v[sel]
    img[sel, 3] = 255
    line = sel & (out['tone'] == LINE)
    img[line] = (13, 13, 18, 255)
    up(img).save(OUT / f'{name}.png')
    return img


def up(img):
    return Image.fromarray(img, 'RGBA').resize((W * 2, H * 2), Image.NEAREST)


def overlay_scene(base_out, scene):
    """Renderiza `scene` por cima de um resultado (contorno seletivo contra o que está embaixo)."""
    b = {k: v.copy() for k, v in base_out.items()}
    b['mine'] = np.zeros((H, W), bool)
    return scene.render(base=b)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    names = []
    body = body_scene()
    for mat in ('trou', 'shoes', 'shirt', 'tie', 'jacket'):
        save_layer(body, mat, f's2_{mat}')
        names.append(f's2_{mat}')
    up(det_body()).save(OUT / 's2_det.png')
    names.append('s2_det')
    poses = ['rest', 'gest', 'hold'] + [f'clap{k}' for k in range(5)]
    arms_out = {}
    for p in poses:
        o = overlay_scene(body, render_pose(p))
        arms_out[p] = o
        for mat, suf in (('sleeve', 'sleeve'), ('skin', 'skin'), ('cuff', 'cuff')):
            save_layer(o, mat, f's2_{p}_{suf}', only_mine=True)
            names.append(f's2_{p}_{suf}')
        # contorno das mangas desenhado sobre o paletó fica na camada da manga
    # Jersey por cima dos braços do 'hold' (as mãos voltam por cima no jogo)
    jo = overlay_scene(arms_out['hold'], jersey_scene())
    for mat in ('jersey', 'jtrim'):
        save_layer(jo, mat, f's2_{mat}', only_mine=True)
        names.append(f's2_{mat}')
    # Manifesto: troca as camadas antigas do terno pelas novas
    mf = ROOT / 'public' / 'assets' / 'manifest.json'
    data = json.loads(mf.read_text(encoding='utf-8'))
    data['draft_suit'] = sorted(names)
    mf.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('camadas:', len(names))


if __name__ == '__main__':
    main()
