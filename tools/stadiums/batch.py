# Gera as ilustrações dos estádios: as fotos originais (Wikimedia Commons, domínio público/CC0, lista em
# selected.json) são baixadas com getorig.py para orig/ (fora do repositório) e convertidas por toon.py.
# Antes de desenhar, nomes e logos de marcas (patrocinadores, nomes no telhado, painéis, escritas no
# gramado) são APAGADOS — a superfície é reconstruída, nunca coberta por tarja:
#  'text'   = acha só os traços de letras/logos (mais claros, mais escuros ou de outra cor que o fundo, até
#             `ks` px de espessura em 2560) e refaz esses pixels a partir da superfície em volta;
#  'erase'  = refaz a área inteira com o que está em volta (logo pequeno colado na parede/estrutura);
#  'clone'  = carimbo: copia um trecho vizinho da mesma superfície (deslocado dx, dy), bordas esfumadas;
#  'screen' = telão/placar desligado (tela escura e lisa, com o tom escuro da própria tela);
#  'wall'   = banner pendurado retirado: a área volta a ser a parede, na cor dela (ponto de amostra sx, sy);
#  'glow'   = painel de LED aceso sem conteúdo (só a luz, difusa);
#  'tbright'/'tdark' = como 'text', mas só letras claras (ou escuras) — fundo cheio de detalhe fica intacto;
#  'vline'  = redesenha um poste vertical (trave) que passava pela área refeita.
# BLANK: posições em fração do quadro JÁ RECORTADO; BLANKO: em fração da foto ORIGINAL (convertidas aqui).
import json, sys, os
import cv2
import numpy as np
from PIL import Image
from concurrent.futures import ProcessPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from toon import toon, crop, to_work

OUT = os.environ.get('STAD_OUT', r'C:/Users/HP/Desktop/Meus Trabalhos com Claude/qb-career/public/assets/stadiums')
crops = json.load(open('crops.json'))

