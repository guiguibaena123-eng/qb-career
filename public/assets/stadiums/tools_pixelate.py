# Gera a miniatura pixelada de um estádio: python tools_pixelate.py foto.jpg saida.png
import sys
from PIL import Image
W,H=179,100
im=Image.open(sys.argv[1]).convert('RGB'); w,h=im.size; r=W/H
if w/h>r: nw=int(h*r); x=(w-nw)//2; box=(x,0,x+nw,h)
else: nh=int(w/r); y=(h-nh)//2; box=(0,y,w,y+nh)
c=im.crop(box).resize((W*3,H*3),Image.LANCZOS)
c.resize((W,H),Image.BOX).save(sys.argv[2],optimize=True)
