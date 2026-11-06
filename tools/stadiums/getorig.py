# Baixa a foto escolhida (2200 px de largura) e guarda licença/autor para os créditos.
import json, sys, urllib.parse, urllib.request, urllib.error, re, html
from pathlib import Path
import time
def fetch(url, t=60):
    for k in range(8):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t).read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or k == 7: raise
            time.sleep(5 * (k + 1))
UA = {'User-Agent': 'QBCareerStadiumArt/1.0 (https://github.com/guiguibaena123-eng/qb-career; game asset research)'}
key, title = sys.argv[1], sys.argv[2]
q = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'format': 'json', 'titles': title, 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'iiurlwidth': 2200})
d = json.loads(fetch(q))
ii = list(d['query']['pages'].values())[0]['imageinfo'][0]
m = ii['extmetadata']
strip = lambda v: html.unescape(re.sub('<[^>]+>', '', v or '')).strip()
src = ii.get('thumburl') if ii['width'] > 2200 else ii['url']
Path('orig').mkdir(exist_ok=True)
Path(f'orig/{key}.jpg').write_bytes(fetch(src, 120))
cr = json.loads(Path('credits.json').read_text()) if Path('credits.json').exists() else {}
cr[key] = {'title': title, 'page': ii['descriptionurl'], 'license': strip(m.get('LicenseShortName', {}).get('value')), 'artist': strip(m.get('Artist', {}).get('value'))[:120]}
Path('credits.json').write_text(json.dumps(cr, indent=1, ensure_ascii=False))
print(key, cr[key]['license'], '|', cr[key]['artist'][:60])
