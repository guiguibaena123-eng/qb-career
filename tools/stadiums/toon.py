# Foto → ilustração cartoon nítida (estilo "desenho de estádio"):
#  - base: a própria foto limpa de ruído e textura (filtro que preserva bordas), com sombreamento em
#    degraus suaves (cel shading) só onde há forma — céu e paredes lisas ficam em degradê limpo, sem faixas;
#    cores mais vivas e claras;
#  - traço: linhas finas e contínuas em azul-marinho quase preto nas bordas reais (XDoG) + linhas retas
#    longas da estrutura (detector de segmentos) desenhadas lisas, como feitas com régua;
#  - área lisa (céu, parede) sem traço solto.
# Trabalha em 2560 px e entrega 1790×1000 (nítido no cartão e no fundo de tela).
import sys
import cv2
import numpy as np

OW, OH = 1790, 1000
WORK = 2560

# ajustes por estádio (foto enevoada ganha contraste local; foto granulada é mais suavizada)
TUNE = {
    'kansas-city': dict(levels=1, clahe=1.6, gam=1.0, sat=1.45),
    'detroit': dict(levels=1, clahe=1.2),
    'cleveland': dict(clahe=1.4),
    'charlotte': dict(clahe=1.3),
    'jacksonville': dict(den=6),
    'seattle': dict(den=6, clahe=1.4),
    'philadelphia': dict(den=6, clahe=1.3),
    'dallas': dict(den=6),
    'houston': dict(clahe=1.3),
}


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


def soft_quant(L, n, k):
    q = 255.0 / n
    b = np.floor(L / q)
    f = L / q - b
    s = 0.5 + 0.5 * np.tanh((f - 0.5) * k) / np.tanh(k / 2)
    return (b + s) * q