BLANK = {
    'baltimore': [(0.0, 0.283, 0.215, 0.388, 'screen'), (0.68, 0.64, 0.80, 0.89, 'text', 41), (0.20, 0.55, 0.33, 0.60, 'text', 41),
                  (0.40, 0.59, 0.50, 0.65, 'text', 41), (0.10, 0.555, 0.155, 0.59, 'text', 31),
                  (0.77, 0.65, 0.82, 0.70, 'text', 31)],
    'buffalo': [(0.33, 0.42, 0.54, 0.63, 'clone', 0.22, 0.0)],
    'chicago': [(0.519, 0.645, 0.599, 0.719, 'screen'), (0.375, 0.948, 0.432, 0.972, 'text', 25)],
    'cincinnati': [(0.69, 0.625, 0.79, 0.72, 'text', 31)],
    'cleveland': [(0.18, 0.42, 0.34, 0.485, 'text', 31)],
    'dallas': [(0.375, 0.481, 0.55, 0.504, 'text', 21)],
    'detroit': [(0.548, 0.372, 0.663, 0.462, 'text', 75), (0.452, 0.322, 0.535, 0.367, 'text', 41), (0.418, 0.370, 0.457, 0.410, 'text', 31)],
    'foxborough': [(0.44, 0.30, 0.62, 0.42, 'text', 41)],
    'green-bay': [(0.13, 0.33, 0.325, 0.377, 'wall', 0.22, 0.30), (0.163, 0.377, 0.302, 0.492, 'screen'), (0.133, 0.395, 0.163, 0.47, 'screen'),
                  (0.302, 0.395, 0.332, 0.47, 'screen'), (0.133, 0.468, 0.165, 0.492, 'text', 25), (0.302, 0.462, 0.335, 0.492, 'text', 25),
                  (0.2675, 0.33, 0.2675, 0.50, 'vline', 13)],
    'houston': [(0.36, 0.53, 0.47, 0.605, 'tbright', 41), (0.36, 0.605, 0.48, 0.69, 'clone', 0.0, 0.085), (0.755, 0.535, 0.875, 0.645, 'clone', -0.125, 0.0),
                (0.524, 0.675, 0.551, 0.805, 'wall', 0.515, 0.75), (0.81, 0.675, 0.85, 0.70, 'text', 21)],
    'indianapolis': [(0.47, 0.43, 0.62, 0.55, 'text', 31), (0.29, 0.575, 0.37, 0.64, 'text', 41), (0.70, 0.635, 0.765, 0.71, 'text', 41)],
    'kansas-city': [(0.18, 0.45, 0.27, 0.52, 'text', 31), (0.17, 0.062, 0.22, 0.092, 'text', 25), (0.283, 0.343, 0.317, 0.362, 'text', 21),
                    (0.423, 0.352, 0.452, 0.372, 'text', 21)],
    'minneapolis': [(0.595, 0.43, 0.637, 0.462, 'text', 25)],
    'nashville': [(0.70, 0.415, 0.737, 0.478, 'text', 31), (0.166, 0.512, 0.212, 0.578, 'wall', 0.222, 0.545), (0.081, 0.553, 0.121, 0.676, 'wall', 0.105, 0.547),
                  (0.152, 0.553, 0.168, 0.60, 'wall', 0.16, 0.65), (0.204, 0.548, 0.217, 0.592, 'wall', 0.222, 0.57),
                  (0.81, 0.525, 0.855, 0.605, 'text', 31)],
    'new-orleans': [(0.20, 0.57, 0.82, 0.722, 'text', 51), (0.0, 0.55, 0.05, 0.62, 'text', 21)],
    'new-york': [(0.36, 0.12, 0.49, 0.20, 'tbright', 41), (0.52, 0.36, 0.73, 0.48, 'clone', -0.22, 0.0), (0.553, 0.133, 0.702, 0.228, 'screen'),
                 (0.183, 0.212, 0.303, 0.29, 'screen'), (0.855, 0.065, 0.915, 0.145, 'text', 31), 
                 (0.28, 0.76, 0.355, 0.812, 'text', 41), (0.902, 0.582, 0.972, 0.662, 'wall', 0.875, 0.66), (0.11, 0.02, 0.20, 0.095, 'text', 25),
                 (0.10, 0.82, 0.135, 0.935, 'screen'), (0.40, 0.83, 0.425, 0.935, 'screen'),
                 (0.91, 0.705, 0.95, 0.835, 'screen')],
    'phoenix': [(0.39, 0.43, 0.48, 0.64, 'text', 41), (0.445, 0.715, 0.515, 0.775, 'text', 31), (0.615, 0.585, 0.745, 0.695, 'text', 61),
                (0.555, 0.785, 0.595, 0.835, 'erase'), (0.035, 0.765, 0.105, 0.885, 'text', 41)],
    'san-francisco': [(0.48, 0.93, 0.62, 1.0, 'erase'), (0.75, 0.965, 0.98, 1.0, 'erase'), (0.415, 0.543, 0.855, 0.573, 'tbright', 25),
                      (0.445, 0.515, 0.535, 0.545, 'text', 21), (0.76, 0.515, 0.80, 0.54, 'text', 21), (0.59, 0.752, 0.70, 0.772, 'text', 21),
                      (0.205, 0.775, 0.265, 0.795, 'text', 21)],
    'washington': [],
}
# posições em fração da foto original (fotos novas)
BLANKO = {
    'los-angeles': [(0.45, 0.393, 0.645, 0.433, 'text', 41), (0.212, 0.742, 0.315, 0.79, 'erase'), (0.393, 0.642, 0.468, 0.684, 'erase')],
    'tampa': [(0.285, 0.524, 0.341, 0.64, 'clone', -0.06, 0.0), (0.42, 0.636, 0.498, 0.757, 'clone', -0.08, 0.0),
              (0.707, 0.617, 0.792, 0.69, 'clone', -0.082, 0.0), (0.635, 0.452, 0.664, 0.508, 'erase'), (0.689, 0.448, 0.765, 0.537, 'screen'),
              (0.337, 0.62, 0.402, 0.67, 'tbright', 31), (0.20, 0.52, 0.272, 0.536, 'text', 21), (0.29, 0.517, 0.332, 0.552, 'text', 21),
              (0.575, 0.606, 0.607, 0.627, 'text', 21), (0.788, 0.645, 0.812, 0.692, 'erase'), (0.403, 0.613, 0.427, 0.637, 'erase')],
    'washington': [(0.255, 0.163, 0.30, 0.197, 'text', 31), (0.10, 0.253, 0.14, 0.287, 'text', 31), (0.595, 0.141, 0.65, 0.167, 'text', 31),
                   (0.915, 0.263, 0.957, 0.302, 'text', 31), (0.855, 0.70, 0.93, 0.79, 'text', 61), (0.648, 0.343, 0.69, 0.39, 'screen'),
                   (0.783, 0.385, 0.822, 0.447, 'screen'), (0.575, 0.505, 0.695, 0.577, 'text', 41), (0.495, 0.615, 0.535, 0.652, 'text', 41),
                   (0.545, 0.493, 0.577, 0.517, 'text', 31), (0.69, 0.548, 0.712, 0.572, 'text', 31), (0.185, 0.79, 0.215, 0.842, 'erase'),
                   (0.27, 0.785, 0.29, 0.822, 'erase')],
    'jacksonville': [(0.673, 0.362, 0.707, 0.404, 'wall', 0.69, 0.34), (0.65, 0.40, 0.742, 0.472, 'tdark', 61), (0.14, 0.418, 0.24, 0.442, 'tdark', 21)],
    'charlotte': [(0.30, 0.465, 0.46, 0.555, 'text', 41), (0.345, 0.413, 0.402, 0.47, 'erase'), (0.66, 0.438, 0.727, 0.464, 'text', 25),
                  (0.618, 0.45, 0.639, 0.479, 'text', 25), (0.746, 0.45, 0.765, 0.479, 'text', 25), (0.288, 0.4, 0.327, 0.42, 'text', 21),
                  (0.757, 0.302, 0.832, 0.332, 'text', 21), (0.63, 0.503, 0.82, 0.532, 'text', 21)],
    'pittsburgh': [(0.30, 0.462, 0.347, 0.522, 'erase'), (0.20, 0.533, 0.262, 0.557, 'text', 21)],
    'seattle': [],
    'philadelphia': [(0.168, 0.296, 0.366, 0.364, 'screen'), (0.09, 0.305, 0.15, 0.322, 'text', 21)],
    'denver': [],
    'miami': [(0.045, 0.452, 0.205, 0.503, 'text', 61), (0.685, 0.462, 0.845, 0.508, 'text', 61), (0.418, 0.442, 0.492, 0.503, 'erase'),
              (0.383, 0.572, 0.472, 0.648, 'clone', -0.10, 0.0), (0.245, 0.70, 0.605, 0.748, 'text', 41), (0.655, 0.572, 0.825, 0.672, 'text', 41),
              (0.395, 0.815, 0.435, 0.832, 'text', 21), (0.03, 0.882, 0.10, 0.906, 'text', 21)],
    'las-vegas': [(0.297, 0.605, 0.345, 0.668, 'tbright', 41), (0.338, 0.636, 0.42, 0.70, 'tbright', 41), (0.42, 0.666, 0.59, 0.718, 'tbright', 41),
                  (0.365, 0.628, 0.412, 0.672, 'text', 41), (0.43, 0.493, 0.50, 0.522, 'tbright', 31), (0.50, 0.482, 0.58, 0.52, 'tbright', 31),
                  (0.58, 0.488, 0.648, 0.527, 'tbright', 31), (0.355, 0.722, 0.457, 0.772, 'tbright', 31), (0.32, 0.738, 0.53, 0.83, 'screen'),
                  (0.683, 0.698, 0.717, 0.762, 'glow'), (0.693, 0.815, 0.727, 0.838, 'erase')],
}


