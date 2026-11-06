# Foto → desenho cartoon com traço técnico (como um desenho de linha de estádio):
#  - base: cores chapadas, claras e vivas (paleta própria, formas limpas, volume suave, céu em degradê);
#  - por cima: traço fino, contínuo e uniforme em azul-marinho quase preto, marcando fileiras, anéis e
#    estruturas (bordas reais da foto, sem pedacinhos soltos), mais um contorno um pouco mais forte nas
#    silhuetas grandes.
# Trabalha em 2560 px e reduz para 1280 no fim (linhas lisas e nítidas).
import sys
import cv2
import numpy as np

OW, OH = 1280, 715
WORK = 2560


def crop(img, r=179 / 100, cx=0.5, cy=0.5, zoom=1.0):
    h, w = img.shape[:2]
    cw, ch = (h * r, h) if w / h > r else (w, w / r)
    cw, ch = cw / zoom, ch / zoom
    x0 = int(np.clip(cx * w - cw / 2, 0, w - cw)); y0 = int(np.clip(cy * h - ch / 2, 0, h - ch))
    return img[y0:y0 + int(ch), x0:x0 + int(cw)]


def to_work(img):
    """Recorte 179:100 já feito → 2560 px de largura."""
    return cv2.resize(img, (WORK, int(round(WORK * 100 / 179))), interpolation=cv2.INTER_AREA if img.shape[1] > WORK else cv2.INTER_CUBIC)


def local_std(x, k):
    m = cv2.blur(x, (k, k)); m2 = cv2.blur(x * x, (k, k))
    return np.sqrt(np.maximum(m2 - m * m, 0))