def keep_long(m, min_len):
    """Só traços com comprimento de verdade (some a poeira de borda)."""
    n, cc, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
    span = np.maximum(st[:, cv2.CC_STAT_WIDTH], st[:, cv2.CC_STAT_HEIGHT])
    keep = (st[:, cv2.CC_STAT_AREA] >= min_len) | (span >= min_len // 2)
    keep[0] = False
    return keep[cc]


def toon(img, key=None, **kw):
    P = dict(n=5, k=9.0, mixq=0.95, sat=1.5, gam=0.86, xs=1.1, xt=-1.4, ink=0.92, ss=40, sr=0.4, den=4, clahe=0)
    P.update(TUNE.get(key, {})); P.update(kw)
    if img.shape[1] != WORK:
        img = to_work(crop(img))
    H, W = img.shape[:2]
    # balanço de branco (meio caminho do "mundo cinza")
    m = img.reshape(-1, 3).astype(np.float32).mean(0)
    img = np.clip(img.astype(np.float32) * (1 + 0.5 * (m.mean() / m - 1)), 0, 255).astype(np.uint8)
    if P.get('levels'):
        lab0 = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
        lo, hi = np.percentile(lab0[..., 0], (1, 99))
        lab0[..., 0] = np.clip((lab0[..., 0] - lo) / max(1, hi - lo) * 255, 0, 255)
        img = cv2.cvtColor(lab0.astype(np.uint8), cv2.COLOR_LAB2BGR)
    if P['clahe']:
        lab0 = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        lab0[..., 0] = cv2.createCLAHE(P['clahe'], (8, 8)).apply(lab0[..., 0])
        img = cv2.cvtColor(lab0, cv2.COLOR_LAB2BGR)
    d = cv2.fastNlMeansDenoisingColored(img, None, P['den'], P['den'], 5, 15)
    ep = cv2.edgePreservingFilter(d, flags=cv2.RECURS_FILTER, sigma_s=P['ss'], sigma_r=P['sr'])
    lab = cv2.cvtColor(ep, cv2.COLOR_BGR2LAB).astype(np.float32)
    L = lab[..., 0]
    # cel shading só onde há forma: em área lisa (céu, parede) o degradê fica contínuo, sem faixas
    tex = local_std(cv2.GaussianBlur(L, (0, 0), 2.0), 25)
    wq = np.clip((tex - 1.5) / 4.0, 0, 1) * P['mixq']
    wq = cv2.GaussianBlur(wq, (0, 0), 6)
    L2 = soft_quant(L, P['n'], P['k']) * wq + L * (1 - wq)
    L2 = 255 * (np.clip(L2, 0, 255) / 255) ** P['gam']
    lab[..., 0] = L2
    lab[..., 1:] = (lab[..., 1:] - 128) * P['sat'] + 128
    out = cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)

    # área lisa (céu, parede sem detalhe): sem traço solto
    smooth = np.clip((tex - 0.8) / 2.0, 0, 1)
    smooth = cv2.GaussianBlur(smooth, (0, 0), 4)

    # traço fino (XDoG) nas bordas reais, sem poeira
    g = cv2.cvtColor(ep, cv2.COLOR_BGR2LAB)[..., 0].astype(np.float32)
    g1 = cv2.GaussianBlur(g, (0, 0), P['xs']); g2 = cv2.GaussianBlur(g, (0, 0), P['xs'] * 1.6)
    e = np.clip((P['xt'] - (g1 - g2)) / 3.0, 0, 1)
    e = e * keep_long(e > 0.3, 40)
    # linhas retas longas da estrutura, lisas (régua)
    lsd = cv2.createLineSegmentDetector(cv2.LSD_REFINE_STD, 0.8, 0.6, 1.6, 22.5, 0, 0.7, 1024)
    segs = lsd.detect(cv2.GaussianBlur(g, (0, 0), 0.8).astype(np.uint8))[0]
    cv = np.zeros((H, W), np.uint8)
    if segs is not None:
        for x0, y0, x1, y1 in segs.reshape(-1, 4):
            if np.hypot(x1 - x0, y1 - y0) < 40:
                continue
            # só linha com contraste de verdade dos dois lados (some a "linha fantasma" de céu enevoado)
            L_ = np.hypot(x1 - x0, y1 - y0); nx, ny = -(y1 - y0) / L_ * 3, (x1 - x0) / L_ * 3
            ts = np.linspace(0.15, 0.85, 7)
            px = np.clip(x0 + (x1 - x0) * ts, 3, W - 4); py = np.clip(y0 + (y1 - y0) * ts, 3, H - 4)
            ga = g[np.clip(py + ny, 0, H - 1).astype(int), np.clip(px + nx, 0, W - 1).astype(int)]
            gb = g[np.clip(py - ny, 0, H - 1).astype(int), np.clip(px - nx, 0, W - 1).astype(int)]
            con = np.abs(ga - gb).mean()
            if con < 7:
                continue
            # divisa entre duas áreas lisas (faixas de névoa/céu) com pouco contraste: não é estrutura
            qa = tex[np.clip(py + ny * 3, 0, H - 1).astype(int), np.clip(px + nx * 3, 0, W - 1).astype(int)].mean()
            qb = tex[np.clip(py - ny * 3, 0, H - 1).astype(int), np.clip(px - nx * 3, 0, W - 1).astype(int)].mean()
            if max(qa, qb) < 2.5 and con < 28:
                continue
            cv2.line(cv, (int(x0 * 16), int(y0 * 16)), (int(x1 * 16), int(y1 * 16)), 255, 2, cv2.LINE_AA, 4)
    ink = np.maximum(e * smooth, cv.astype(np.float32) / 255 * 0.8) * P['ink']
    inkc = np.array([48, 30, 26], np.float32)  # azul-marinho quase preto (BGR)
    res = out * (1 - ink[..., None]) + inkc * ink[..., None]
    res = cv2.resize(np.clip(res, 0, 255).astype(np.uint8), (OW, OH), interpolation=cv2.INTER_AREA)
    bl = cv2.GaussianBlur(res, (0, 0), 1.0)
    return cv2.addWeighted(res, 1.45, bl, -0.45, 0)  # nitidez final


if __name__ == '__main__':
    cv2.imwrite(sys.argv[2], toon(cv2.imread(sys.argv[1]), key=sys.argv[3] if len(sys.argv) > 3 else None))
