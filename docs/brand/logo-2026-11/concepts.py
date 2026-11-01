import sys,os,math; sys.path.insert(0,'.')
from outline import text, glyph_bounds
INK='#16140F'; PAPER='#F3EFE6'; RED='#C2412B'
def frame_q(fg=INK,acc=RED):
    # 둥근 액자 = Q, 오른쪽 아래 모서리에서 꼬리가 빠져나온다
    s=f'<rect x="34" y="34" width="132" height="132" rx="40" fill="none" stroke="{fg}" stroke-width="20"/>'
    s+=f'<path d="M124 124 L170 170" stroke="{acc}" stroke-width="20" stroke-linecap="square"/>'
    return s
def scan_q(fg=INK,acc=RED):
    # 렌즈(원) + QR 파인더 칸이 꼬리
    s=f'<circle cx="92" cy="92" r="56" fill="none" stroke="{fg}" stroke-width="18"/>'
    s+=f'<rect x="124" y="124" width="46" height="46" rx="6" fill="{PAPER if fg==INK else INK}" stroke="{acc}" stroke-width="10"/>'
    s+=f'<rect x="139" y="139" width="16" height="16" rx="2" fill="{acc}"/>'
    return s
def voice_q(fg=INK,acc=RED):
    # 말풍선 = Q: 작품이 말을 건다. 안쪽 점 = 작품(혹은 소리)
    r=62; cx=cy=96
    s=f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fg}"/>'
    s+=f'<path d="M128 140 L172 172 L146 122 Z" fill="{fg}"/>'
    s+=f'<circle cx="{cx}" cy="{cy}" r="22" fill="{acc}"/>'
    return s
def word_q(fg=INK,acc=RED,size=150):
    d,w=text('man7','q',size,100,128,anchor='middle')
    return f'<path d="{d}" fill="{fg}"/><circle cx="{100+w/2+8}" cy="{128-10}" r="10" fill="{acc}"/>'
def svg(inner,w=200,h=200,bg=None,vb='0 0 200 200'):
    b=f'<rect x="-100" y="-100" width="400" height="400" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{h}">{b}{inner}</svg>'
def wordmark(font,txt,size,track,fg):
    d,w=text(font,txt,size,0,0,track=track); return d,w
os.makedirs('out',exist_ok=True)
W=lambda n,c:open('out/'+n,'w').write(c)
C={'frame':frame_q,'scan':scan_q,'voice':voice_q,'word':word_q}
FONTS={'frame':('man7','qurator',-0.02),'scan':('man6','qurator',0.0),'voice':('dm6','qurator',-0.01),'word':('man7','qurator',-0.025)}
for k,f in C.items():
    W(f'{k}-mark.svg',svg(f()))
    W(f'{k}-mark-rev.svg',svg(f(fg=PAPER)))
    W(f'{k}-icon.svg',svg(f'<g transform="translate(100,100) scale(.74) translate(-100,-100)">{f()}</g>',bg=PAPER))
    W(f'{k}-icon-dark.svg',svg(f'<g transform="translate(100,100) scale(.74) translate(-100,-100)">{f(fg=PAPER)}</g>',bg=INK))
    fn,tx,tr=FONTS[k]
    for rev in (False,True):
        fg=PAPER if rev else INK; bg=INK if rev else PAPER
        d,w=text(fn,tx,40,0,0,track=tr)
        if k=='word':
            g=f'<rect width="{int(w+60)}" height="80" fill="{bg}"/><g transform="translate(30,52)"><path d="{d}" fill="{fg}"/></g><circle cx="{30+w+8}" cy="45" r="5" fill="{RED}"/>'
            W(f'{k}-lockup{"-rev" if rev else ""}.svg',f'<svg xmlns="http://www.w3.org/2000/svg" width="{int(w+60)}" height="80">{g}</svg>')
        else:
            g=f'<rect width="{int(w+100)}" height="80" fill="{bg}"/><svg x="18" y="17" width="46" height="46" viewBox="0 0 200 200">{f(fg=fg)}</svg><g transform="translate(76,53)"><path d="{d}" fill="{fg}"/></g>'
            W(f'{k}-lockup{"-rev" if rev else ""}.svg',f'<svg xmlns="http://www.w3.org/2000/svg" width="{int(w+100)}" height="80">{g}</svg>')
print('ok')
