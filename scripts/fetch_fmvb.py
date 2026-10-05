import json,re,sys
from datetime import datetime
from urllib.request import Request,urlopen
from html.parser import HTMLParser

SOURCES={
"guadarrama": "https://fmvoley.com/clasificaciones-y-resultados/federadas_senior_femenino_1%C2%AA_division_aut_zonal_liga_regular_grupo_a",
"majadahonda": "https://fmvoley.com/clasificaciones-y-resultados/federadas_senior_femenino_2%C2%AA_division_aut_preferente_liga_regular_grupo_a"
}
ALIASES={"guadarrama":["CV Guadarrama","Hogares CV Guadarrama","Voleibol Guadarrama"],"majadahonda":["CV Majadahonda A","CV Majadahonda"]}
class P(HTMLParser):
 def __init__(self): super().__init__(); self.buf=[]
 def handle_data(self,d): self.buf.append(d)
 def text(self): return " ".join(x.strip() for x in self.buf if x.strip())
def clean(s): return re.sub(r"\\s+"," ",s or "").strip()
def fetch(url):
 req=Request(url,headers={"User-Agent":"Mozilla/5.0 calendario-voleibol-github"})
 with urlopen(req,timeout=30) as r:return r.read().decode("utf-8","ignore")
def parse(url,club):
 html=fetch(url); p=P(); p.feed(html); text=clean(p.text())
 aliases=ALIASES[club];
 if not any(a.lower() in text.lower() for a in aliases):
  raise RuntimeError(f"No se encontró {club} en la respuesta FMVB")
 # Extract repeated match-like blocks from visible text. The FMVB page exposes date, time, teams, venue and match number.
 dates=re.findall(r"\\b(\\d{2}-\\d{2}-\\d{4})\\b",text)
 times=re.findall(r"\\b(\\d{1,2}:\\d{2})h?\\b",text)
 nums=re.findall(r"Num\\.?\\s*partido:?\\s*(\\d+)",text,re.I)
 games=[]
 # Use table/list rows where possible; fallback to date/time/team windows.
 for m in re.finditer(r"(\\d{2}-\\d{2}-\\d{4})(?:\\s+|.{0,120}?)(\\d{1,2}:\\d{2})h?",text):
  d=m.group(1);t=m.group(2); start=max(0,m.start()-500); end=min(len(text),m.end()+900); block=text[start:end]
  hit=None
  for a in aliases:
   if a.lower() in block.lower(): hit=a;break
  if not hit: continue
  before=block.lower().find(hit.lower()); after=block[before+len(hit):]
  parts=re.split(r"\\s{2,}| Pabell[oó]n:| Num\\.? partido:",after,flags=re.I)
  opponent=clean(parts[0]) if parts else ""
  opponent=re.sub(r"^(?:vs?\\s+|[-–—])","",opponent,flags=re.I)
  if not opponent or len(opponent)>120: opponent="Rival"
  venue_m=re.search(r"Pabell[oó]n:?\\s*([^N]+?)(?=Num\\.? partido:|$)",block,re.I)
  venue=clean(venue_m.group(1)) if venue_m else ""
  home=block.lower().find(hit.lower()) < block.lower().find(opponent.lower()) if opponent.lower() in block.lower() else True
  dt=datetime.strptime(d+" "+t,"%d-%m-%Y %H:%M").isoformat(timespec="seconds")
  games.append({"id":nums[len(games)] if len(nums)>len(games) else f"{club}-{d}-{t}-{len(games)}","dateTime":dt,"time":t,"opponent":opponent,"venue":venue,"home":home,"result":""})
 # Deduplicate
 out=[];seen=set()
 for g in games:
  k=(g["dateTime"],g["opponent"],g["venue"])
  if k not in seen:seen.add(k);out.append(g)
 return out

def main():
 result={}
 for club,url in SOURCES.items(): result[club]=parse(url,club)
 out="data/partidos.json";open(out,"w",encoding="utf-8").write(json.dumps(result,ensure_ascii=False,indent=2))
 print(json.dumps({k:len(v) for k,v in result.items()}))
main()
