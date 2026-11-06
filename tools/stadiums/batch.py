# Gera as ilustrações dos estádios: as fotos originais (Wikimedia Commons, domínio público/CC0, lista em
# selected.json) são baixadas com getorig.py para orig/ (fora do repositório) e convertidas por toon.py.
# Antes de desenhar, nomes e logos de marcas (patrocinadores, nomes no telhado, painéis, escritas no
# gramado) são apagados: posições em fração do quadro já recortado.
import json, sys, os
import cv2
import numpy as np
from PIL import Image
sys.path.insert(0, '.')
from toon import toon, crop, to_work
OUT = os.environ.get('STAD_OUT', r'C:/Users/HP/Desktop/Meus Trabalhos com Claude/qb-career/public/assets/stadiums')
crops = json.load(open('crops.json'))
keys = sys.argv[1:] or sorted(json.load(open('selected.json', encoding='utf-8')))
os.makedirs('out', exist_ok=True)
os.makedirs('clean', exist_ok=True)

# 'fill' = cobre o texto/logo com a cor do fundo em volta; 'panel' = vira uma placa lisa na cor dela
# Nomes e logos são APAGADOS (a superfície é reconstruída), nunca cobertos por tarja:
#  'text'  = acha só os traços de letras/logos (mais claros ou mais escuros que o fundo, até `ks` px de
#            espessura em 2560) e refaz esses pixels a partir da superfície em volta;
#  'erase' = refaz a área inteira com o que está em volta (logo grande colado na parede/estrutura).
# Posições em fração do quadro recortado; `ks` opcional.
BLANK = {
    'atlanta': [(0.0, 0.72, 0.045, 0.96, 'erase')],
    'baltimore': [(0.68, 0.64, 0.80, 0.89, 'text', 41), (0.0, 0.28, 0.19, 0.39, 'text', 41)],
    'buffalo': [(0.33, 0.42, 0.54, 0.63, 'clone', 0.22, 0.0)],
    'charlotte': [(0.42, 0.25, 0.66, 0.34, 'clone', -0.26, 0.0), (0.36, 0.44, 0.62, 0.57, 'clone', -0.21, 0.0)],
    'cleveland': [(0.18, 0.42, 0.34, 0.485, 'text', 31)],
    'dallas': [(0.40, 0.47, 0.64, 0.57, 'text', 31)],
    'denver': [(0.86, 0.89, 1.0, 1.0, 'erase')],
    'detroit': [(0.548, 0.372, 0.663, 0.462, 'text', 75), (0.452, 0.322, 0.535, 0.367, 'text', 41), (0.418, 0.370, 0.457, 0.410, 'text', 31)],
    'foxborough': [(0.44, 0.30, 0.62, 0.42, 'text', 41)],
    'green-bay': [(0.07, 0.29, 0.39, 0.52, 'erase'), (0.2665, 0.30, 0.2665, 0.52, 'vline', 9)],
    'houston': [(0.74, 0.53, 0.87, 0.62, 'erase')],
    'indianapolis': [(0.47, 0.43, 0.62, 0.55, 'text', 31)],
    'kansas-city': [(0.18, 0.45, 0.27, 0.52, 'text', 31)],
    'las-vegas': [(0.22, 0.93, 0.78, 1.0, 'erase')],
    'miami': [],
    'new-orleans': [(0.20, 0.57, 0.82, 0.722, 'text', 51)],
    'new-york': [(0.36, 0.12, 0.49, 0.20, 'text', 41), (0.52, 0.36, 0.73, 0.48, 'clone', -0.22, 0.0)],
    'philadelphia': [(0.64, 0.59, 0.74, 0.68, 'erase')],
    'phoenix': [(0.39, 0.43, 0.48, 0.64, 'text', 41)],
    'pittsburgh': [(0.44, 0.66, 0.69, 0.76, 'clone', -0.27, 0.0), (0.17, 0.68, 0.27, 0.81, 'text', 41), (0.81, 0.68, 0.92, 0.81, 'text', 41)],
    'san-francisco': [(0.48, 0.93, 0.62, 1.0, 'erase')],
    'seattle': [(0.34, 0.33, 0.82, 0.57, 'text', 35), (0.72, 0.80, 0.84, 0.87, 'erase')],
    'tampa': [(0.27, 0.51, 0.47, 0.64, 'erase'), (0.66, 0.84, 1.0, 1.0, 'text', 61), (0.0, 0.0, 0.06, 0.13, 'erase')],
    'washington': [(0.33, 0.45, 0.42, 0.53, 'erase'), (0.36, 0.53, 0.66, 0.66, 'erase'), (0.60, 0.42, 0.66, 0.55, 'erase'), (0.38, 0.0, 0.50, 0.06, 'text', 31), (0.76, 0.42, 0.84, 0.54, 'erase')],
}


