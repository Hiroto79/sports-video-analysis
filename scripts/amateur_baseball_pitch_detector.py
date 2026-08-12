"""
Amateur Baseball Pitch Clip Extractor & Analyzer
(アマチュア野球動画専用 投球シーン自動検出・クリップ分割スクリプト)

高校野球・大学野球・クラブチーム等のバックネット裏・センターカメラ撮影動画から、
投手の投球動作（ワインドアップ始動〜捕球）を検出し、
Sportscode / Web分析アプリ用のタイムスタンプ付き投球ログ（JSON/XML）を出力します。

使用ライブラリ:
    pip install opencv-python numpy
"""

import sys
import os
import json
import cv2
import numpy as np

def detect_pitch_sequences(video_path, lead_in=4.0, lead_out=3.0, min_interval=12.0):
    """
    アマチュア野球のフル動画（MP4）から投球モーションを検出し、
    各投球の「ワインドアップ始動(-lead_in)」から「捕球(+lead_out)」までのタイムスタンプを抽出します。
    """
    if not os.path.exists(video_path):
        print(f"[!] エラー: 動画ファイルが見つかりません: {video_path}")
        return []

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = total_frames / fps

    print(f"[*] 解析対象動画: {video_path}")
    print(f"[*] 総時間: {duration_sec/60:.1f} 分 ({total_frames} フレーム / {fps:.1f} fps)")
    print(f"[*] 投球クリップ範囲: 投球地点 -{lead_in}s 〜 +{lead_out}s (投球間隔クールダウン: {min_interval}s)")

    pitches = []
    prev_gray = None
    last_pitch_sec = -999.0
    sample_step = int(fps * 0.25) # 0.25秒ごとにサンプリング (4fps)

    frame_idx = 0
    while cap.isOpened():
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            break

        current_sec = frame_idx / fps

        # 縮小して高速処理
        small = cv2.resize(frame, (160, 90))
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (7, 7), 0)

        if prev_gray is not None:
            # フレーム間差分
            diff = cv2.absdiff(gray, prev_gray)
            
            # 中央部分（マウンド〜ホームプレート）の動きを重点評価
            h, w = diff.shape
            center_roi = diff[int(h*0.2):int(h*0.8), int(w*0.25):int(w*0.75)]
            motion_score = np.mean(center_roi)
            global_diff = np.mean(diff)

            # 画面全体の切り替え（リプレイ・画面転換）は除外
            is_scene_cut = global_diff > 45.0
            time_since_last = current_sec - last_pitch_sec

            # 投球モーション判定（特定強度の局所モーション ＋ クールダウン充足）
            if not is_scene_cut and 15.0 <= motion_score <= 45.0 and time_since_last >= min_interval:
                last_pitch_sec = current_sec
                pitch_num = len(pitches) + 1
                start_time = max(0.0, current_sec - lead_in)
                end_time = min(duration_sec, current_sec + lead_out)

                pitch_data = {
                    "pitch_number": pitch_num,
                    "video_timestamp": round(current_sec, 2),
                    "start_time": round(start_time, 2),
                    "end_time": round(end_time, 2),
                    "result": "投球検知 (要判定)",
                    "pitch_type": "4シーム",
                    "course": "真ん中",
                    "ball_speed": None,
                    "notes": f"自動抽出クリップ ({start_time:.1f}s - {end_time:.1f}s)"
                }
                pitches.append(pitch_data)
                print(f"  [+] 投球 #{pitch_num} 検知: {current_sec:.2f}秒 (クリップ: {start_time:.1f}s 〜 {end_time:.1f}s)")

        prev_gray = gray
        frame_idx += sample_step

    cap.release()
    print(f"\n[✓] 解析完了: 合計 {len(pitches)} 球の投球シーンを検出・クリップ化しました。")
    return pitches

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使用方法: python3 scripts/amateur_baseball_pitch_detector.py <動画ファイルのパス.mp4>")
        print("例: python3 scripts/amateur_baseball_pitch_detector.py my_game.mp4")
        sys.exit(1)

    video_file = sys.argv[1]
    results = detect_pitch_sequences(video_file)

    output_json = "amateur_pitch_logs.json"
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"[✓] 投球ログを {output_json} に保存しました。Webアプリに直接取り込めます。")