def sky_mask(lab, T):
    H, W = T.shape
    cand = ((T < 4.0) & (lab[..., 0] > 90)).astype(np.uint8)
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
    if out.mean() < 0.03:
        return np.zeros_like(out)
    # céu com nuvens/recortado vira colunas soltas (retângulos no degradê): só redesenha céu limpo e contínuo
    rows = np.where(out.any(1))[0]
    cover = out[rows[: max(1, len(rows) // 2)]].mean()
    return out if cover > 0.9 else np.zeros_like(out)


def kmeans_lab(lab, K, seed=1):
    flat = lab.reshape(-1, 3)
    sample = flat[np.random.default_rng(seed).choice(len(flat), 90000, replace=False)]
    _, _, C = cv2.kmeans(sample, K, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.3), 4, cv2.KMEANS_PP_CENTERS)
    lbl = np.empty(len(flat), np.int32)
    for i in range(0, len(flat), 250000):
        b = flat[i:i + 250000]
        lbl[i:i + 250000] = np.argmin(((b[:, None, :] - C[None]) ** 2).sum(-1), 1)
    return lbl.reshape(lab.shape[:2]), C


def keep_long(mask, min_len):
    """Só traços com comprimento de verdade (some a poeira de borda)."""
    n, cc, st, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    span = np.maximum(st[:, cv2.CC_STAT_WIDTH], st[:, cv2.CC_STAT_HEIGHT])
    keep = (span >= min_len) | (st[:, cv2.CC_STAT_AREA] >= min_len * 2)
    keep[0] = False
    return keep[cc]


def toon(img, K=16, sat=1.32):
    if img.shape[1] != WORK:
        img = to_work(crop(img))
    H, W = img.shape[:2]
    # balanço de branco (meio caminho do "mundo cinza")
    m = img.reshape(-1, 3).astype(np.float32).mean(0)
    img = np.clip(img.astype(np.float32) * (1 + 0.5 * (m.mean() / m - 1)), 0, 255).astype(np.uint8)
    base = cv2.bilateralFilter(img, 9, 28, 7)
    base = cv2.bilateralFilter(base, 9, 28, 7)
    labb = cv2.cvtColor(base, cv2.COLOR_BGR2LAB).astype(np.float32)
    T = local_std(cv2.GaussianBlur(labb[..., 0], (0, 0), 1.2), 17)

    # ---------------- base de cor (cartoon): formas limpas e cores chapadas
    small = cv2.resize(base, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
    ms = cv2.pyrMeanShiftFiltering(small, 10, 26, maxLevel=1)
    ms = cv2.resize(ms, (W, H), interpolation=cv2.INTER_LINEAR)
    lab = cv2.cvtColor(ms, cv2.COLOR_BGR2LAB).astype(np.float32)
    lbl, C = kmeans_lab(lab, K)
    lbl = lbl.astype(np.uint8)
    for _ in range(3):
        lbl = cv2.medianBlur(lbl, 13)
    Cc = C.copy()
    Cc[:, 0] = np.clip(255 * (Cc[:, 0] / 255) ** 0.74, 0, 255)  # cenário de desenho é luminoso
    Cc[:, 0] = np.clip((Cc[:, 0] - 128) * 1.05 + 134, 0, 255)
    Cc[:, 1:] = np.clip((Cc[:, 1:] - 128) * sat + 128, 0, 255)
    flat = Cc[lbl]
    # volume suave: luz de baixa frequência da foto dentro de cada forma (sem textura de foto)
    lowL = cv2.GaussianBlur(labb[..., 0], (0, 0), 6)
    lowF = cv2.GaussianBlur(lab[..., 0], (0, 0), 6)
    flat[..., 0] = np.clip(flat[..., 0] + (lowL - lowF) * 0.3, 0, 255)
    out = cv2.cvtColor(flat.astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
    out = cv2.GaussianBlur(out, (0, 0), 0.8)  # bordas de cor macias (o traço é que define o desenho)

    # céu: degradê limpo com as cores dele
    sky = sky_mask(labb, T)
    if sky.any():
        means = np.array([out[y][sky[y]].mean(0) if sky[y].sum() > 20 else [np.nan] * 3 for y in range(H)])
        ok = ~np.isnan(means[:, 0]); ys = np.arange(H)
        grad = np.stack([np.polyval(np.polyfit(ys[ok], means[ok, c], 2), ys) for c in range(3)], 1).astype(np.float32)
        hsv = cv2.cvtColor(np.clip(grad[None], 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[..., 1] = np.clip(hsv[..., 1] * 1.25, 0, 255)
        grad = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)[0].astype(np.float32)
        sm = cv2.GaussianBlur(sky.astype(np.float32), (0, 0), 3)[..., None]
        out = np.repeat(grad[:, None, :], W, 1) * sm + out * (1 - sm)
    nosky = 1 - cv2.GaussianBlur(sky.astype(np.float32), (0, 0), 4) if sky.any() else np.ones((H, W), np.float32)

    # ---------------- traço técnico (referência), vetorizado: linhas lisas como feitas com régua
    g = cv2.GaussianBlur(labb[..., 0], (0, 0), 0.8).astype(np.uint8)
    lsd = cv2.createLineSegmentDetector(cv2.LSD_REFINE_STD, 0.8, 0.6, 1.6, 22.5, 0, 0.7, 1024)
    segs = lsd.detect(g)[0]
    canvas = np.zeros((H, W), np.uint8)
    if segs is not None:
        segs = segs.reshape(-1, 4)
        L = np.hypot(segs[:, 2] - segs[:, 0], segs[:, 3] - segs[:, 1])
        for (x0, y0, x1, y1), ln in zip(segs, L):
            if ln < 10:
                continue
            # linhas longas (estrutura) mais escuras; curtas (detalhe) um pouco mais leves
            v = 190 if ln < 24 else 230 if ln < 70 else 255
            cv2.line(canvas, (int(round(x0 * 16)), int(round(y0 * 16))), (int(round(x1 * 16)), int(round(y1 * 16))), v, 2, cv2.LINE_AA, 4)
    lines = canvas.astype(np.float32) / 255
    # contornos das formas grandes: curvas simplificadas e lisas nas bordas de alto contraste
    dl = np.zeros((H, W), np.float32)
    for dy, dx in ((0, 1), (1, 0)):
        a_ = lbl[: H - dy, : W - dx]; b_ = lbl[dy:, dx:]
        dl[: H - dy, : W - dx] = np.maximum(dl[: H - dy, : W - dx], np.sqrt(((C[a_] - C[b_]) ** 2).sum(-1)))
    strong = cv2.dilate((dl > 24).astype(np.uint8), np.ones((5, 5), np.uint8))
    cont = np.zeros((H, W), np.uint8)
    for k in range(K):
        mk = (lbl == k).astype(np.uint8)
        cs, _ = cv2.findContours(mk, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
        big = [c for c in cs if cv2.contourArea(c) > H * W * 0.004]
        for c in big:
            p = cv2.approxPolyDP(c, 3.5, True).reshape(-1, 2).astype(np.float32)
            for _ in range(2):  # Chaikin: cantos viram curvas lisas
                q = np.roll(p, -1, 0)
                p = np.stack([0.75 * p + 0.25 * q, 0.25 * p + 0.75 * q], 1).reshape(-1, 2)
            cv2.polylines(cont, [np.round(p * 16).astype(np.int32)], True, 255, 3, cv2.LINE_AA, 4)
    cont = (cont.astype(np.float32) / 255) * strong
    ink = np.maximum(lines * 0.95, cont * 0.9) * nosky
    inkc = np.array([52, 34, 30], np.float32)  # azul-marinho quase preto (BGR)
    res = out * (1 - ink[..., None]) + inkc * ink[..., None]
    res = np.clip(res, 0, 255).astype(np.uint8)
    return cv2.resize(res, (OW, OH), interpolation=cv2.INTER_AREA)


if __name__ == '__main__':
    cv2.imwrite(sys.argv[2], toon(cv2.imread(sys.argv[1])))
