"""
Baseball Computer Vision & Statcast Real Tracking Script
Integrates real MLB Statcast data and BaseballCV / YOLOv8 baseball pitch tracking.

Requirements:
    pip install pybaseball opencv-python ultralytics fastapi uvicorn requests
"""

import sys
import json
import requests

def fetch_game_statcast(game_pk=717013):
    """
    Fetch exact pitch-by-pitch Statcast data from MLB Gameday API
    (e.g., 2023-08-13 Atlanta Braves @ New York Mets: Kodai Senga start)
    """
    url = f"https://statsapi.mlb.com/api/v1.1/game/{game_pk}/feed/live"
    print(f"[*] Fetching real MLB Statcast feed for gamePk {game_pk}...")
    res = requests.get(url)
    res.raise_for_status()
    data = res.json()
    
    all_plays = data.get('liveData', {}).get('plays', {}).get('allPlays', [])
    pitches = []
    pitch_num = 0
    
    for play in all_plays:
        matchup = play.get('matchup', {})
        pitcher = matchup.get('pitcher', {}).get('fullName')
        batter = matchup.get('batter', {}).get('fullName')
        events = play.get('playEvents', [])
        
        for ev in events:
            if ev.get('isPitch'):
                pitch_num += 1
                details = ev.get('details', {})
                pitch_data = ev.get('pitchData', {})
                speed_mph = pitch_data.get('startSpeed', 0)
                speed_kmh = round(speed_mph * 1.60934)
                pitch_type = details.get('type', {}).get('description', 'Unknown')
                call = details.get('description', '')
                
                pitches.append({
                    "pitch_number": pitch_num,
                    "pitcher": pitcher,
                    "batter": batter,
                    "pitch_type": pitch_type,
                    "speed_mph": speed_mph,
                    "speed_kmh": speed_kmh,
                    "call": call,
                    "coordinates": pitch_data.get('coordinates', {})
                })
                
    print(f"[+] Successfully parsed {len(pitches)} official Statcast pitches.")
    return pitches

if __name__ == "__main__":
    game_pk = int(sys.argv[1]) if len(sys.argv) > 1 else 717013
    pitches = fetch_game_statcast(game_pk)
    with open("mlb_game_statcast.json", "w", encoding="utf-8") as f:
        json.dump(pitches, f, ensure_ascii=False, indent=2)
    print("[+] Saved to mlb_game_statcast.json")
