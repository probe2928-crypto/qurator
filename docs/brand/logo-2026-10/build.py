import sys,os; sys.path.insert(0,'.')
from marks import *
from outline import text
os.makedirs('out',exist_ok=True)
def save(n,body,w,h,bg=None): open(f'out/{n}.svg','w').write(svg(body,w,h,bg))

# ---------- A  낙관 (seal) ----------
save('a-mark',mark_seal(),200,200)
save('a-mark-rev',mark_seal(fg=INK,bg=SEAL,outside=SEAL,id='ar'),200,200)
d1,w1=text('bodoni5','QURATOR',64,0,0,track=.26)
d2,w2=text('bodoni4','MAISON DE DOCENT · SÉOUL',12.5,0,0,track=.42)
def a_lock(fg,seal_fg,sid):
    W=w1+150
    g=f'<g transform="translate(40,118)"><path d="{text("bodoni5","QURATOR",64,0,0,track=.26)[0]}" fill="{fg}"/></g>'
    g+=f'<g transform="translate({40+w1/2-w2/2},160)"><path d="{d2}" fill="{fg}" opacity=".78"/></g>'
    g+=f'<g transform="translate({40+w1+34},40) scale(.62)">{mark_seal(fg=seal_fg,id=sid)}</g>'
    return g, int(W+60)
g,W=a_lock(INK,PAPER,'al'); save('a-lockup',g,W,200)
g,W=a_lock(PAPER,INK,'alr'); save('a-lockup-rev',g,W,200)
save('a-icon',f'<rect width="200" height="200" fill="{SEAL}"/><g transform="translate(100,100) scale(1.0) translate(-100,-100)"><clipPath id="ic"><rect x="-50" y="-50" width="300" height="300"/></clipPath>'+
     f'<path d="{didone_O(100,92,(37,49),(21.5,46))}" fill-rule="evenodd" fill="{PAPER}"/><path d="{didone_tail(100,92,b=139)}" fill="{PAPER}"/></g>',200,200)

# ---------- B  크레스트 (arch) ----------
save('b-mark',mark_crest(),200,200)
save('b-mark-rev',mark_crest(fg=PAPER),200,200)
e1,v1=text('corm5','QURATOR',46,0,0,track=.38)
e2,v2=text('corm5','MAISON DE DOCENT  ·  SÉOUL  ·  MMXXVI',12.5,0,0,track=.3)
def b_lock(fg):
    W=max(v1,v2)+120; cx=W/2
    g=f'<g transform="translate({cx-70},4) scale(.7)">{mark_crest(fg=fg)}</g>'
    g+=f'<g transform="translate({cx-v1/2},196)"><path d="{e1}" fill="{fg}"/></g>'
    g+=f'<line x1="{cx-34}" y1="214" x2="{cx+34}" y2="214" stroke="{fg}" stroke-width=".8"/>'
    g+=f'<g transform="translate({cx-v2/2},236)"><path d="{e2}" fill="{fg}" opacity=".8"/></g>'
    return g,int(W)
g,W=b_lock(INK); save('b-lockup',g,W,260)
g,W=b_lock(PAPER); save('b-lockup-rev',g,W,260)
save('b-icon',f'<rect width="200" height="200" fill="{INK}"/><g transform="translate(100,104) scale(.82) translate(-100,-100)">{mark_crest(fg=PAPER)}</g>',200,200)

# ---------- C  모듈 (module) ----------
save('c-mark',mark_module(),200,200)
save('c-mark-rev',mark_module(fg=PAPER),200,200)
f1,u1=text('jost4','QURATOR',44,0,0,track=.44)
f2,u2=text('jost3','DAILY ART  ·  DOCENT  ·  SEOUL',11,0,0,track=.5)
def c_lock(fg):
    g=f'<g transform="translate(30,30) scale(.7)">{mark_module(fg=fg)}</g>'
    g+=f'<g transform="translate(200,104)"><path d="{f1}" fill="{fg}"/></g>'
    g+=f'<g transform="translate(202,132)"><path d="{f2}" fill="{fg}" opacity=".75"/></g>'
    return g,int(200+max(u1,u2)+40)
g,W=c_lock(INK); save('c-lockup',g,W,190)
g,W=c_lock(PAPER); save('c-lockup-rev',g,W,190)
save('c-icon',f'<rect width="200" height="200" fill="{PAPER}"/><g transform="translate(100,100) scale(.86) translate(-104,-104)">{mark_module()}</g>',200,200)
print(sorted(os.listdir('out')))
