"""Text matches for human review only. Never writes the editorial link table."""
import argparse
import json
import unicodedata
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def normalize(text):
    return ''.join(c for c in unicodedata.normalize('NFKD',text).casefold() if c.isalnum())


def candidates(index, volumes):
    names={}
    for period,data in volumes.items():
        for id,p in data['people'].items():
            aliases=p.get('aliases',[])
            if isinstance(aliases,str): aliases=[aliases]
            terms=[p['zh'],p.get('latin',''),p.get('greek',''),*aliases]
            names[period+':'+id]=[name for name in terms if len(normalize(name))>=3]
    rows=[]
    for id,e in index['entries'].items():
        text=normalize(e['title']+' '+e['text'])
        linked={p['period']+':'+p['person'] for p in e['people']}
        hits=[dict(person=key,matches=[n for n in ns if normalize(n) in text]) for key,ns in names.items()
              if key not in linked and key.startswith(e['period']+':') and any(normalize(n) in text for n in ns)]
        if hits:rows.append(dict(event=id,candidates=hits,status='unreviewed',note='文字提名仅供审阅：未确认身份、参与角色或行动地点，不进入发布关联。'))
    return rows


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',required=True,type=Path,help='Write a separate review report; never links.json')
    args=parser.parse_args()
    target=args.output.resolve()
    if target.is_relative_to(ROOT/'data-source') or target.is_relative_to(ROOT/'data') or target.is_relative_to(ROOT/'site'):
        parser.error('Review reports must stay outside published and editorial data directories')
    index=json.loads((ROOT/'data/events/index.json').read_text(encoding='utf8'))
    volumes={p['id']:json.loads((ROOT/f'data/{p["id"]}/records.json').read_text(encoding='utf8')) for p in index['periods']}
    report=dict(method='Text matches only. No edges or identity merges are inferred.',version=index['version'],candidates=candidates(index,volumes))
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(f'{len(report["candidates"])} event rows for manual review: {target}')
