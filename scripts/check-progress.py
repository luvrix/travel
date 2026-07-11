#!/usr/bin/env python3
import json, sys, time, os

progress_file = os.path.join(os.path.dirname(__file__), 'osm-progress.json')

while True:
    try:
        with open(progress_file) as f:
            d = json.load(f)
        done = len(d.get('done', []))
        attrs = len(d.get('attractions', []))
        cities = len(d.get('cities', []))
        print(f'{done}/34 省  景点:{attrs}  城市:{cities}', flush=True)
        if done >= 34:
            print('DONE', flush=True)
            sys.exit(0)
    except Exception as e:
        print(f'read error: {e}', flush=True)
    time.sleep(15)
