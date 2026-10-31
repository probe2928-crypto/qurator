from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import functools
F='/tmp/claude-0/fonts/npm/'
FONTS={
 'bodoni5':F+'fontsource-bodoni-moda-5.3.0/files/bodoni-moda-latin-500-normal.woff2',
 'bodoni4':F+'fontsource-bodoni-moda-5.3.0/files/bodoni-moda-latin-400-normal.woff2',
 'bodoni6':F+'fontsource-bodoni-moda-5.3.0/files/bodoni-moda-latin-600-normal.woff2',
 'bodoni8':F+'fontsource-bodoni-moda-5.3.0/files/bodoni-moda-latin-800-normal.woff2',
 'corm5':F+'fontsource-cormorant-garamond-5.3.0/files/cormorant-garamond-latin-500-normal.woff2',
 'corm4':F+'fontsource-cormorant-garamond-5.3.0/files/cormorant-garamond-latin-400-normal.woff2',
 'corm6':F+'fontsource-cormorant-garamond-5.3.0/files/cormorant-garamond-latin-600-normal.woff2',
 'ital':F+'fontsource-italiana-5.3.0/files/italiana-latin-400-normal.woff2',
 'jost3':F+'fontsource-jost/files/jost-latin-300-normal.woff2',
 'jost4':F+'fontsource-jost/files/jost-latin-400-normal.woff2',
 'jost5':F+'fontsource-jost/files/jost-latin-500-normal.woff2',
}
@functools.lru_cache(None)
def font(k): return TTFont(FONTS[k])
def text(k,s,size,x,y,track=0.0,anchor='start'):
    """returns (d, width). y = baseline. track in em."""
    f=font(k); gs=f.getGlyphSet(); cmap=f.getBestCmap(); upm=f['head'].unitsPerEm
    sc=size/upm; adv=[]
    names=[cmap[ord(c)] for c in s]
    w=0
    for i,n in enumerate(names):
        w+=gs[n].width*sc + (track*size if i<len(names)-1 else 0)
    x0={'start':x,'middle':x-w/2,'end':x-w}[anchor]
    pen=SVGPathPen(gs); cx=x0
    for n in names:
        tp=TransformPen(pen,(sc,0,0,-sc,cx,y)); gs[n].draw(tp)
        cx+=gs[n].width*sc+track*size
    return pen.getCommands(), w
def glyph_bounds(k,ch):
    f=font(k); gs=f.getGlyphSet(); n=f.getBestCmap()[ord(ch)]
    bp=BoundsPen(gs); gs[n].draw(bp); return bp.bounds, f['head'].unitsPerEm
