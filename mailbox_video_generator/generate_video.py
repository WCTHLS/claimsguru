import os
import sys
import asyncio
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import edge_tts
from moviepy import AudioFileClip, VideoClip, concatenate_videoclips

BASE_DIR = r"c:\Project\claimsguru\mailbox_video_generator"
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
OUTPUT_VIDEO = os.path.join(BASE_DIR, "mailbox_async_agent_demo.mp4")

os.makedirs(ASSETS_DIR, exist_ok=True)

# 1080p Resolution
WIDTH = 1920
HEIGHT = 1080
FPS = 30

SCENES = [
    {
        "id": "scene_1",
        "badge": "THE PROBLEM",
        "title": "The Waiting Game",
        "voiceover": "Onboarding new mailboxes and configuring routing queues shouldn't put your day on hold. But today, users and admins are often trapped in live chat sessions, forced to wait while slow backend provisioning processes run one by one.",
        "voice": "en-US-ChristopherNeural"
    },
    {
        "id": "scene_2",
        "badge": "THE SOLUTION",
        "title": "Meet the Agent & Request ID",
        "voiceover": "Meet the Mailbox Async Agent—a smarter way to automate mailbox onboarding without the wait. In just a few seconds, users submit their details and immediately receive a unique Request ID. No waiting in the chat required.",
        "voice": "en-US-ChristopherNeural"
    },
    {
        "id": "scene_3",
        "badge": "BACKGROUND ENGINE",
        "title": "Transparent Real-Time Tracking",
        "voiceover": "While the user moves on with their day, the asynchronous engine takes over behind the scenes—creating queues, configuring routing rules, and enabling mailboxes in parallel. Want to check the status? Just enter your Request ID anytime for complete, real-time visibility.",
        "voice": "en-US-ChristopherNeural"
    },
    {
        "id": "scene_4",
        "badge": "BUSINESS VALUE",
        "title": "Zero Wait Time. Full Visibility.",
        "voiceover": "Once all activities are successfully finished, the user receives a single, consolidated completion email. No stuck conversations, full transparency, and zero wasted time. That’s seamless mailbox provisioning with the Mailbox Async Agent.",
        "voice": "en-US-ChristopherNeural"
    }
]

async def generate_all_voiceovers():
    print("Generating neural TTS voiceovers with edge-tts...")
    audio_paths = {}
    for sc in SCENES:
        out_audio = os.path.join(ASSETS_DIR, f"{sc['id']}_voice.mp3")
        communicate = edge_tts.Communicate(sc['voiceover'], sc['voice'], rate="+0%")
        await communicate.save(out_audio)
        audio_paths[sc['id']] = out_audio
        print(f"Generated: {out_audio}")
    return audio_paths

