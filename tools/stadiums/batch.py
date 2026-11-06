# Gera as 30 ilustrações (WebP 1280×715) em public/assets/stadiums
import json, sys, os
import cv2
from PIL import Image
sys.path.insert(0, '.')
from toon import toon
OUT = r'C:/Users/HP/Desktop/Meus Trabalhos com Claude/qb-career/public/assets/stadiums'
crops = json.load(open('crops.json'))
keys = sys.argv[1:] or sorted(json.load(open('selected.json')))
os.makedirs('out', exist_ok=True)
# letreiros com marca de time real: o texto claro dentro do retângulo (fração da foto) é apagado
# marcas de times reais: 'fill' = cobre o texto claro com a cor em volta (inpaint);
# 'panel' = vira um painel escuro liso. Retângulos em fração da foto original.
BLANK = {
    'kansas-city': [(0.140, 0.418, 0.170, 0.448, 'fill')],
    'washington': [(0.466, 0.548, 0.534, 0.624, 'panel')],
}
import numpy as np
for k in keys:
    img = cv2.imread(f'orig/{k}.jpg')
    h, w = img.shape[:2]
    for x0, y0, x1, y1, mode in BLANK.get(k, []):
        X0, Y0, X1, Y1 = int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)
        if mode == 'fill':
            roi = img[Y0:Y1, X0:X1]
            m = (cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY) > 120).astype(np.uint8)
            m = cv2.dilate(m, np.ones((5, 5), np.uint8))
            img[Y0:Y1, X0:X1] = cv2.inpaint(roi, m, 7, cv2.INPAINT_TELEA)
        else:
            g = np.linspace(92, 66, Y1 - Y0)[:, None, None]
            img[Y0:Y1, X0:X1] = np.concatenate([g + 4, g, g - 2], axis=2).clip(0, 255).astype(np.uint8)
            cv2.rectangle(img, (X0, Y0), (X1 - 1, Y1 - 1), (60, 58, 62), max(2, w // 600))
    res = toon(img, frame=tuple(crops.get(k, (0.5, 0.5, 1.0))))
    cv2.imwrite(f'out/{k}.png', res)
    Image.open(f'out/{k}.png').convert('RGB').save(f'{OUT}/{k}.webp', 'WEBP', quality=86, method=6)
    print(k, os.path.getsize(f'{OUT}/{k}.webp') // 1024, 'KB', flush=True)
