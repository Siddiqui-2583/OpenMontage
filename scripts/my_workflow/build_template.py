# REFERENCE ONLY: the build script from the "pen-and-paper" project (Bangla 9:16 talking head).
# Copy to projects/<name>/scripts/build.py and adapt: paths, D (duration), CUT, line list L, overlays.
# Shows: silence-based pause trim, forced cut, loudnorm, transcript->word timing, overlay anchoring, props JSON.
import json,subprocess,shutil,os,re
ROOT="/Users/macbookair/video-creation/OpenMontage"; P=f"{ROOT}/projects/pen-and-paper"; PUB=f"{ROOT}/remotion-composer/public/pen-and-paper"
os.makedirs(PUB,exist_ok=True)
D=141.967; PAD=0.12; MINSIL=0.35; SPEECH_END=138.75
CUT=(120.313,126.447)   # restated line + pauses (verified with large-v3 window pass)
# ---- silence list -> speech intervals
sil=[]; cur=None
for l in open(f"{P}/artifacts/silence.txt"):
    k,v=l.split(); v=float(v)
    if k=='start': cur=v
    elif cur is not None: sil.append((cur,v)); cur=None
# merge forced cut as one silence
sil=[s for s in sil if s[1]<=CUT[0]+0.001 or s[0]>=CUT[1]-0.001 ]
sil.append(CUT); sil.sort()
speech=[];t=0.0
for a,b in sil:
    if a>t: speech.append((t,a))
    t=b
if t<D: speech.append((t,D))
# ---- cut segments (trim pauses > MINSIL to 2*PAD, drop dead tail)
SEG=[];t=0.0
for a,b in sil:
    if b-a>MINSIL:
        if a>=SPEECH_END-0.1:
            SEG.append((t,min(D,a+0.3))); t=None; break
        SEG.append((t,a+PAD)); t=b-PAD
if t is not None: SEG.append((t,D))
SEG=[(round(a,3),round(b,3)) for a,b in SEG if b-a>0.05]
FINAL=sum(b-a for a,b in SEG)
def to_final(x):
    acc=0
    for a,b in SEG:
        if x<a: return acc
        if x<=b: return acc+x-a
        acc+=b-a
    return acc
