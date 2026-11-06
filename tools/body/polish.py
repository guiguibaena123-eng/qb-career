"""Polimento do corpo do atleta (pixel art) — gera public/assets/layers a partir de tools/body/layers_src.

Todas as camadas do PlayerBody (pele, uniforme, acessórios) dividem a mesma grade 100×200 (salvas a 2×).
Aqui cada ajuste de forma é calculado UMA vez por linha (a partir da silhueta de todas as camadas) e
aplicado igualzinho em todas, então tudo continua encaixando:

  1. cintura mais fina que os ombros (formato em V)
  2. braços levemente abertos (postura de atleta, não "soldadinho")
  3. bíceps
  4. base: pernas um pouco afastadas
  5. panturrilhas (antes eram canos retos)
  6. volume: luz da esquerda (borda clara) e sombra da direita em faixas — estilo pixel art,
     sem degradê — em cada parte do corpo (braço, ombreira, tronco, coxa, perna)

Uso: python tools/body/polish.py
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools' / 'body' / 'layers_src'
OUT = ROOT / 'public' / 'assets' / 'layers'
OUTLINE = 40  # tons abaixo disso são o contorno

# camadas que não mudam: cabeça/capacete/rosto (o rosto em sprite é posicionado por coordenada) e sombra
KEEP = ('shadow', 'face', 'helmet_', 'hstripe_', 'decal_', 'hdet', 'hgloss', 'visor', 'mask_', 'chin_', 'eyeblack_', 'beard_', 'hair_', 'mouth_')
# volume (sombra/luz) só no que é corpo e roupa
NO_SHADE = KEEP + ('pads', 'nroll_')

layers = {}
small = {}
for f in sorted(SRC.glob('*.png')):
    a = np.array(Image.open(f).convert('RGBA'))
    if a.shape[:2] == (400, 200):
        layers[f.stem] = a[::2, ::2].copy()
    else:
        small[f.stem] = a
H, W = 200, 100
moving = [n for n in layers if not n.startswith(KEEP)]


def union():
    m = np.zeros((H, W), bool)
    for n in moving:
        if not n.startswith('towel_'):
            m |= layers[n][..., 3] > 0
    return m


def runs(row):
    r, x = [], 0
    while x < W:
        if row[x]:
            a = x
            while x < W and row[x]:
                x += 1
            r.append((a, x - 1))
        else:
            x += 1
    return r


def apply_row(y, idx):
    """idx[x_destino] = x_origem (ou -1 = vazio), igual para todas as camadas."""
    for n in moving:
        a = layers[n]
        src = a[y].copy()
        out = np.zeros_like(src)
        ok = idx >= 0
        out[ok] = src[idx[ok]]
        a[y] = out


def ident():
    return np.arange(W)


def shift_cols(idx, a, b, s):
    """Move as colunas [a,b] em s (negativo = esquerda); o que sobra vira vazio."""
    new = idx.copy()
    lo, hi = (b + s + 1, b) if s < 0 else (a, a + s - 1)
    if s:
        new[max(0, lo):min(W, hi + 1)] = -1
    for x in range(a, b + 1):
        if 0 <= x + s < W:
            new[x + s] = idx[x]
    return new


def widen(idx, a, b, side, k):
    """Engorda o trecho [a,b] em k pixels para um lado, duplicando a coluna do meio (contorno intacto)."""
    m = (a + b) // 2
    new = idx.copy()
    if side < 0:
        for x in range(a - k, m - k + 1):
            new[x] = idx[x + k]
        for x in range(m - k + 1, m + 1):
            new[x] = idx[m]
    else:
        for x in range(b + k, m + k - 1, -1):
            new[x] = idx[x - k]
        for x in range(m, m + k):
            new[x] = idx[m]
    return new


def narrow(idx, a, b):
    """Afina o trecho [a,b] em 1 pixel de cada lado (contorno vem junto para dentro)."""
    m = (a + b) // 2
    new = idx.copy()
    new[a] = -1
    new[b] = -1
    for x in range(a + 1, m + 1):
        new[x] = idx[x - 1]
    for x in range(m + 1, b):
        new[x] = idx[x + 1]
    return new


# 1. cintura (tronco central fica 1 px mais estreito de cada lado na cintura e no quadril)
u = union()
for y in range(74, 89):
    rs = runs(u[y])
    c = [r for r in rs if r[0] <= 50 <= r[1]]
    if c:
        apply_row(y, narrow(ident(), *c[0]))

# 2. braços abertos: o braço desce em leve diagonal para fora (degrau no meio do antebraço e no punho)
u = union()
for y in range(71, 113):
    rs = runs(u[y])
    if len(rs) < 3:
        continue
    s = 0 if y < 81 else 1 if y < 90 else 2
    idx = ident()
    la, lb = rs[0]
    ra, rb = rs[-1]
    if lb < 40:
        idx = shift_cols(idx, la, lb, -s)
    if ra > 60:
        idx = shift_cols(idx, ra, rb, s)
    apply_row(y, idx)

# 3. bíceps (+1 px para fora no braço)
u = union()
for y in range(71, 78):
    rs = runs(u[y])
    if len(rs) < 3:
        continue
    idx = ident()
    if rs[0][1] < 40:
        idx = widen(idx, *rs[0], -1, 1)
    if rs[-1][0] > 60:
        idx = widen(idx, *rs[-1], 1, 1)
    apply_row(y, idx)

# 4. base: as pernas se afastam um pouco a partir do joelho
u = union()
for y in range(113, H):
    rs = runs(u[y])
    t = 0 if y < 133 else 1 if y < 169 else 2
    if not t:
        continue
    idx = ident()
    left = [r for r in rs if r[1] <= 50]
    right = [r for r in rs if r[0] >= 51]
    if left:
        idx = shift_cols(idx, left[0][0], left[-1][1], -t)
    if right:
        idx = shift_cols(idx, right[0][0], right[-1][1], t)
    apply_row(y, idx)

# 5. panturrilhas: +1 px para fora (136–152) e +1 para dentro no meio (139–149)
u = union()
for y in range(136, 153):
    rs = [r for r in runs(u[y]) if r[1] - r[0] >= 6]
    if len(rs) != 2:
        continue
    (la, lb), (ra, rb) = rs
    idx = widen(ident(), la, lb, -1, 1)
    idx = widen(idx, ra, rb, 1, 1)
    apply_row(y, idx)
u = union()
for y in range(139, 150):
    rs = [r for r in runs(u[y]) if r[1] - r[0] >= 6]
    if len(rs) != 2:
        continue
    (la, lb), (ra, rb) = rs
    idx = widen(ident(), la, lb, 1, 1)
    idx = widen(idx, ra, rb, -1, 1)
    apply_row(y, idx)

# 6. volume. Mapa de faixas a partir da roupa padrão empilhada (o tom de cima em cada pixel)
REF = ['skin', 'under_long', 'pants_reg', 'sock_high', 'cleat_mid', 'jersey_short', 'yoke', 'sleeve_2', 'collar_v', 'glove_short', 'wrist_R']
top = np.zeros((H, W), np.int16) - 1  # -1 vazio, 0 contorno, 1 preenchimento
for n in REF:
    a = layers[n]
    on = a[..., 3] > 0
    top[on] = np.where(a[..., 0][on] < OUTLINE, 0, 1)


def band_map(fill):
    f = np.ones((H, W), np.float32)
    for y in range(42, H):
        for a, b in runs(fill[y]):
            w = b - a + 1
            if w < 3:
                continue
            for x in range(a, b + 1):
                t = (x - a + 0.5) / w
                if w >= 4 and t < 0.2:
                    f[y, x] = 1.13  # borda acesa (luz da esquerda)
                elif t > 0.82:
                    f[y, x] = 0.68  # sombra própria
                elif t > 0.6:
                    f[y, x] = 0.84  # meia-sombra
    # brilho no alto de cada parte: 1ª e 2ª linha abaixo do contorno de cima (ombreiras, coxas, joelho)
    for x in range(W):
        col = fill[:, x]
        for y in range(43, H):
            if col[y] and not col[y - 1]:
                f[y, x] = max(f[y, x], 1.13) if f[y, x] >= 1 else f[y, x] * 1.12
    return f


ref_bands = band_map(top == 1)
for n, a in layers.items():
    if n.startswith(NO_SHADE):
        continue
    fill = (a[..., 3] > 0) & (a[..., 0] >= OUTLINE)
    own = band_map(fill)
    f = np.where(top == 1, ref_bands, own)
    g = a[..., :3].astype(np.float32)
    g[fill] = np.clip(g[fill] * f[fill][:, None], 0, 255)
    a[..., :3] = np.round(g).astype(np.uint8)

OUT.mkdir(parents=True, exist_ok=True)
for n, a in layers.items():
    Image.fromarray(a.repeat(2, 0).repeat(2, 1)).save(OUT / f'{n}.png', optimize=True)
for n, a in small.items():
    Image.fromarray(a).save(OUT / f'{n}.png', optimize=True)
print('camadas geradas:', len(layers) + len(small))