def clean(img, regions):
    h, w = img.shape[:2]
    for reg in regions:
        x0, y0, x1, y1, mode = reg[:5]
        X0, Y0, X1, Y1 = int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)
        pad = max(8, w // 160)
        A0, B0, A1, B1 = max(0, X0 - pad), max(0, Y0 - pad), min(w, X1 + pad), min(h, Y1 + pad)
        big = img[B0:B1, A0:A1].copy()
        inside = np.zeros(big.shape[:2], np.uint8)
        inside[Y0 - B0:Y1 - B0, X0 - A0:X1 - A0] = 1
        if mode == 'vline':
            # redesenha um poste vertical (trave) que passava pela área apagada, com a cor dele mais abaixo
            t = int(reg[5]); yb = min(h - 1, Y1 + int(0.03 * h))
            col = np.median(img[yb:yb + 12, max(0, X0 - 2):X0 + 3].reshape(-1, 3), 0)
            cv2.line(img, (X0, Y0), (X0, Y1 + 4), tuple(int(v) for v in col), t, cv2.LINE_AA)
            continue
        if mode == 'clone':
            # carimbo: copia um trecho vizinho da mesma superfície (deslocado dx, dy) com bordas esfumadas
            dx, dy = int(reg[5] * w), int(reg[6] * h)
            src = img[B0 + dy:B1 + dy, A0 + dx:A1 + dx]
            if src.shape == big.shape:
                a = cv2.GaussianBlur(inside.astype(np.float32), (0, 0), max(3, pad * 0.6))
                a = np.clip(a * 1.6, 0, 1)[..., None]
                big = (src.astype(np.float32) * a + big.astype(np.float32) * (1 - a)).astype(np.uint8)
            img[B0:B1, A0:A1] = big
            continue
        if mode == 'erase':
            m = inside
            small = cv2.resize(big, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
            ms = cv2.resize(m, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
            fill = cv2.resize(cv2.inpaint(small, ms, 5, cv2.INPAINT_TELEA), (big.shape[1], big.shape[0]), interpolation=cv2.INTER_CUBIC)
            big[m > 0] = fill[m > 0]
        else:
            ks = reg[5] if len(reg) > 5 else 41
            L = cv2.cvtColor(big, cv2.COLOR_BGR2LAB)[..., 0]
            ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ks, ks))
            th = cv2.morphologyEx(L, cv2.MORPH_TOPHAT, ker)    # traços claros sobre fundo escuro
            bh = cv2.morphologyEx(L, cv2.MORPH_BLACKHAT, ker)  # traços escuros sobre fundo claro
            # cor também conta (logo vermelho sobre parede cinza)
            lab = cv2.cvtColor(big, cv2.COLOR_BGR2LAB).astype(np.float32)
            bgc = cv2.medianBlur(big, ks if ks % 2 else ks + 1)
            dc = np.sqrt(((lab[..., 1:] - cv2.cvtColor(bgc, cv2.COLOR_BGR2LAB).astype(np.float32)[..., 1:]) ** 2).sum(-1))
            m = ((th > 18) | (bh > 18) | (dc > 16)).astype(np.uint8) * inside
            m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
            big = cv2.inpaint(big, m, 9, cv2.INPAINT_TELEA)
        img[B0:B1, A0:A1] = big
    return img


for k in keys:
    img = to_work(crop(cv2.imread(f'orig/{k}.jpg'), 179 / 100, *tuple(crops.get(k, (0.5, 0.5, 1.0)))))
    img = clean(np.ascontiguousarray(img), BLANK.get(k, []))
    cv2.imwrite(f'clean/{k}.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 92])
    res = toon(img)
    cv2.imwrite(f'out/{k}.png', res)
    Image.open(f'out/{k}.png').convert('RGB').save(f'{OUT}/{k}.webp', 'WEBP', quality=86, method=6)
    print(k, os.path.getsize(f'{OUT}/{k}.webp') // 1024, 'KB', flush=True)
