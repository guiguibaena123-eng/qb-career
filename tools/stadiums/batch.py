# Gera as ilustrações dos estádios: as fotos originais (Wikimedia Commons, domínio público/CC0, lista em
# selected.json) são baixadas com getorig.py para orig/ (fora do repositório) e convertidas por toon.py.
# Antes de desenhar, nomes e logos de marcas (patrocinadores, nomes no telhado, painéis, escritas no
# gramado) são apagados: posições em fração do quadro já recortado.
import json, sys, os
import cv2
import numpy as np
from PIL import Image
sys.path.insert(0, '.')
from toon import toon, crop
OUT = os.environ.get('STAD_OUT', r'C:/Users/HP/Desktop/Meus Trabalhos com Claude/qb-career/public/assets/stadiums')
crops = json.load(open('crops.json'))
keys = sys.argv[1:] or sorted(json.load(open('selected.json', encoding='utf-8')))
os.makedirs('out', exist_ok=True)

# 'fill' = cobre o texto/logo com a cor do fundo em volta; 'panel' = vira uma placa lisa na cor dela
BLANK = {
    'atlanta': [(0.0, 0.72, 0.045, 0.96, 'panel')],
    'baltimore': [(0.68, 0.64, 0.80, 0.89, 'fill'), (0.0, 0.28, 0.19, 0.39, 'panel')],
    'buffalo': [(0.33, 0.42, 0.54, 0.63, 'fill')],
    'charlotte': [(0.42, 0.25, 0.66, 0.34, 'panel'), (0.46, 0.48, 0.60, 0.56, 'panel')],
    'dallas': [(0.40, 0.47, 0.64, 0.57, 'fill')],
    'denver': [(0.84, 0.91, 1.0, 1.0, 'panel'), (0.42, 0.0, 0.96, 0.14, 'fill')],
    'detroit': [(0.44, 0.29, 0.70, 0.46, 'fill')],
    'foxborough': [(0.44, 0.30, 0.62, 0.42, 'fill')],
    'green-bay': [(0.08, 0.88, 0.78, 1.0, 'fill'), (0.13, 0.29, 0.39, 0.44, 'panel')],
    'houston': [(0.74, 0.53, 0.87, 0.62, 'panel')],
    'kansas-city': [],
    'cleveland': [(0.18, 0.42, 0.34, 0.485, 'fill')],
    'indianapolis': [(0.47, 0.43, 0.62, 0.55, 'fill')],
    'las-vegas': [(0.30, 0.675, 0.62, 0.775, 'erase'), (0.29, 0.78, 0.55, 0.93, 'erase'), (0.10, 0.0, 0.42, 0.05, 'erase')],
    'miami': [(0.63, 0.06, 0.86, 0.22, 'panel')],
    'new-orleans': [(0.20, 0.57, 0.82, 0.722, 'fill')],
    'new-york': [(0.36, 0.12, 0.49, 0.20, 'fill'), (0.52, 0.36, 0.73, 0.48, 'fill')],
    'philadelphia': [(0.64, 0.59, 0.74, 0.68, 'panel')],
    'phoenix': [(0.39, 0.43, 0.48, 0.64, 'fill')],
    'pittsburgh': [(0.44, 0.66, 0.69, 0.76, 'fill')],
    'san-francisco': [(0.48, 0.93, 0.62, 1.0, 'panel')],
    'seattle': [(0.34, 0.33, 0.82, 0.57, 'fill'), (0.72, 0.80, 0.84, 0.87, 'panel')],
    'tampa': [(0.0, 0.0, 0.29, 0.23, 'panel'), (0.42, 0.04, 0.54, 0.21, 'panel'), (0.74, 0.90, 0.96, 1.0, 'fill')],
    'washington': [(0.33, 0.45, 0.42, 0.53, 'erase'), (0.36, 0.53, 0.66, 0.66, 'erase'), (0.60, 0.42, 0.66, 0.55, 'erase'), (0.38, 0.0, 0.50, 0.06, 'fill')],
}


def clean(img, regions):
    h, w = img.shape[:2]
    for x0, y0, x1, y1, mode in regions:
        X0, Y0, X1, Y1 = int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)
        roi = img[Y0:Y1, X0:X1]
        if roi.size == 0:
            continue
        lab = cv2.cvtColor(roi, cv2.COLOR_BGR2LAB).astype(np.float32)
        if mode == 'erase':
            # a área inteira é repintada com o que está em volta (parede/fachada contínua)
            pad = max(6, w // 200)
            A0, B0, A1, B1 = max(0, X0 - pad), max(0, Y0 - pad), min(w, X1 + pad), min(h, Y1 + pad)
            big = img[B0:B1, A0:A1].copy()
            m = np.zeros(big.shape[:2], np.uint8)
            m[Y0 - B0:Y1 - B0, X0 - A0:X1 - A0] = 1
            small = cv2.resize(big, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
            ms = cv2.resize(m, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
            fill = cv2.resize(cv2.inpaint(small, ms, 5, cv2.INPAINT_TELEA), (big.shape[1], big.shape[0]), interpolation=cv2.INTER_CUBIC)
            big[m > 0] = fill[m > 0]
            img[B0:B1, A0:A1] = big
            continue
        if mode.startswith('fill'):
            # o que foge da cor predominante do lugar (letras, logo) é refeito com o fundo em volta
            thr = float(mode[4:] or 22)
            med = np.median(lab.reshape(-1, 3), 0)
            m = (np.sqrt(((lab - med) ** 2).sum(-1)) > thr).astype(np.uint8)
            m = cv2.dilate(m, np.ones((7, 7), np.uint8))
            img[Y0:Y1, X0:X1] = cv2.inpaint(roi, m, 9, cv2.INPAINT_TELEA)
        else:
            # placa lisa: cor da borda da própria placa, com luz leve de cima e contorno escuro
            ring = np.concatenate([roi[:3].reshape(-1, 3), roi[-3:].reshape(-1, 3), roi[:, :3].reshape(-1, 3), roi[:, -3:].reshape(-1, 3)])
            col = np.median(ring, 0) * 0.82
            g = np.linspace(1.08, 0.92, Y1 - Y0)[:, None, None]
            img[Y0:Y1, X0:X1] = np.clip(col[None, None, :] * g, 0, 255).astype(np.uint8)
            cv2.rectangle(img, (X0, Y0), (X1 - 1, Y1 - 1), tuple(int(v) for v in col * 0.45), max(2, w // 500))
    return img


for k in keys:
    img = crop(cv2.imread(f'orig/{k}.jpg'), 179 / 100, *tuple(crops.get(k, (0.5, 0.5, 1.0))))
    img = clean(np.ascontiguousarray(img), BLANK.get(k, []))
    res = toon(img)
    cv2.imwrite(f'out/{k}.png', res)
    Image.open(f'out/{k}.png').convert('RGB').save(f'{OUT}/{k}.webp', 'WEBP', quality=86, method=6)
    print(k, os.path.getsize(f'{OUT}/{k}.webp') // 1024, 'KB', flush=True)
