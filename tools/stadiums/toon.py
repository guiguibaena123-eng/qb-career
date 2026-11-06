# Foto → desenho animado: paleta própria (cores chapadas e vivas), formas limpas, sombra em 2–3 tons,
# contorno preto grosso entre as áreas de cor e traço fino nos detalhes, céu em degradê.
# Feito em 2560 px e reduzido para 1280 no fim (traços lisos, sem serrilhado).
import sys
import cv2
import numpy as np

OW, OH = 1280, 715


def crop(img, r=179 / 100, cx=0.5, cy=0.5, zoom=1.0):
    h, w = img.shape[:2]
    cw, ch = (h * r, h) if w / h > r else (w, w / r)
    cw, ch = cw / zoom, ch / zoom
    x0 = int(np.clip(cx * w - cw / 2, 0, w - cw)); y0 = int(np.clip(cy * h - ch / 2, 0, h - ch))
    return img[y0:y0 + int(ch), x0:x0 + int(cw)]


def local_std(x, k):
    m = cv2.blur(x, (k, k)); m2 = cv2.blur(x * x, (k, k))
    return np.sqrt(np.maximum(m2 - m * m, 0))


def sky_mask(lab, T):
    H, W = T.shape
    L = lab[..., 0]
    cand = ((T < 4.0) & (L > 90)).astype(np.uint8)
    cand = cv2.morphologyEx(cand, cv2.MORPH_CLOSE, np.ones((9, 41), np.uint8))
    cand = cv2.morphologyEx(cand, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    n, lbl = cv2.connectedComponents(cand)
    top = set(np.unique(lbl[0, :])) - {0}
    m = np.isin(lbl, list(top))
    out = np.zeros_like(m)
    for x in range(W):
        col = m[:, x]
        k = np.argmin(col) if not col.all() else H
        out[:k, x] = col[:k]
    return out if out.mean() > 0.03 else np.zeros_like(out)


def kmeans_lab(lab, K, seed=1):
    flat = lab.reshape(-1, 3)
    sample = flat[np.random.default_rng(seed).choice(len(flat), min(len(flat), 80000), replace=False)]
    _, _, centers = cv2.kmeans(sample, K, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.3), 4, cv2.KMEANS_PP_CENTERS)
    lbl = np.empty(len(flat), np.int32)
    for i in range(0, len(flat), 250000):
        b = flat[i:i + 250000]
        lbl[i:i + 250000] = np.argmin(((b[:, None, :] - centers[None]) ** 2).sum(-1), 1)
    return lbl.reshape(lab.shape[:2]), centers


