# Foto → ilustração (versão 3): segmentação mean-shift (manchas de cor de pintura), luz em degraus firmes,
# contorno de tinta colorido nas bordas das manchas e nos detalhes, céu redesenhado em degradê limpo.
import sys
import cv2
import numpy as np

OW, OH = 1280, 715


def crop(img, r=179 / 100, cx=0.5, cy=0.5, zoom=1.0):
    """Recorte 179:100 centrado em (cx, cy) (fração da foto); zoom > 1 aproxima."""
    h, w = img.shape[:2]
    cw, ch = (h * r, h) if w / h > r else (w, w / r)
    cw, ch = cw / zoom, ch / zoom
    x0 = int(np.clip(cx * w - cw / 2, 0, w - cw)); y0 = int(np.clip(cy * h - ch / 2, 0, h - ch))
    return img[y0:y0 + int(ch), x0:x0 + int(cw)]


def local_std(x, k):
    m = cv2.blur(x, (k, k)); m2 = cv2.blur(x * x, (k, k))
    return np.sqrt(np.maximum(m2 - m * m, 0))


def sky_mask(lab, T):
    """Céu: região lisa e clara ligada à borda de cima."""
    H, W = T.shape
    L, B = lab[..., 0], lab[..., 2]
    cand = ((T < 4.0) & (L > 90)).astype(np.uint8)
    cand = cv2.morphologyEx(cand, cv2.MORPH_CLOSE, np.ones((9, 41), np.uint8))
    cand = cv2.morphologyEx(cand, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lbl = cv2.connectedComponents(cand)
    top = set(np.unique(lbl[0, :])) - {0}
    m = np.isin(lbl, list(top))
    # só o que fica acima do primeiro "não céu" de cada coluna (céu não tem buraco embaixo de prédio)
    out = np.zeros_like(m)
    for x in range(W):
        col = m[:, x]
        k = np.argmin(col) if not col.all() else H
        out[:k, x] = col[:k]
    if out.mean() < 0.03:
        return np.zeros_like(out)
    return out


def toon(img, levels=6, sat=1.2, frame=(0.5, 0.5, 1.0)):
    img = crop(img, 179 / 100, *frame)
    W = 1920
    img = cv2.resize(img, (W, int(round(W * 100 / 179))), interpolation=cv2.INTER_AREA if img.shape[1] > W else cv2.INTER_CUBIC)
    H = img.shape[0]
    base = cv2.bilateralFilter(img, 7, 25, 5)
    # 1) manchas de cor (mean-shift): cada área vira uma mancha de cor chapada, bordas preservadas
    ms = cv2.pyrMeanShiftFiltering(base, 7, 20, maxLevel=1)
    ms = cv2.edgePreservingFilter(ms, flags=cv2.NORMCONV_FILTER, sigma_s=12, sigma_r=0.15)
    lab = cv2.cvtColor(ms, cv2.COLOR_BGR2LAB).astype(np.float32)
    # versão lisa (sem os degraus do mean-shift): degradês de céu, telhado, gramado continuam contínuos
    labs = cv2.GaussianBlur(cv2.cvtColor(base, cv2.COLOR_BGR2LAB).astype(np.float32), (0, 0), 2.2)
    L = lab[..., 0]
    T = local_std(cv2.GaussianBlur(labs[..., 0], (0, 0), 1.0), 13)
    w = cv2.GaussianBlur(np.clip((T - 3.5) / 7.0, 0, 1), (0, 0), 4)
    # 2) luz em degraus firmes onde há detalhe; liso continua liso
    step = 255 / levels
    q = L / step
    f = q - np.floor(q)
    Lp = (np.floor(q) + np.clip((f - 0.5) * 10 + 0.5, 0, 1)) * step
    Lc = w * Lp + (1 - w) * labs[..., 0]
    Lc = np.clip((Lc - 128) * 1.1 + 131, 0, 255)
    A = (w * lab[..., 1] + (1 - w) * labs[..., 1] - 128) * sat + 128
    B = (w * lab[..., 2] + (1 - w) * labs[..., 2] - 128) * sat + 128
    out = cv2.cvtColor(np.clip(np.dstack([Lc, A, B]), 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
    # leve granulação removida: o degradê vai com um pontilhado sutil (evita faixas no WebP/8 bits)
    out += np.random.default_rng(7).normal(0, 0.8, out.shape).astype(np.float32) * (1 - w[..., None])
    # 3) céu redesenhado: degradê vertical limpo com as cores do próprio céu (sem faixas, sem ruído)
    sky = sky_mask(cv2.cvtColor(base, cv2.COLOR_BGR2LAB).astype(np.float32), T)
    if sky.any():
        rows = np.where(sky.any(1))[0]
        cols_mean = np.array([out[y][sky[y]].mean(0) if sky[y].any() else [np.nan] * 3 for y in range(H)])
        ys = np.arange(H)
        ok = ~np.isnan(cols_mean[:, 0])
        grad = np.zeros((H, 3), np.float32)
        for c in range(3):
            p = np.polyfit(ys[ok], cols_mean[ok, c], 2)
            grad[:, c] = np.polyval(p, ys)
        gimg = np.repeat(grad[:, None, :], W, 1)
        sm = cv2.GaussianBlur(sky.astype(np.float32), (0, 0), 2.0)[..., None]
        out = gimg * sm + out * (1 - sm)
    # 4) tinta: bordas das manchas (Canny no mean-shift) + detalhes (XDoG), cor = tom escuro do lugar
    g = cv2.cvtColor(ms, cv2.COLOR_BGR2GRAY)
    can = cv2.Canny(g, 28, 70).astype(np.float32) / 255
    can = cv2.GaussianBlur(can, (0, 0), 0.6) * 1.6
    gf = cv2.cvtColor(base, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    dog = cv2.GaussianBlur(gf, (0, 0), 0.9) - 0.99 * cv2.GaussianBlur(gf, (0, 0), 1.5)
    xd = np.clip((-dog - 0.008) * 70, 0, 1)
    e = np.clip(np.maximum(can * 0.75, xd * 0.8), 0, 1) * np.clip(0.25 + w, 0, 1)
    # tira rabiscos soltos: traços de tinta pequenos e isolados (textura de mato, ruído) somem
    bw = (e > 0.18).astype(np.uint8)
    n, lbl, st, _ = cv2.connectedComponentsWithStats(bw, connectivity=8)
    keep = np.zeros(n, bool)
    keep[1:] = (st[1:, cv2.CC_STAT_AREA] >= 45) | (np.maximum(st[1:, cv2.CC_STAT_WIDTH], st[1:, cv2.CC_STAT_HEIGHT]) >= 16)
    e *= cv2.GaussianBlur(keep[lbl].astype(np.float32), (0, 0), 0.6)
    if sky.any():
        e *= 1 - cv2.GaussianBlur(sky.astype(np.float32), (0, 0), 3)
    dark = out * np.array([0.2, 0.22, 0.3], np.float32)  # tinta puxada para o azul-escuro
    res = out * (1 - e[..., None]) + dark * e[..., None]
    res = np.clip(res, 0, 255).astype(np.uint8)
    res = cv2.resize(res, (OW, OH), interpolation=cv2.INTER_AREA)
    bl = cv2.GaussianBlur(res, (0, 0), 0.8)
    return cv2.addWeighted(res, 1.25, bl, -0.25, 0)


if __name__ == '__main__':
    cv2.imwrite(sys.argv[2], toon(cv2.imread(sys.argv[1])))
