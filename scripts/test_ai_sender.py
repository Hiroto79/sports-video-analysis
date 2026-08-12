#!/usr/bin/env python3
"""
SportsVideoAnalysis - AI Pitch Tagger テスト送信スクリプト
動画解析AIから投球データを送信するシミュレーター

【フィールド説明】
  pitch_number    : 投球番号 (1, 2, 3...)
  result          : 判定 ("Strike" / "Ball" / "Foul" / "InPlay")
  confidence      : AIの確信度 (0.0 ~ 1.0)
  ball_speed      : 球速 (km/h, 整数)
  pitch_type      : 球種 ("ストレート" / "スライダー" / "フォーク" etc.)
  course          : コース ("内角高め" / "外角低め" etc.) ← 省略可
  batted_ball     : 打球方向 ("センター" / "レフト" etc.) ← InPlay時のみ
  video_timestamp : 動画内の該当場面（秒）← ★ これが行クリック→シーク先になる
  notes           : メモ ← 省略可

使い方:
  python3 scripts/test_ai_sender.py
"""

import time
import json
import urllib.request

# Web版ローカル開発(5173) または Electron(3001) の両方を自動試行
TARGET_URLS = [
    "http://localhost:5173/api/add-stat",
    "http://localhost:3001/api/add-stat"
]

# ============================================================
# テスト投球データ
# video_timestamp = 動画の該当場面の秒数
# （実際のAI解析では動画のフレーム番号 / FPS で計算）
# ============================================================
PITCHES = [
    {
        "pitch_number": 1,
        "result": "Strike",
        "confidence": 0.92,
        "ball_speed": 145,
        "pitch_type": "ストレート",
        "course": "外角低め",
        "video_timestamp": 12.5,
        # 🎯 センターカメラ映像自動認識データ (OpenCommand)
        "camera_view": "center",
        "target_course": "外角低め",
        "actual_course": "外角低め",
        "miss_distance_cm": 3.8,
        "miss_distance_inch": 1.5,
        "is_opposite": False,
    },
    {
        "pitch_number": 2,
        "result": "Ball",
        "confidence": 0.78,
        "ball_speed": 143,
        "pitch_type": "ストレート",
        "course": "内角高め",
        "video_timestamp": 28.2,
        "camera_view": "center",
        "target_course": "外角低め",
        "actual_course": "内角高め",
        "miss_distance_cm": 28.5,
        "miss_distance_inch": 11.2,
        "is_opposite": True,
    },
    {
        "pitch_number": 3,
        "result": "Foul",
        "confidence": 0.88,
        "ball_speed": 133,
        "pitch_type": "スライダー",
        "course": "外角低め",
        "video_timestamp": 45.0,
        "camera_view": "center",
        "target_course": "外角低め",
        "actual_course": "外角低め",
        "miss_distance_cm": 5.2,
        "miss_distance_inch": 2.0,
        "is_opposite": False,
    },
        "course": "外角",
        "video_timestamp": 45.0,
    },
    {
        "pitch_number": 4,
        "result": "Strike",
        "confidence": 0.95,
        "ball_speed": 141,
        "pitch_type": "フォーク",
        "course": "低め",
        "video_timestamp": 61.8,
    },
    {
        "pitch_number": 5,
        "result": "InPlay",
        "confidence": 0.81,
        "ball_speed": 139,
        "pitch_type": "カットボール",
        "course": "真ん中",
        "batted_ball": "センター",
        "video_timestamp": 78.3,
        "notes": "センター前ヒット"
    },
    {
        "pitch_number": 6,
        "result": "Ball",
        "confidence": 0.55,
        "ball_speed": 136,
        "pitch_type": "カーブ",
        "video_timestamp": 95.1,
    },
]

def send_pitch(data: dict):
    """1球分のデータを送信する"""
    success = False
    for url in TARGET_URLS:
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(data).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=2.0) as res:
                json.loads(res.read().decode("utf-8"))
                ts = data.get("video_timestamp", "-")
                print(
                    f"  ✅ 投球 #{data['pitch_number']:2d} | "
                    f"{data['result']:7s} | "
                    f"{int(data['confidence']*100):3d}% | "
                    f"{data.get('ball_speed', '-'):3}km/h | "
                    f"{data.get('pitch_type',''):8s} | "
                    f"📍 {ts}秒  → {url}"
                )
                success = True
                break
        except Exception:
            continue

    if not success:
        print(
            f"  ❌ 投球 #{data['pitch_number']} 送信失敗 "
            f"(アプリが起動しているか確認: http://localhost:5173)"
        )

def main():
    print("=" * 70)
    print("🚀 AI Pitch Tagger - テスト送信スクリプト")
    print("=" * 70)
    print(f"  送信先: {TARGET_URLS[0]} (または {TARGET_URLS[1]})")
    print(f"  投球数: {len(PITCHES)} 球")
    print()
    print("  ※ video_timestamp = オーガナイザーで行クリック時のシーク先(秒)")
    print("  ※ 実際のAIではフレーム番号/FPSで計算してこのフィールドに入れる")
    print("=" * 70)
    print()

    for p in PITCHES:
        interval = 1.5
        print(f"⏳ {interval}秒後に 投球 #{p['pitch_number']} を送信...")
        time.sleep(interval)
        send_pitch(p)

    print()
    print("=" * 70)
    print("🎉 全投球の送信完了！")
    print()
    print("次のステップ:")
    print("  1. アプリの「🤖 AI自動受信・修正」タブで受信確認")
    print("  2. 「📁 動画＆タグ一覧 (オーガナイザー)」で列を確認")
    print("     球種 / 結果 / 球速 / 確信度 / AI判定 が自動タグとして並ぶ")
    print("  3. 動画を読み込んだ状態で行クリック → 該当シーンにジャンプ")
    print("=" * 70)

if __name__ == "__main__":
    main()
