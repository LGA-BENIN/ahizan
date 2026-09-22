import json

with open('/tmp/preset3.json', 'r') as f:
    data = json.load(f)

print(f"Total sections: {len(data)}")
for i, s in enumerate(data):
    stype = s.get('type')
    sid = s.get('id')
    cfg = s.get('config') or s.get('dataJson') or {}
    if isinstance(cfg, str):
        try:
            cfg = json.loads(cfg)
        except:
            cfg = {}
    title = cfg.get('heading') or cfg.get('title') or cfg.get('name') or ''
    loc_src = cfg.get('locationSource')
    m_id = cfg.get('marketId')
    l_id = cfg.get('locationId')
    print(f"[{i}] type={stype} | id={sid} | title='{title}' | locationSource={loc_src} | marketId={m_id} | locationId={l_id}")
