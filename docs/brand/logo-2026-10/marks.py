import sys; sys.path.insert(0,'.')
from outline import text
INK='#16140F'; PAPER='#F3EFE6'; SEAL='#A8361F'; GOLD='#9A7B3F'

def didone_O(cx,cy,ro=(42,54),ri=(24,50.5)):
    # ring as evenodd: outer ellipse + inner ellipse
    def ell(rx,ry): return f'M{cx-rx},{cy} A{rx},{ry} 0 1 0 {cx+rx},{cy} A{rx},{ry} 0 1 0 {cx-rx},{cy} Z'
    return ell(*ro)+' '+ell(*ri)
def didone_tail(cx,cy,b=None):
    # tear-shaped Didone tail: drops from bottom of the O, flares to the right in a hairline
    b=b if b is not None else cy+52
    return (f'M{cx-7},{b-2} C{cx-7},{b+14} {cx-4},{b+26} {cx+6},{b+32} '
            f'C{cx+16},{b+38} {cx+30},{b+38} {cx+42},{b+33} '
            f'L{cx+42.5},{b+34.6} C{cx+28},{b+42} {cx+10},{b+44} {cx-1},{b+38} '
            f'C{cx-12},{b+31} {cx-14},{b+15} {cx-13},{b-2} Z')

def mark_seal(fg=PAPER,bg=SEAL,outside=SEAL,id='a'):
    O=didone_O(100,92,(37,49),(21.5,46)); T=didone_tail(100,92,b=139)
    return f'''<defs><clipPath id="in{id}"><rect x="30" y="26" width="140" height="140" rx="5"/></clipPath>
<clipPath id="out{id}"><path d="M0,0H200V200H0Z M30,26V166H170V26Z" clip-rule="evenodd" fill-rule="evenodd"/></clipPath></defs>
<rect x="30" y="26" width="140" height="140" rx="5" fill="{bg}"/>
<g clip-path="url(#in{id})" fill="{fg}"><path d="{O}" fill-rule="evenodd"/><path d="{T}"/></g>
<g clip-path="url(#out{id})" fill="{outside}"><path d="{T}"/></g>'''

def mark_crest(fg=INK,gold=GOLD,clip=True,id='b'):
    cx=100; top=22; r=58; base=178; L=cx-r; R=cx+r
    def arch(i): return f'M{L+i},{base-i} V{top+r} A{r-i},{r-i} 0 0 1 {R-i},{top+r} V{base-i} Z'
    s=f'<path d="{arch(0)}" fill="none" stroke="{fg}" stroke-width="2.2"/>'
    s+=f'<path d="{arch(5)}" fill="none" stroke="{fg}" stroke-width=".9"/>'
    d,w=text('ital','Q',120,cx,140,anchor='middle')
    s+=f'<path d="{d}" fill="{fg}"/>'
    s+=f'<circle cx="{cx}" cy="{top+14}" r="3" fill="{gold}"/>'
    return s

def mark_arch(fg=INK,gold=GOLD,bg=None):
    cx=100; top=34; r=46; base=170; L=cx-r; R=cx+r
    outer=f'M{L},{base} V{top+r} A{r},{r} 0 0 1 {R},{top+r} V{base}'
    i=9; ri=r-i
    inner=f'M{L+i},{base-i} V{top+r} A{ri},{ri} 0 0 1 {R-i},{top+r} V{base-i} H{L+i}'
    tail=f'M{R-22},{base-26} L{R+20},{base+14} L{R+17.5},{base+16.5} L{R-27},{base-21} Z'
    s=f'<path d="{outer}" fill="none" stroke="{fg}" stroke-width="6.5" stroke-linecap="butt"/>'
    s+=f'<line x1="{L-3.25}" y1="{base}" x2="{R+3.25}" y2="{base}" stroke="{fg}" stroke-width="6.5"/>'
    s+=f'<path d="{inner}" fill="none" stroke="{fg}" stroke-width="1.3"/>'
    s+=f'<rect x="{cx-9}" y="{top+r-6}" width="18" height="24" fill="{gold}"/>'
    s+=f'<path d="{tail}" fill="{fg}"/>'
    return s

def mark_module(fg=INK,acc=SEAL):
    # geometric ring; the tail is a run of QR modules crossing the ring at 4:30, like a Futura Q
    c=96; r=52; sw=13; q=14
    p=c+r*0.7071  # centre of stroke at 45deg
    sq=lambda k,col: f'<rect x="{p-q/2+k*q}" y="{p-q/2+k*q}" width="{q}" height="{q}" fill="{col}"/>'
    return (f'<circle cx="{c}" cy="{c}" r="{r}" fill="none" stroke="{fg}" stroke-width="{sw}"/>'
            + sq(-1,fg)+sq(0,fg)+sq(1,fg)+sq(2,acc))

def svg(inner,w=200,h=200,bg=None,vb=None):
    vb=vb or f'0 0 {w} {h}'
    b=f'<rect width="100%" height="100%" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{h}">{b}{inner}</svg>'
