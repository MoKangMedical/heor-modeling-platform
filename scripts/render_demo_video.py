import math
import os
from pathlib import Path

import numpy as np
from moviepy import AudioClip, AudioFileClip, VideoClip, concatenate_audioclips
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "site" / "assets" / "demo-video"
OUT_DIR.mkdir(parents=True, exist_ok=True)

WIDTH = 1920
HEIGHT = 1080
DURATION = 60
FPS = 24

FONT_PATH = "/System/Library/Fonts/Hiragino Sans GB.ttc"
FONT_TITLE = ImageFont.truetype(FONT_PATH, 64)
FONT_BODY = ImageFont.truetype(FONT_PATH, 36)
FONT_SMALL = ImageFont.truetype(FONT_PATH, 26)

PALETTE = {
    "bg_top": (236, 242, 247),
    "bg_bottom": (251, 252, 254),
    "ink": (20, 36, 58),
    "muted": (88, 108, 132),
    "accent": (47, 111, 237),
    "accent_2": (124, 92, 224),
    "accent_3": (24, 166, 160),
    "accent_4": (217, 133, 44),
    "card": (255, 255, 255),
    "card_soft": (246, 249, 252),
}

SCENES = [
    {
        "title": "把真实证据带进模型",
        "subtitle": "证据来自临床输入，不再是表格拼接。",
        "stage": "证据整理",
        "color": PALETTE["accent"],
        "metrics": ["KM / Survival", "Hazard Table", "证据对象已标准化"],
    },
    {
        "title": "上传后自动对齐与校验",
        "subtitle": "每一条曲线都有来源、版本与可追溯记录。",
        "stage": "Evidence Workbench",
        "color": PALETTE["accent"],
        "metrics": ["时间轴对齐", "字段一致性", "证据对象可复用"],
    },
    {
        "title": "编译为概率函数层",
        "subtitle": "Markov / PSA 使用同一套概率运行时。",
        "stage": "Probability Runtime",
        "color": PALETTE["accent_2"],
        "metrics": ["Event Probabilities", "函数可调用", "参数来源可查"],
    },
    {
        "title": "临床校准拉回真实世界",
        "subtitle": "Observed vs Predicted 在一张图上对齐。",
        "stage": "Calibration Studio",
        "color": PALETTE["accent_2"],
        "metrics": ["RMSE 0.018", "Best-fit 参数", "偏差一目了然"],
    },
    {
        "title": "运行模拟与动态状态流",
        "subtitle": "队列在健康状态间流动，成本与 QALY 同步呈现。",
        "stage": "Simulation Lab",
        "color": PALETTE["accent_3"],
        "metrics": ["Markov Cohort", "PSA Scatter", "CEAC 输出"],
    },
    {
        "title": "结果可审阅、可交付",
        "subtitle": "把结论、轨迹、产物整理成一张审阅页。",
        "stage": "Review Surface",
        "color": PALETTE["accent_4"],
        "metrics": ["结论卡片", "队列轨迹", "产物包下载"],
    },
]

SUBTITLES = [
    (0, 10, "在真实世界里，一条生存曲线背后，是医生的选择、患者的等待、团队的解释。\n我们把这些证据带进平台，让建模从一开始就可追溯。"),
    (10, 20, "上传 KM、生存表或风险表，系统自动对齐时间、校验字段，\n生成可复用的证据对象。"),
    (20, 30, "证据被编译成可调用的概率函数，Markov 和 PSA 不再靠手工换算，\n每一个参数都有来源。"),
    (30, 40, "临床校准把模型拉回真实世界，观察值和预测值在同一张图上对齐，\n偏差一目了然。"),
    (40, 50, "运行模拟后，队列在状态间动态流动，成本、QALY 与不确定性一起呈现。"),
    (50, 60, "最后，这些结果被整理成可审阅、可解释、可交付的报告。\n让决策更快，也更让人信服。"),
]


def lerp(a, b, t):
    return int(a + (b - a) * t)


def gradient_background():
    gradient = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
    for y in range(HEIGHT):
        t = y / (HEIGHT - 1)
        gradient[y, :, 0] = lerp(PALETTE["bg_top"][0], PALETTE["bg_bottom"][0], t)
        gradient[y, :, 1] = lerp(PALETTE["bg_top"][1], PALETTE["bg_bottom"][1], t)
        gradient[y, :, 2] = lerp(PALETTE["bg_top"][2], PALETTE["bg_bottom"][2], t)
    return gradient


BACKGROUND = gradient_background()


def draw_card(draw, box, fill, outline=None, radius=28):
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline)
    draw.rounded_rectangle((x0 + 6, y0 + 6, x1 - 6, y1 - 6), radius=radius - 8, outline=None)


def draw_chart(draw, box, color, t):
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=18, outline=(210, 220, 232), fill=(255, 255, 255))
    grid_color = (226, 234, 244)
    for i in range(6):
        y = y0 + 20 + i * (y1 - y0 - 40) / 5
        draw.line([(x0 + 24, y), (x1 - 24, y)], fill=grid_color, width=2)

    points = []
    for i in range(8):
        x = x0 + 40 + i * (x1 - x0 - 80) / 7
        phase = t + i * 0.4
        y = y0 + 60 + (y1 - y0 - 140) * (0.2 + 0.15 * math.sin(phase))
        points.append((x, y))
    draw.line(points, fill=color, width=4)
    for x, y in points[::2]:
        draw.ellipse((x - 6, y - 6, x + 6, y + 6), fill=color)