def crop_box(img, r, cx, cy, zoom):
    h, w = img.shape[:2]
    cw, ch = (h * r, h) if w / h > r else (w, w / r)
    cw, ch = cw / zoom, ch / zoom
    x0 = int(np.clip(cx * w - cw / 2, 0, w - cw)); y0 = int(np.clip(cy * h - ch / 2, 0, h - ch))
    return x0 / w, y0 / h, int(cw) / w, int(ch) / h


def to_crop(reg, box):
    """Converte uma região em fração da foto original para fração do quadro recortado."""
    bx, by, bw, bh = box
    fx = lambda v: (v - bx) / bw
    fy = lambda v: (v - by) / bh
    x0, y0, x1, y1, mode = reg[:5]
    out = [fx(x0), fy(y0), fx(x1), fy(y1), mode]
    rest = list(reg[5:])
    if mode == 'wall':
        rest = [fx(rest[0]), fy(rest[1])]
    elif mode == 'clone':
        rest = [rest[0] / bw, rest[1] / bh]
    return tuple(out + rest)


def clean(img, regions):
    h, w = img.shape[:2]
    for reg in regions:
        x0, y0, x1, y1, mode = reg[:5]
        x0, y0, x1, y1 = max(0, x0), max(0, y0), min(1, x1), min(1, y1)
        if x1 < x0 or y1 < y0:
            continue
        X0, Y0, X1, Y1 = int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)
        pad = max(8, w // 160)
        A0, B0, A1, B1 = max(0, X0 - pad), max(0, Y0 - pad), min(w, X1 + pad), min(h, Y1 + pad)
        big = img[B0:B1, A0:A1].copy()
        inside = np.zeros(big.shape[:2], np.uint8)
        inside[Y0 - B0:Y1 - B0, X0 - A0:X1 - A0] = 1
        if mode == 'vline':
            t = int(reg[5]); yb = min(h - 1, Y1 + int(0.03 * h))
            col = np.median(img[yb:yb + 12, max(0, X0 - 2):X0 + 3].reshape(-1, 3), 0)
            cv2.line(img, (X0, Y0), (X0, Y1 + 4), tuple(int(v) for v in col), t, cv2.LINE_AA)
            continue
        if mode == 'clone':
            dx, dy = int(reg[5] * w), int(reg[6] * h)
            src = img[B0 + dy:B1 + dy, A0 + dx:A1 + dx]
            if src.shape == big.shape:
                a = cv2.GaussianBlur(inside.astype(np.float32), (0, 0), max(3, pad * 0.6))
                a = np.clip(a * 1.6, 0, 1)[..., None]
                big = (src.astype(np.float32) * a + big.astype(np.float32) * (1 - a)).astype(np.uint8)
            img[B0:B1, A0:A1] = big
            continue
        if mode in ('screen', 'wall', 'glow'):
            reg_px = img[Y0:Y1, X0:X1].reshape(-1, 3).astype(np.float32)
            if mode == 'screen':
                # tela desligada: tom dos pixels mais escuros do próprio painel, com leve degradê vertical
                lum = reg_px.mean(1)
                col = np.median(reg_px[lum <= np.percentile(lum, 20)], 0)
                col = np.minimum(col, 70)
                ys = np.linspace(1.08, 0.9, Y1 - Y0)[:, None, None]
                img[Y0:Y1, X0:X1] = np.clip(col[None, None] * ys, 0, 255).astype(np.uint8)
            elif mode == 'wall':
                sx, sy = int(reg[5] * w), int(reg[6] * h)
                col = np.median(img[max(0, sy - 6):sy + 7, max(0, sx - 6):sx + 7].reshape(-1, 3), 0)
                fill = np.full((Y1 - Y0, X1 - X0, 3), col, np.float32)
                # mantém a luz baixa da área (sombra/claridade da parede), sem o desenho do banner
                Lr = cv2.GaussianBlur(cv2.cvtColor(img[Y0:Y1, X0:X1], cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), max(8, (X1 - X0) / 3))
                g = 1 + 0.12 * (Lr / max(1, Lr.mean()) - 1)
                img[Y0:Y1, X0:X1] = np.clip(fill * g[..., None], 0, 255).astype(np.uint8)
            else:
                sig = min(X1 - X0, Y1 - Y0) / 5
                a = img[B0:B1, A0:A1].astype(np.float32)
                bl = cv2.GaussianBlur(a, (0, 0), sig)
                m = inside.astype(np.float32)[..., None]
                img[B0:B1, A0:A1] = (bl * m + a * (1 - m)).astype(np.uint8)
            # borda suave entre o painel refeito e o resto
            continue
        if mode == 'erase':
            m = inside
            small = cv2.resize(big, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
            ms = cv2.resize(m, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
            fill = cv2.resize(cv2.inpaint(small, ms, 5, cv2.INPAINT_TELEA), (big.shape[1], big.shape[0]), interpolation=cv2.INTER_CUBIC)
            big[m > 0] = fill[m > 0]
        elif mode in ('tbright', 'tdark'):
            # letras claras (escuras) do tamanho de até ks px: troca só esses pixels pelo fundo local, obtido
            # por abertura (fechamento) morfológica — estruturas maiores que as letras ficam intactas, sem borrão
            ks = reg[5] if len(reg) > 5 else 41
            ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ks, ks))
            op = cv2.MORPH_OPEN if mode == 'tbright' else cv2.MORPH_CLOSE
            bg = np.dstack([cv2.morphologyEx(big[..., c], op, ker) for c in range(3)])
            L = cv2.cvtColor(big, cv2.COLOR_BGR2LAB)[..., 0].astype(np.int16)
            Lb = cv2.cvtColor(bg, cv2.COLOR_BGR2LAB)[..., 0].astype(np.int16)
            d = (L - Lb) if mode == 'tbright' else (Lb - L)
            m = ((d > 32).astype(np.uint8) * inside)
            m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))).astype(np.float32)
            m = cv2.GaussianBlur(m, (0, 0), 1.5)[..., None]
            bg = cv2.GaussianBlur(bg, (0, 0), 2)
            big = (bg.astype(np.float32) * m + big.astype(np.float32) * (1 - m)).astype(np.uint8)
        else:
            ks = reg[5] if len(reg) > 5 else 41
            L = cv2.cvtColor(big, cv2.COLOR_BGR2LAB)[..., 0]
            ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ks, ks))
            th = cv2.morphologyEx(L, cv2.MORPH_TOPHAT, ker)
            bh = cv2.morphologyEx(L, cv2.MORPH_BLACKHAT, ker)
            lab = cv2.cvtColor(big, cv2.COLOR_BGR2LAB).astype(np.float32)
            bgc = cv2.medianBlur(big, ks if ks % 2 else ks + 1)
            dc = np.sqrt(((lab[..., 1:] - cv2.cvtColor(bgc, cv2.COLOR_BGR2LAB).astype(np.float32)[..., 1:]) ** 2).sum(-1))
            m = ((th > 18) | (bh > 18) | (dc > 16)).astype(np.uint8) * inside
            m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
            big = cv2.inpaint(big, m, 9, cv2.INPAINT_TELEA)
        img[B0:B1, A0:A1] = big
    return img


def one(k):
    src = cv2.imread(f'orig/{k}.jpg')
    cp = tuple(crops.get(k, (0.5, 0.5, 1.0)))
    box = crop_box(src, 179 / 100, *cp)
    regs = list(BLANK.get(k, [])) + [to_crop(r, box) for r in BLANKO.get(k, [])]
    img = to_work(crop(src, 179 / 100, *cp))
    img = clean(np.ascontiguousarray(img), regs)
    cv2.imwrite(f'clean/{k}.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    res = toon(img, key=k)
    cv2.imwrite(f'out/{k}.png', res)
    Image.open(f'out/{k}.png').convert('RGB').save(f'{OUT}/{k}.webp', 'WEBP', quality=88, method=6)
    return k, os.path.getsize(f'{OUT}/{k}.webp') // 1024


if __name__ == '__main__':
    keys = sys.argv[1:] or sorted(json.load(open('selected.json', encoding='utf-8')))
    os.makedirs('out', exist_ok=True)
    os.makedirs('clean', exist_ok=True)
    with ProcessPoolExecutor(4) as ex:
        for k, kb in ex.map(one, keys):
            print(k, kb, 'KB', flush=True)