# ---- edited video (cuts + loudnorm)
n=len(SEG); f=[]
for i,(a,b) in enumerate(SEG):
    f.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS[v{i}]")
    d=b-a
    f.append(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st={max(0,d-0.03):.3f}:d=0.03[a{i}]")
f.append("".join(f"[v{i}][a{i}]" for i in range(n))+f"concat=n={n}:v=1:a=1[vo][ao]")
f.append("[ao]loudnorm=I=-16:TP=-1.5:LRA=11[aout]")
out=f"{P}/assets/video/edited.mp4"
if not os.path.exists(out): subprocess.run(["ffmpeg","-v","error","-y","-i",f"{P}/assets/video/source.mp4","-filter_complex",";".join(f),"-map","[vo]","-map","[aout]","-r","30","-c:v","libx264","-crf","16","-preset","medium","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k",out],check=True)
shutil.copy(out,f"{PUB}/edited.mp4")
# ---- transcript lines (user's text, spelling fixed). (start_sec, text[, end_sec])
L=[(1,"আসসালামু আলাইকুম।"),(4,"একসময় প্রচুর লেখালেখি করার অভ্যাস ছিল।"),(7,"কলম আর খাতা বিষয়টা খুবই ভালো লাগতো।"),
(12,"তারপরে দেখা গেছে যে আসলে এই কম্পিউটারের"),(15,"জগতে ঢোকার পরে সফটওয়ার এর জগতে ঢোকার"),(18,"পরে লেখালেখি আসলে কি বলব যে হাত ভেঙে"),
(23,"যায় লিটারালি লিখতে গেলে। তো যেটার কারণে"),(26,"আসলে নোটবুক বিষয়টা কিংবা খাতা কলমে"),(30,"ব্রেইন ডাম্প করার যে বিষয়টা এটা হারায়ে"),
(33,"গেছিল একদম। তো রিসেন্টলি দুই তিন মাস আগে"),(36,"আমার এটা একদিন একটা নোট নিতে যেয়ে আমার"),(40,"এটা মাথা খুলে যায়। মানে আমার মনে হয় যে"),
(44,"আসলে জিনিসটা খুবই আমেজিং। মানে খাতা কলম"),(48,"নিয়ে আপনি যখন একটা আইডিয়া কিংবা একটা"),(49,"প্ল্যানিং করা শুরু করবেন দেখবেন"),
(52,"অটোমেটিক্যালি আপনার ব্রেইনটা একটিভ হয়।"),(54,"এটা একটা অ্যাক্টিভেশন রিচুয়ালের মত কাজ করে"),(58,"আপনার ব্রেইন খোলে এবং আপনি যে আইডিয়াটা"),
(61,"নিয়ে কাজ করতেছেন সেটা খুব ইজিলি"),(63,"প্রবলেমটা সলভ করা যায়। তো যারা আসলে"),(66,"এখনো মনে করেন যে ভাই ট্রেলো দিয়ে কিংবা"),
(69,"হচ্ছে যে নোটপ্যাডে কিংবা গুগল ডকে আমি"),(72,"অনেক কিছু অস্থির কিছু প্ল্যানিং করতেছি।"),(75,"ভাই খাতা কলমের চেয়ে বেস্ট কিছু হয় না।"),
(77,"আপনি জাস্ট ট্রাই করেন। সেম জিনিসটাই খাতা"),(79,"কলমে নেন। আর এখন তো এই জিনিসগুলা খুবই"),(82,"ইজি। আপনি খাতা কলমে যা করবেন। এইটা"),
(86,"জাস্ট হচ্ছে জেমিনিরে দিবেন কিংবা Google"),(89,"লেন্স দিবেন কিংবা চ্যাটজিপিটিরে দিবেন। ও"),(91,"সুন্দর মত আপনারে"),(94,"ডায়াগ্রাম সহ আঁকায়ে নোট করে দিবে তাই না?"),
(96,"তো বাট আইডিয়াটা তো অরিজিনাল আইডিয়াটা তো"),(99,"প্ল্যানিংটা তো আপনার মাথা থেকে আসতে হবে।"),(101,"হ্যাঁ। আপনি এআই এর কাছ থেকে আইডিয়া চাইতে"),
(103,"পারেন। বাট আল্টিমেটলি সেটা সেই আইডিয়াস"),(106,"গুলাকে এক জায়গায় করে আপনার ফিজিক্যাল"),(110,"ওয়ার্ল্ডে ইমপ্লিমেন্ট করা, এক্সিকিউট"),
(111,"করা। এই জিনিসগুলা তো আসলে আপনাকেই করতে"),(113.3,"হবে। যেটার জন্য আপনার মাথা খাটানো দরকার"),
(116.3,"এবং সেটার জন্য পেন এন্ড পেপার ইজ দা বেস্ট সলিউশন এভার।",120.31),
(121.9,"এবং সেটার জন্য কলম আর খাতা পেন এন্ড পেপারের কোন বিকল্প নাই।",126.14),   # CUT
(126.45,"এইটা আমার বুঝা শেষ।",128.05),
(128.52,"সো আপনারা যারা কলম খাতাকে এখনো"),(132,"আন্ডাররেটেড করে রাখছেন প্লিজ কলম আর খাতা"),(135,"নেন এবং দেখেন দা ম্যাজিক উইল হ্যাপেন"),(138,"এইটা আই প্রমিস।")]
# line start/end windows: snap starts to nearest speech onset if not explicit
onsets=[b for a,b in sil]
starts=[];ends=[]
for i,l in enumerate(L):
    t=l[0]
    if len(l)==3: starts.append(t); continue
    c=[o for o in onsets if t-1.0<=o<=t+0.8]
    s=min(c,key=lambda o:abs(o-(t-0.3))) if c else t-0.3
    starts.append(max(s,starts[-1]+0.05 if starts else 0))
for i,l in enumerate(L):
    ends.append(l[2] if len(l)==3 else (starts[i+1] if i+1<len(L) else SPEECH_END))
def active(a,b):
    return [(max(a,x),min(b,y)) for x,y in speech if min(b,y)>max(a,x)+0.01]
W=[]
for i,l in enumerate(L):
    words=l[1].split(); iv=active(starts[i],ends[i]) or [(starts[i],ends[i])]
    tot=sum(y-x for x,y in iv); wt=[max(1,len(w)) for w in words]; S=sum(wt); acc=0
    def at_active(u):
        u=u*tot
        for x,y in iv:
            if u<=y-x: return x+u
            u-=y-x
        return iv[-1][1]
    for w,k in zip(words,wt):
        W.append({"word":w,"start":at_active(acc/S),"end":at_active((acc+k)/S),"cut":l[0]==121.9}); acc+=k
W=[w for w in W if not w["cut"]]
json.dump(W,open(f"{P}/artifacts/aligned_words.json","w"),ensure_ascii=False)
cap=[]
for w in W:
    s=to_final(w['start']); e=to_final(w['end'])
    if s>=FINAL-0.05: continue
    c={"word":w['word'],"startMs":int(s*1000),"endMs":int(max(e,s+0.05)*1000)}
    if w['word'].endswith(('।','?','.')): c["pageBreakAfter"]=True
    cap.append(c)
for i in range(len(cap)-1):
    if cap[i+1]['startMs']-cap[i]['endMs']<400: cap[i]['endMs']=cap[i+1]['startMs']
json.dump(cap,open(f"{P}/assets/captions_words.json","w"),ensure_ascii=False)
# ---- overlays anchored on spoken words (raw time)
def at(word,after=0,nth=0):
    m=[w['start'] for w in W if w['word'].startswith(word) and w['start']>=after]; return m[nth]
for im in ("codex_notebook.png","pen_notes_cc0.jpg"): shutil.copy(f"{P}/assets/images/{im}",f"{PUB}/{im}")
ov=[]
def add(type_,raw,dur,**k):
    s=round(to_final(raw),2); ov.append({"id":f"o{len(ov)+1}","type":type_,"in_seconds":s,"out_seconds":round(min(s+dur,FINAL-0.05),2),"position":"full_overlay" if type_ in("motion_graphic","image_card") else "top_banner",**k})
add("image_card",at("কলম",5),3.4,image="pen-and-paper/pen_notes_cc0.jpg")                       # free CC0 photo
add("motion_graphic",at("ব্রেইন",28),4.2,kind="keyboard_vs_pen")
add("image_card",at("আইডিয়া",44),3.0,image="pen-and-paper/codex_notebook.png")                  # Codex illustration
add("motion_graphic",at("অ্যাক্টিভেশন",50),4.5,kind="brain_activation")
add("logo_pop",at("ট্রেলো",60),3.0,logos=["trello","googledocs"],text="Trello · Google Docs")
add("motion_graphic",at("বেস্ট",72),4.2,kind="tools_vs_notebook")
add("logo_pop",at("জেমিনিরে",84),3.4,logos=["gemini","googlelens","openai"],text="Gemini · Google Lens · ChatGPT")
add("motion_graphic",at("অরিজিনাল",94),5.0,kind="idea_flow")
add("hero_title",at("ইজ",116),3.0,text="Pen & Paper",subtitle="= Best Solution Ever")
add("motion_graphic",at("ম্যাজিক",132),3.6,kind="magic_sparkle")
for a,b in zip(ov,ov[1:]):
    if a['out_seconds']>b['in_seconds']: a['out_seconds']=round(b['in_seconds']-0.05,2)
props={"videoSrc":"pen-and-paper/edited.mp4","captions":cap,"overlays":ov,"wordsPerPage":4,"fontSize":76,"highlightColor":"#FFD23F","captionColor":"#FFFFFF","captionBackgroundColor":"transparent","captionFontFamily":"hind-siliguri","captionBottomOffset":260,"captionStrokeWidth":10,"durationInFrames":int(FINAL*30)+1}
os.makedirs(f"{ROOT}/remotion-composer/public/demo-props",exist_ok=True)
json.dump(props,open(f"{ROOT}/remotion-composer/public/demo-props/pen-and-paper.json","w"),ensure_ascii=False,indent=1)
json.dump({"segments":SEG,"final_duration":round(FINAL,3)},open(f"{P}/assets/cut_segments.json","w"))
print("segments",len(SEG),"final",round(FINAL,1),"words",len(cap),"overlays",len(ov))
for o in ov: print(o['in_seconds'],o['out_seconds'],o['type'],o.get('kind') or o.get('text') or o.get('image'))