def subtitle_for_time(t):
    for start, end, text in SUBTITLES:
        if start <= t < end:
            return text
    return ""


def make_frame(t):
    scene_idx = min(int(t // 10), len(SCENES) - 1)
    scene = SCENES[scene_idx]
    t_in_scene = t - scene_idx * 10

    frame = BACKGROUND.copy()
    image = Image.fromarray(frame)
    draw = ImageDraw.Draw(image)

    # Header
    draw.text((88, 60), "HEOR Modeling Platform", font=FONT_SMALL, fill=PALETTE["muted"])
    draw.text((88, 104), scene["title"], font=FONT_TITLE, fill=PALETTE["ink"])
    draw.text((88, 180), scene["subtitle"], font=FONT_BODY, fill=PALETTE["muted"])

    # Stage pill
    pill_box = (88, 240, 88 + 320, 288)
    draw.rounded_rectangle(pill_box, radius=22, fill=(240, 244, 250))
    draw.text((108, 248), scene["stage"], font=FONT_SMALL, fill=scene["color"])

    # Main card
    card_box = (88, 320, 1080, 920)
    draw_card(draw, card_box, PALETTE["card"], outline=(220, 230, 240))

    # Left metrics
    draw.text((124, 360), "关键节点", font=FONT_SMALL, fill=PALETTE["muted"])
    for i, metric in enumerate(scene["metrics"]):
        y = 410 + i * 70
        draw.rounded_rectangle((124, y, 470, y + 52), radius=16, fill=(246, 249, 252))
        draw.text((146, y + 12), metric, font=FONT_SMALL, fill=PALETTE["ink"])

    # Right chart
    chart_box = (520, 380, 1030, 860)
    draw_chart(draw, chart_box, scene["color"], t_in_scene * 0.7)

    # Status pulse
    pulse = 0.5 + 0.5 * math.sin(t_in_scene * 2.2)
    pulse_color = (
        int(scene["color"][0] * pulse + 255 * (1 - pulse)),
        int(scene["color"][1] * pulse + 255 * (1 - pulse)),
        int(scene["color"][2] * pulse + 255 * (1 - pulse)),
    )
    draw.rounded_rectangle((1200, 360, 1820, 920), radius=28, fill=(250, 252, 255), outline=(220, 230, 242))
    draw.text((1240, 392), "当前运行概览", font=FONT_SMALL, fill=PALETTE["muted"])
    draw.rounded_rectangle((1240, 450, 1710, 520), radius=22, fill=(246, 249, 252))
    draw.text((1264, 472), "模型状态：已更新", font=FONT_SMALL, fill=PALETTE["ink"])
    draw.ellipse((1740, 468, 1760, 488), fill=pulse_color)
    draw.rounded_rectangle((1240, 560, 1780, 640), radius=22, fill=(246, 249, 252))
    draw.text((1264, 582), "可交付产物：已整理", font=FONT_SMALL, fill=PALETTE["ink"])
    draw.rounded_rectangle((1240, 680, 1720, 750), radius=22, fill=(246, 249, 252))
    draw.text((1264, 702), "审阅状态：准备就绪", font=FONT_SMALL, fill=PALETTE["ink"])

    # Subtitle bar
    subtitle = subtitle_for_time(t)
    if subtitle:
        bar_box = (120, 948, 1800, 1040)
        draw.rounded_rectangle(bar_box, radius=24, fill=(16, 28, 48))
        draw.text((150, 968), subtitle, font=FONT_SMALL, fill=(247, 251, 255))

    return np.array(image)


def build_audio():
    narration_path = OUT_DIR / "narration.txt"
    audio_path = OUT_DIR / "narration.aiff"
    if audio_path.exists():
        return audio_path

    text = narration_path.read_text().replace("\n\n", "\n")
    cmd = f"say -v Tingting -r 168 -o '{audio_path}' \"{text}\""
    os.system(cmd)
    return audio_path


def main():
    audio_path = build_audio()
    video = VideoClip(make_frame, duration=DURATION).with_fps(FPS)

    poster_path = OUT_DIR / "demo-poster.png"
    if not poster_path.exists():
        Image.fromarray(make_frame(0)).save(poster_path)

    if audio_path.exists():
        audio = AudioFileClip(str(audio_path))
        if audio.duration < DURATION:
            padding = AudioClip(lambda t: 0, duration=DURATION - audio.duration, fps=44100)
            audio = concatenate_audioclips([audio, padding])
        elif audio.duration > DURATION:
            audio = audio.subclip(0, DURATION)
        video = video.with_audio(audio)

    mp4_path = OUT_DIR / "demo.mp4"
    webm_path = OUT_DIR / "demo.webm"

    if not mp4_path.exists():
        video.write_videofile(
            str(mp4_path),
            codec="libx264",
            audio_codec="aac",
            fps=FPS,
            threads=4,
            preset="medium",
            bitrate="4500k",
        )
    if not webm_path.exists():
        video.write_videofile(
            str(webm_path),
            codec="libvpx-vp9",
            audio_codec="libvorbis",
            fps=FPS,
            threads=4,
            bitrate="3200k",
        )


if __name__ == "__main__":
    main()
