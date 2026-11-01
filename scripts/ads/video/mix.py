import subprocess, sys, os
Q='/home/claude/qurator/audio/'
ADS={
 'daily15':  dict(dur=15, music=('bgm/bach-prelude-c.mp3',4.0), narr=[]),
 'daily30':  dict(dur=30, music=('bgm/bach-prelude-c.mp3',4.0), narr=[('w-kiss/ko-01.mp3',3.7)]),
 'qr15':     dict(dur=15, music=('bgm/amb-09.mp3',22.0), narr=[('k-inwang/ko-01.mp3',5.2)]),
 'ssireum15':dict(dur=15, music=('bgm/kr-04.mp3',22.0), narr=[('k-ssireum/ko-03.mp3',1.25)]),
}
def dur(f): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]))
def mix(ad, vin, vout):
    c=ADS[ad]; D=c['dur']; mf,off=c['music']
    ins=['-i',vin,'-ss',str(off),'-t',str(D+1),'-i',Q+mf]
    duck='1'
    for n,(f,at) in enumerate(c['narr']):
        ins+=['-i',Q+f]; a=at-.25; b=at+dur(Q+f)+.3
        duck+=f'-0.55*min(1,max(0,min((t-{a})/0.5,({b}-t)/0.8)))'
    g=1.6
    fc=f"[1:a]aresample=48000,volume={g},volume='{duck}':eval=frame,afade=t=in:d=0.4,afade=t=out:st={D-1.6}:d=1.6[m]"
    labels='[m]'
    for n,(f,at) in enumerate(c['narr']):
        ms=int(at*1000); fc+=f";[{n+2}:a]aresample=48000,volume=1.0,adelay={ms}|{ms}[n{n}]"; labels+=f'[n{n}]'
    k=1+len(c['narr'])
    fc+=f";{labels}amix=inputs={k}:normalize=0:duration=first,atrim=0:{D},loudnorm=I=-15:TP=-1.5:LRA=9,aresample=48000[a]"
    tmp=vout.replace('.mp4','.part.mp4')
    subprocess.run(['ffmpeg','-v','error','-y',*ins,'-filter_complex',fc,'-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-shortest','-movflags','+faststart',tmp],check=True)
    os.replace(tmp,vout)
if __name__=='__main__': mix(*sys.argv[1:4])