def toon(img, K=28, sat=1.3, frame=(0.5, 0.5, 1.0), line=1.0):
    img = crop(img, 179 / 100, *frame)
    W = 2560
    img = cv2.resize(img, (W, int(round(W * 100 / 179))), interpolation=cv2.INTER_AREA if img.shape[1] > W else cv2.INTER_CUBIC)
    H = img.shape[0]
    # balanço de branco (meio caminho do "mundo cinza"): tira o tom esverdeado/azulado de algumas fotos
    m = img.reshape(-1, 3).astype(np.float32).mean(0)
    img = np.clip(img.astype(np.float32) * (1 + 0.5 * (m.mean() / m - 1)), 0, 255).astype(np.uint8)
    base = cv2.bilateralFilter(img, 9, 30, 7)
    base = cv2.bilateralFilter(base, 9, 30, 7)
    labb = cv2.cvtColor(base, cv2.COLOR_BGR2LAB).astype(np.float32)
    T = local_std(cv2.GaussianBlur(labb[..., 0], (0, 0), 1.2), 17)
    # 1) formas: mean-shift em escala menor (mais rápido, formas maiores) e de volta
    small = cv2.resize(base, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
    ms = cv2.pyrMeanShiftFiltering(small, 6, 22, maxLevel=1)
    ms = cv2.resize(ms, (W, H), interpolation=cv2.INTER_LINEAR)
    lab = cv2.cvtColor(ms, cv2.COLOR_BGR2LAB).astype(np.float32)
    # 2) paleta: K cores da própria imagem (desenho animado = poucas cores chapadas)
    lbl, centers = kmeans_lab(lab, K)
    lbl = lbl.astype(np.uint8)
    for _ in range(2):
        lbl = cv2.medianBlur(lbl, 7)  # contornos das formas limpos (sem pontinhos)
    # cores da paleta mais vivas e com um pouco mais de contraste
    C = centers.copy()
    # sombras mais claras (cenário de desenho animado é luminoso) e um pouco mais de contraste
    C[:, 0] = np.clip(255 * (C[:, 0] / 255) ** 0.8, 0, 255)
    C[:, 0] = np.clip((C[:, 0] - 128) * 1.08 + 132, 0, 255)
    C[:, 1:] = np.clip((C[:, 1:] - 128) * sat + 128, 0, 255)
    flat = C[lbl]
    # 3) volume leve: 20% da luz original dentro da forma (o desenho não fica "chapado demais")
    flat[..., 0] = np.clip(flat[..., 0] + (cv2.GaussianBlur(labb[..., 0], (0, 0), 3) - lab[..., 0]) * 0.22, 0, 255)
    out = cv2.cvtColor(flat.astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
    # 4) céu em degradê limpo, com as cores do próprio céu
    sky = sky_mask(labb, T)
    if sky.any():
        means = np.array([out[y][sky[y]].mean(0) if sky[y].sum() > 20 else [np.nan] * 3 for y in range(H)])
        ok = ~np.isnan(means[:, 0])
        ys = np.arange(H)
        grad = np.stack([np.polyval(np.polyfit(ys[ok], means[ok, c], 2), ys) for c in range(3)], 1).astype(np.float32)
        hsv = cv2.cvtColor(np.clip(grad[None], 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[..., 1] = np.clip(hsv[..., 1] * 1.25, 0, 255)
        grad = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)[0].astype(np.float32)
        sm = cv2.GaussianBlur(sky.astype(np.float32), (0, 0), 3)[..., None]
        out = np.repeat(grad[:, None, :], W, 1) * sm + out * (1 - sm)
    # 5) contorno grosso: borda entre cores bem diferentes da paleta
    dl = np.zeros((H, W), np.float32)
    for dy, dx in ((0, 1), (1, 0)):
        a = lbl[: H - dy, : W - dx]; b = lbl[dy:, dx:]
        de = np.sqrt(((centers[a] - centers[b]) ** 2).sum(-1))
        dl[: H - dy, : W - dx] = np.maximum(dl[: H - dy, : W - dx], de)
    bold = (dl > 20).astype(np.uint8)
    # remove contornos minúsculos (sujeira) e engrossa
    n, cc, st, _ = cv2.connectedComponentsWithStats(bold, connectivity=8)
    keep = np.zeros(n, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] >= 140
    bold = keep[cc].astype(np.uint8)
    bold = cv2.dilate(bold, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    # 6) traço fino nos detalhes (fileiras de cadeiras, janelas): XDoG só onde há textura
    g = labb[..., 0] / 255
    dog = cv2.GaussianBlur(g, (0, 0), 1.2) - 0.99 * cv2.GaussianBlur(g, (0, 0), 2.0)
    fine = np.clip((-dog - 0.006) * 70, 0, 1) * np.clip((T - 2.5) / 5, 0, 1)
    fb = (fine > 0.3).astype(np.uint8)
    n, cc, st, _ = cv2.connectedComponentsWithStats(fb, connectivity=8)
    keep = np.zeros(n, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] >= 25
    fine *= keep[cc]
    if sky.any():
        nos = 1 - cv2.GaussianBlur(sky.astype(np.float32), (0, 0), 4)
        bold = bold * (nos > 0.5); fine *= nos
    ink = np.maximum(cv2.GaussianBlur(bold.astype(np.float32), (0, 0), 0.8) * 0.95, fine * 0.78) * line
    # tinta: tom bem escuro da própria cor do lugar, misturado com azul-marinho (linha colorida de animação)
    inkc = out * 0.28 * 0.5 + np.array([46, 30, 26], np.float32) * 0.5
    res = out * (1 - ink[..., None]) + inkc * ink[..., None]
    res = np.clip(res, 0, 255).astype(np.uint8)
    return cv2.resize(res, (OW, OH), interpolation=cv2.INTER_AREA)


if __name__ == '__main__':
    cv2.imwrite(sys.argv[2], toon(cv2.imread(sys.argv[1])))