def get_font(size, bold=False):
    font_paths = [
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibrib.ttf" if bold else r"C:\Windows\Fonts\calibri.ttf",
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def draw_header(draw, scene_num, badge_text, title_text):
    # Top Tag
    draw.rounded_rectangle([100, 50, 420, 95], radius=10, fill=(30, 41, 59), outline=(59, 130, 246), width=2)
    font_badge = get_font(22, bold=True)
    draw.text((120, 60), f"SCENE {scene_num}: {badge_text}", fill=(96, 165, 250), font=font_badge)
    
    # Title
    font_title = get_font(44, bold=True)
    draw.text((100, 115), title_text, fill=(248, 250, 252), font=font_title)
    
    # Brand logo top right
    font_brand = get_font(24, bold=True)
    draw.rounded_rectangle([1520, 55, 1820, 105], radius=12, fill=(15, 23, 42), outline=(100, 116, 139), width=1)
    draw.text((1545, 68), "⚡ Mailbox Async Agent", fill=(226, 232, 240), font=font_brand)

def draw_subtitles(draw, text, current_progress=1.0):
    # Modern subtitle card at bottom
    box_w = 1720
    box_h = 130
    x0 = 100
    y0 = 900
    draw.rounded_rectangle([x0, y0, x0 + box_w, y0 + box_h], radius=16, fill=(15, 23, 42, 230), outline=(51, 65, 85), width=2)
    
    # Subtitle icon / mic indicator
    draw.ellipse([x0 + 30, y0 + 35, x0 + 55, y0 + 60], fill=(239, 68, 68) if int(current_progress * 10) % 2 == 0 else (220, 38, 38))
    font_sub_label = get_font(20, bold=True)
    draw.text((x0 + 70, y0 + 35), "VOICEOVER", fill=(148, 163, 184), font=font_sub_label)
    
    # Text wrapping
    font_text = get_font(25, bold=False)
    words = text.split(" ")
    lines = []
    curr = []
    for w in words:
        curr.append(w)
        test_line = " ".join(curr)
        bbox = draw.textbbox((0, 0), test_line, font=font_text)
        if (bbox[2] - bbox[0]) > 1450:
            curr.pop()
            lines.append(" ".join(curr))
            curr = [w]
    if curr:
        lines.append(" ".join(curr))
    
    # Draw up to 2 lines
    y_text = y0 + 30 if len(lines) == 1 else y0 + 20
    for idx, l in enumerate(lines[:2]):
        draw.text((x0 + 240, y_text + (idx * 40)), f"\"{l}\"", fill=(241, 245, 249), font=font_text)

# --- Frame Renderers for Each Scene ---

def render_scene_1_frame(t, duration):
    # Scene 1: The Problem (The Waiting Game)
    img = Image.new("RGB", (WIDTH, HEIGHT), color=(11, 15, 25))
    draw = ImageDraw.Draw(img)
    
    # Background subtle grid pattern
    for x in range(0, WIDTH, 80):
        draw.line([(x, 0), (x, HEIGHT)], fill=(18, 26, 43), width=1)
    for y in range(0, HEIGHT, 80):
        draw.line([(0, y), (WIDTH, y)], fill=(18, 26, 43), width=1)
        
    draw_header(draw, 1, "THE PROBLEM", "Synchronous Live-Chat Bottleneck")
    
    # Laptop / App Window Card
    card_x0, card_y0, card_w, card_h = 360, 200, 1200, 640
    draw.rounded_rectangle([card_x0, card_y0, card_x0 + card_w, card_y0 + card_h], radius=20, fill=(19, 24, 38), outline=(239, 68, 68), width=3)
    
    # Window Top Bar
    draw.rounded_rectangle([card_x0, card_y0, card_x0 + card_w, card_y0 + 60], radius=20, fill=(30, 41, 59))
    draw.rectangle([card_x0, card_y0 + 30, card_x0 + card_w, card_y0 + 60], fill=(30, 41, 59))
    draw.ellipse([card_x0 + 25, card_y0 + 22, card_x0 + 40, card_y0 + 37], fill=(239, 68, 68))
    draw.ellipse([card_x0 + 50, card_y0 + 22, card_x0 + 65, card_y0 + 37], fill=(245, 158, 11))
    draw.ellipse([card_x0 + 75, card_y0 + 22, card_x0 + 90, card_y0 + 37], fill=(16, 185, 129))
    
    font_bar = get_font(22, bold=True)
    draw.text((card_x0 + 120, card_y0 + 18), "Live Support Agent Session • Waiting for Backend Provisioning", fill=(203, 213, 225), font=font_bar)
    
    # Chat message 1 (User request)
    draw.rounded_rectangle([card_x0 + 100, card_y0 + 100, card_x0 + 750, card_y0 + 170], radius=15, fill=(37, 99, 235))
    draw.text((card_x0 + 125, card_y0 + 120), "User: Setup new Sales Mailboxes and 5 Queues", fill=(255, 255, 255), font=get_font(24, bold=True))
    
    # Chat message 2 (System stuck response)
    draw.rounded_rectangle([card_x0 + 100, card_y0 + 200, card_x0 + 1100, card_y0 + 380], radius=18, fill=(30, 41, 59), outline=(71, 85, 105), width=2)
    draw.text((card_x0 + 130, card_y0 + 225), "System: Setting up mailbox and queues... please wait.", fill=(254, 240, 138), font=get_font(28, bold=True))
    draw.text((card_x0 + 130, card_y0 + 270), "⚠️  Please do not close or refresh this chat window.", fill=(248, 113, 113), font=get_font(22, bold=False))
    
    # Animated Spinning Spinner
    angle = (t * 360) % 360
    center_x = card_x0 + 600
    center_y = card_y0 + 480
    r = 45
    # Spinner arc
    draw.arc([center_x - r, center_y - r, center_x + r, center_y + r], start=angle, end=angle + 270, fill=(239, 68, 68), width=8)
    
    font_wait = get_font(24, bold=True)
    draw.text((center_x - 140, center_y + 65), "LIVE CHAT LOCKED (42m Elapsed)", fill=(239, 68, 68), font=font_wait)
    
    # Bottom warning badge
    draw.rounded_rectangle([card_x0 + 350, card_y0 + 580, card_x0 + 850, card_y0 + 625], radius=10, fill=(69, 10, 10), outline=(220, 38, 38), width=1)
    draw.text((card_x0 + 380, card_y0 + 590), "❌ Wasted User Time • Single-Threaded Bottleneck", fill=(254, 202, 202), font=get_font(20, bold=True))
    
    draw_subtitles(draw, SCENES[0]["voiceover"], t / duration)
    return np.array(img)

def render_scene_2_frame(t, duration):
    # Scene 2: The Solution (Meet the Agent & Request ID)
    img = Image.new("RGB", (WIDTH, HEIGHT), color=(10, 18, 30))
    draw = ImageDraw.Draw(img)
    
    # Grid
    for x in range(0, WIDTH, 80):
        draw.line([(x, 0), (x, HEIGHT)], fill=(16, 29, 48), width=1)
    for y in range(0, HEIGHT, 80):
        draw.line([(0, y), (WIDTH, y)], fill=(16, 29, 48), width=1)
        
    draw_header(draw, 2, "THE SOLUTION", "Asynchronous Onboarding with Request ID")
    
    card_x0, card_y0, card_w, card_h = 360, 200, 1200, 640
    draw.rounded_rectangle([card_x0, card_y0, card_x0 + card_w, card_y0 + card_h], radius=20, fill=(15, 23, 42), outline=(16, 185, 129), width=3)
    
    # Window Top Bar
    draw.rounded_rectangle([card_x0, card_y0, card_x0 + card_w, card_y0 + 60], radius=20, fill=(30, 41, 59))
    draw.rectangle([card_x0, card_y0 + 30, card_x0 + card_w, card_y0 + 60], fill=(30, 41, 59))
    draw.ellipse([card_x0 + 25, card_y0 + 22, card_x0 + 40, card_y0 + 37], fill=(16, 185, 129))
    draw.ellipse([card_x0 + 50, card_y0 + 22, card_x0 + 65, card_y0 + 37], fill=(59, 130, 246))
    draw.ellipse([card_x0 + 75, card_y0 + 22, card_x0 + 90, card_y0 + 37], fill=(139, 92, 246))
    
    font_bar = get_font(22, bold=True)
    draw.text((card_x0 + 120, card_y0 + 18), "⚡ Mailbox Async Agent • Instant Registration", fill=(241, 245, 249), font=font_bar)
    
    # Message 1
    draw.rounded_rectangle([card_x0 + 80, card_y0 + 90, card_x0 + 800, card_y0 + 160], radius=14, fill=(30, 58, 138))
    draw.text((card_x0 + 105, card_y0 + 110), "User: Onboard 10 Mailboxes + Routing Rules", fill=(255, 255, 255), font=get_font(24, bold=True))
    
    # Instant Green Checkmark Reply
    draw.rounded_rectangle([card_x0 + 80, card_y0 + 180, card_x0 + 1120, card_y0 + 490], radius=18, fill=(6, 78, 59, 180), outline=(52, 211, 153), width=2)
    
    # Pulsing checkmark badge
    pulse = int(5 * math.sin(t * 5))
    draw.ellipse([card_x0 + 120 - pulse, card_y0 + 220 - pulse, card_x0 + 200 + pulse, card_y0 + 300 + pulse], fill=(16, 185, 129))
    draw.text((card_x0 + 140, card_y0 + 230), "✓", fill=(255, 255, 255), font=get_font(52, bold=True))
    
    draw.text((card_x0 + 230, card_y0 + 220), "Request Successfully Accepted!", fill=(167, 243, 208), font=get_font(32, bold=True))
    draw.text((card_x0 + 230, card_y0 + 265), "Your task is queued in the asynchronous engine. No need to stay on this screen.", fill=(209, 250, 229), font=get_font(21, bold=False))
    
    # Request ID Box
    draw.rounded_rectangle([card_x0 + 120, card_y0 + 330, card_x0 + 1080, card_y0 + 450], radius=14, fill=(15, 23, 42), outline=(59, 130, 246), width=2)
    draw.text((card_x0 + 160, card_y0 + 355), "YOUR TRACKING NUMBER:", fill=(148, 163, 184), font=get_font(20, bold=True))
    draw.text((card_x0 + 160, card_y0 + 385), "Request ID: REQ-99281", fill=(96, 165, 250), font=get_font(38, bold=True))
    draw.rounded_rectangle([card_x0 + 850, card_y0 + 365, card_x0 + 1040, card_y0 + 415], radius=10, fill=(37, 99, 235))
    draw.text((card_x0 + 880, card_y0 + 378), "📋 Copied", fill=(255, 255, 255), font=get_font(20, bold=True))
    
    # Laptop Closed / User Free Badge
    draw.rounded_rectangle([card_x0 + 250, card_y0 + 530, card_x0 + 950, card_y0 + 600], radius=14, fill=(30, 41, 59), outline=(16, 185, 129), width=2)
    draw.text((card_x0 + 280, card_y0 + 550), "🚀 Immediate Return • User Can Safely Close The Chat", fill=(52, 211, 153), font=get_font(24, bold=True))
    
    draw_subtitles(draw, SCENES[1]["voiceover"], t / duration)
    return np.array(img)

def render_scene_3_frame(t, duration):
    # Scene 3: Background Action & Transparent Tracking
    img = Image.new("RGB", (WIDTH, HEIGHT), color=(10, 16, 28))
    draw = ImageDraw.Draw(img)
    
    for x in range(0, WIDTH, 80):
        draw.line([(x, 0), (x, HEIGHT)], fill=(18, 28, 46), width=1)
    for y in range(0, HEIGHT, 80):
        draw.line([(0, y), (WIDTH, y)], fill=(18, 28, 46), width=1)
        
    draw_header(draw, 3, "BACKGROUND ENGINE & TRACKING", "Parallel Cloud Execution & Real-Time Status")
    
    # Split Screen Left Side: Async Cloud Engine
    left_x0, left_y0, left_w, left_h = 100, 200, 830, 640
    draw.rounded_rectangle([left_x0, left_y0, left_x0 + left_w, left_y0 + left_h], radius=20, fill=(15, 23, 42), outline=(139, 92, 246), width=3)
    
    draw.rounded_rectangle([left_x0, left_y0, left_x0 + left_w, left_y0 + 60], radius=20, fill=(46, 16, 101))
    draw.rectangle([left_x0, left_y0 + 30, left_x0 + left_w, left_y0 + 60], fill=(46, 16, 101))
    draw.text((left_x0 + 30, left_y0 + 16), "⚙️ Cloud Async Engine (Parallel Tasks)", fill=(233, 213, 255), font=get_font(24, bold=True))
    
    tasks = [
        ("Creating Exchange Mailboxes", "✓ 100% DONE", (16, 185, 129)),
        ("Configuring Routing Queues", "✓ 100% DONE", (16, 185, 129)),
        ("Binding Security & Permissions", "⚙️ 75% IN PROGRESS", (245, 158, 11)),
        ("Final Health Verification", "⏳ PENDING", (148, 163, 184))
    ]
    for i, (name, status, col) in enumerate(tasks):
        ty = left_y0 + 90 + (i * 125)
        draw.rounded_rectangle([left_x0 + 30, ty, left_x0 + left_w - 30, ty + 105], radius=14, fill=(30, 41, 59), outline=(51, 65, 85), width=2)
        draw.text((left_x0 + 55, ty + 20), name, fill=(241, 245, 249), font=get_font(22, bold=True))
        draw.rounded_rectangle([left_x0 + 550, ty + 18, left_x0 + left_w - 55, ty + 58], radius=8, fill=(15, 23, 42))
        draw.text((left_x0 + 565, ty + 25), status, fill=col, font=get_font(18, bold=True))
        
        # Mini progress bar
        prog_w = 720
        fill_pct = [1.0, 1.0, 0.75 + 0.1 * math.sin(t * 3), 0.0][i]
        fill_pct = max(0.0, min(1.0, fill_pct))
        draw.rounded_rectangle([left_x0 + 55, ty + 70, left_x0 + 55 + prog_w, ty + 85], radius=6, fill=(15, 23, 42))
        if fill_pct > 0:
            draw.rounded_rectangle([left_x0 + 55, ty + 70, left_x0 + 55 + int(prog_w * fill_pct), ty + 85], radius=6, fill=col)
    
    # Split Screen Right Side: Real-Time Tracking on Mobile / Any Device
    right_x0, right_y0, right_w, right_h = 990, 200, 830, 640
    draw.rounded_rectangle([right_x0, right_y0, right_x0 + right_w, right_y0 + right_h], radius=20, fill=(15, 23, 42), outline=(59, 130, 246), width=3)
    
    draw.rounded_rectangle([right_x0, right_y0, right_x0 + right_w, right_y0 + 60], radius=20, fill=(30, 58, 138))
    draw.rectangle([right_x0, right_y0 + 30, right_x0 + right_w, right_y0 + 60], fill=(30, 58, 138))
    draw.text((right_x0 + 30, right_y0 + 16), "📱 Real-Time Status Check (Anytime / Anywhere)", fill=(219, 234, 254), font=get_font(24, bold=True))
    
    # User Query Box
    draw.rounded_rectangle([right_x0 + 40, right_y0 + 100, right_x0 + 790, right_y0 + 175], radius=14, fill=(30, 41, 59))
    draw.text((right_x0 + 65, right_y0 + 115), "Check status for REQ-99281", fill=(147, 197, 253), font=get_font(22, bold=True))
    draw.text((right_x0 + 65, right_y0 + 145), "Queried from Mobile Browser • 10 mins later", fill=(148, 163, 184), font=get_font(18, bold=False))
    
    # Progress Display Card
    draw.rounded_rectangle([right_x0 + 40, right_y0 + 205, right_x0 + 790, right_y0 + 600], radius=18, fill=(19, 24, 38), outline=(59, 130, 246), width=2)
    draw.text((right_x0 + 70, right_y0 + 240), "Provisioning In Progress", fill=(248, 250, 252), font=get_font(28, bold=True))
    draw.text((right_x0 + 70, right_y0 + 285), "Estimated remaining: 1 min 20 sec", fill=(148, 163, 184), font=get_font(20, bold=False))
    
    # Big Main Progress Bar
    pbar_w = 650
    progress_val = min(0.75 + (t / duration) * 0.15, 0.90)
    draw.rounded_rectangle([right_x0 + 70, right_y0 + 340, right_x0 + 70 + pbar_w, right_y0 + 380], radius=12, fill=(15, 23, 42), outline=(71, 85, 105), width=2)
    draw.rounded_rectangle([right_x0 + 70, right_y0 + 340, right_x0 + 70 + int(pbar_w * progress_val), right_y0 + 380], radius=12, fill=(59, 130, 246))
    
    font_pct = get_font(36, bold=True)
    draw.text((right_x0 + 70, right_y0 + 410), f"Overall Progress: {int(progress_val * 100)}%", fill=(96, 165, 250), font=font_pct)
    draw.text((right_x0 + 70, right_y0 + 480), "✔ Non-blocking background worker", fill=(52, 211, 153), font=get_font(22, bold=False))
    draw.text((right_x0 + 70, right_y0 + 525), "✔ Full audit log & telemetry preserved", fill=(52, 211, 153), font=get_font(22, bold=False))
    
    draw_subtitles(draw, SCENES[2]["voiceover"], t / duration)
    return np.array(img)

def render_scene_4_frame(t, duration):
    # Scene 4: The Result & Business Value
    img = Image.new("RGB", (WIDTH, HEIGHT), color=(10, 18, 30))
    draw = ImageDraw.Draw(img)
    
    for x in range(0, WIDTH, 80):
        draw.line([(x, 0), (x, HEIGHT)], fill=(18, 28, 48), width=1)
    for y in range(0, HEIGHT, 80):
        draw.line([(0, y), (WIDTH, y)], fill=(18, 28, 48), width=1)
        
    draw_header(draw, 4, "BUSINESS VALUE", "Consolidated Delivery & Complete Freedom")
    
    # Left Email Notification Card
    email_x0, email_y0, email_w, email_h = 100, 200, 830, 640
    draw.rounded_rectangle([email_x0, email_y0, email_x0 + email_w, email_y0 + email_h], radius=20, fill=(15, 23, 42), outline=(16, 185, 129), width=3)
    
    draw.rounded_rectangle([email_x0, email_y0, email_x0 + email_w, email_y0 + 60], radius=20, fill=(6, 78, 59))
    draw.rectangle([email_x0, email_y0 + 30, email_x0 + email_w, email_y0 + 60], fill=(6, 78, 59))
    draw.text((email_x0 + 30, email_y0 + 16), "✉️ Consolidated Notification Email", fill=(209, 250, 229), font=get_font(24, bold=True))
    
    # Email Content
    draw.text((email_x0 + 40, email_y0 + 90), "Subject: [COMPLETED] Mailbox & Queue Setup REQ-99281", fill=(248, 250, 252), font=get_font(22, bold=True))
    draw.line([(email_x0 + 40, email_y0 + 130), (email_x0 + email_w - 40, email_y0 + 130)], fill=(51, 65, 85), width=2)
    
    draw.text((email_x0 + 40, email_y0 + 155), "Hello Administrator,", fill=(203, 213, 225), font=get_font(20, bold=False))
    draw.text((email_x0 + 40, email_y0 + 195), "All requested resources have been fully provisioned:", fill=(203, 213, 225), font=get_font(20, bold=False))
    
    items = [
        "✅ 10/10 Mailboxes Created & Active",
        "✅ 5 Routing Queues Configured",
        "✅ Security Groups & Access Delegated",
        "✅ System Health: All Checks Passed"
    ]
    for i, it in enumerate(items):
        draw.text((email_x0 + 60, email_y0 + 245 + (i * 45)), it, fill=(52, 211, 153), font=get_font(22, bold=True))
        
    draw.rounded_rectangle([email_x0 + 40, email_y0 + 460, email_x0 + email_w - 40, email_y0 + 590], radius=14, fill=(30, 41, 59))
    draw.text((email_x0 + 65, email_y0 + 485), "One summary email. Zero intermediate noise.", fill=(254, 240, 138), font=get_font(22, bold=True))
    draw.text((email_x0 + 65, email_y0 + 525), "Audit report attached: Provisioning_Log_REQ99281.pdf", fill=(148, 163, 184), font=get_font(18, bold=False))
    
    # Right Side: Big Value Pillars
    val_x0, val_y0, val_w, val_h = 990, 200, 830, 640
    draw.rounded_rectangle([val_x0, val_y0, val_x0 + val_w, val_y0 + val_h], radius=20, fill=(15, 23, 42), outline=(59, 130, 246), width=3)
    
    pillars = [
        ("⚡ ZERO WAIT TIME", "No waiting in live chat screens or stuck sessions.", (59, 130, 246)),
        ("🔍 FULL VISIBILITY", "Track progress anytime via Request ID tracking.", (139, 92, 246)),
        ("🚀 FASTER ONBOARDING", "Parallel async execution cuts setup time by 80%.", (16, 185, 129))
    ]
    
    for i, (headline, desc, color) in enumerate(pillars):
        py = val_y0 + 40 + (i * 165)
        draw.rounded_rectangle([val_x0 + 35, py, val_x0 + val_w - 35, py + 135], radius=16, fill=(30, 41, 59), outline=color, width=2)
        draw.text((val_x0 + 65, py + 25), headline, fill=color, font=get_font(30, bold=True))
        draw.text((val_x0 + 65, py + 75), desc, fill=(226, 232, 240), font=get_font(21, bold=False))
        
    # Big CTA Outro Bar
    pulse = int(4 * math.sin(t * 4))
    draw.rounded_rectangle([val_x0 + 35, val_y0 + 535, val_x0 + val_w - 35, val_y0 + 605], radius=12, fill=(37, 99, 235))
    draw.text((val_x0 + 130, val_y0 + 552), "🌟 Seamless Mailbox Async Provisioning", fill=(255, 255, 255), font=get_font(26, bold=True))
    
    draw_subtitles(draw, SCENES[3]["voiceover"], t / duration)
    return np.array(img)

RENDERERS = {
    "scene_1": render_scene_1_frame,
    "scene_2": render_scene_2_frame,
    "scene_3": render_scene_3_frame,
    "scene_4": render_scene_4_frame
}

async def build_video():
    audio_paths = await generate_all_voiceovers()
    
    clips = []
    for sc in SCENES:
        sc_id = sc["id"]
        audio_file = audio_paths[sc_id]
        
        # Load audio clip to get exact duration
        audio_clip = AudioFileClip(audio_file)
        # Add 0.5s padding at end of scene for natural pacing
        scene_duration = audio_clip.duration + 0.8
        
        renderer = RENDERERS[sc_id]
        
        # Create animated VideoClip
        def make_frame_closure(dur, rend):
            return lambda t: rend(t, dur)
            
        vclip = VideoClip(make_frame_closure(scene_duration, renderer), duration=scene_duration)
        vclip = vclip.with_audio(audio_clip)
        clips.append(vclip)
        print(f"Prepared scene {sc_id} (duration: {scene_duration:.2f}s)")
        
    print("Concatenating scenes...")
    final_video = concatenate_videoclips(clips, method="compose")
    
    print(f"Rendering final MP4 to {OUTPUT_VIDEO} at {FPS} FPS...")
    final_video.write_videofile(
        OUTPUT_VIDEO,
        fps=FPS,
        codec="libx264",
        audio_codec="aac",
        preset="medium",
        threads=4
    )
    print(f"SUCCESS! Video created at: {OUTPUT_VIDEO}")

if __name__ == "__main__":
    asyncio.run(build_video())
