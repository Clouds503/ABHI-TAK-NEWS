import os
import sys
import subprocess

# Ensure UTF-8 execution
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS_DIR = os.path.join(BASE_DIR, "play-store-assets")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

os.makedirs(os.path.join(ASSETS_DIR, "phone"), exist_ok=True)
os.makedirs(os.path.join(ASSETS_DIR, "tablet_7inch"), exist_ok=True)
os.makedirs(os.path.join(ASSETS_DIR, "tablet_10inch"), exist_ok=True)

HEAD_TAGS = """
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@500;600;700;800&family=Noto+Serif+Devanagari:wght@700;800&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet">
"""

# SVG Icons for clean rendering without emoji bugs
SVG_PLAY = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>'
SVG_BELL = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>'
SVG_SEARCH = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'
SVG_MENU = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>'
SVG_PIN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFC837" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>'
SVG_BOLT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>'
SVG_MEGAPHONE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>'
SVG_NEWSPAPER = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path></svg>'
SVG_HOME = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>'
SVG_CLAPPER = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.2 6 3 11l-.9-2.4 17.2-5.1L20.2 6z"></path><path d="m6.2 5.3 3.1 4"></path><path d="m12.2 3.5 3.1 4"></path><path d="M3 11h18v11H3z"></path></svg>'
SVG_RADIO = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"></circle><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"></path><path d="M7.8 7.8c-2.3 2.3-2.3 6.1 0 8.5"></path></svg>'

phone_screens = [
    {
        "id": "1_home",
        "tag": "जनपद बिजनौर का अग्रणी न्यूज़ नेटवर्क",
        "title_hi": "ताज़ा ख़बरें व ब्रेकिंग न्यूज़ अलर्ट",
        "title_en": "District Bijnor 24x7 Breaking News",
        "content_html": f"""
          <div class="app-header">
            <div class="header-left">
              <div class="header-icon">{SVG_MENU}</div>
              <img src="../../public/pwa-512.png" class="app-logo">
              <div>
                <div class="brand-title">अभी तक</div>
                <div class="brand-sub">जनपद बिजनौर</div>
              </div>
            </div>
            <div class="header-right">
              <div class="header-icon">{SVG_SEARCH}</div>
              <div class="header-icon">{SVG_BELL}</div>
            </div>
          </div>

          <div class="breaking-strip">
            <span class="breaking-badge">{SVG_BOLT} ब्रेकिंग</span>
            <span class="breaking-text">नगीना-धामपुर मार्ग पर चौड़ीकरण कार्य शुरू, जाम से मिलेगी मुक्ति...</span>
          </div>

          <div class="card-featured">
            <div class="img-container">
              <img src="../../src/assets/news-sugarcane.webp" class="card-img">
              <span class="cat-pill">कृषि व किसान</span>
            </div>
            <div class="card-body">
              <div class="card-title">बिजनौर में गन्ना पेराई सत्र की तैयारियां तेज, किसानों को समय पर भुगतान का आश्वासन</div>
              <div class="card-meta">
                <span>धामपुर</span>
                <span>• 25 मिनट पहले</span>
                <span>• ब्यूरो रिपोर्ट</span>
              </div>
            </div>
          </div>

          <div class="card-compact">
            <img src="../../src/assets/news-road.webp" class="compact-img">
            <div class="compact-body">
              <span class="cat-tag">विकास एवं निर्माण</span>
              <div class="compact-title">नजीबाबाद-कोतवाली मार्ग पर नई पुलिया का निर्माण कार्य अंतिम चरण में</div>
              <div class="compact-meta">नजीबाबाद • 1 घंटा पहले</div>
            </div>
          </div>

          <div class="card-compact">
            <img src="../../src/assets/news-health.webp" class="compact-img">
            <div class="compact-body">
              <span class="cat-tag">स्वास्थ्य सेवाएं</span>
              <div class="compact-title">जिला अस्पताल में नई डिजिटल एक्स-रे मशीन स्थापित, मरीजों को मिलेगी राहत</div>
              <div class="compact-meta">बिजनौर • 3 घंटे पहले</div>
            </div>
          </div>

          <div class="bottom-nav">
            <div class="nav-item active">{SVG_HOME} <span>होम</span></div>
            <div class="nav-item">{SVG_NEWSPAPER} <span>ई-पेपर</span></div>
            <div class="nav-item">{SVG_CLAPPER} <span>रील्स</span></div>
            <div class="nav-item">{SVG_RADIO} <span>लाइव</span></div>
            <div class="nav-item">{SVG_MEGAPHONE} <span>जन की आवाज़</span></div>
          </div>
        """
    },
    {
        "id": "2_jka",
        "tag": "नागरिक शिकायत व समाधान मंच",
        "title_hi": "जन की आवाज़ — समस्या आपकी, समाधान हमारा",
        "title_en": "Jan Ki Awaaz: Citizen Grievance Redressal",
        "content_html": f"""
          <div class="app-header">
            <div class="header-left">
              <div class="brand-title">जन की आवाज़</div>
              <div class="brand-sub">नागरिक पत्रकारिता एवं शिकायत मंच</div>
            </div>
            <div class="live-pill-red">नागरिक मंच</div>
          </div>

          <div class="jka-intro-banner">
            <div class="jka-badge">नागरिक आवाज़</div>
            <div class="jka-banner-title">अपनी समस्या दर्ज करें — प्रशासन तक पहुंचेगी आपकी बात</div>
            <div class="jka-banner-sub">फ़ोटो व वीडियो अपलोड करें • स्टेटस ट्रैक करें • समाधान पाएं</div>
          </div>

          <div class="chips-row">
            <div class="chip active">सभी समस्याएं</div>
            <div class="chip">सड़क व गड्ढे</div>
            <div class="chip">बिजली व ट्रांसफार्मर</div>
            <div class="chip">पेयजल व सफ़ाई</div>
          </div>

          <div class="card-jka">
            <div class="jka-user-row">
              <div class="user-avatar">राजेश</div>
              <div>
                <div class="user-name">राजेश कुमार • नगीना</div>
                <div class="issue-time">कल शाम 04:30 बजे • वार्ड संख्या 8</div>
              </div>
              <span class="status-badge progress">कार्य प्रगति पर</span>
            </div>
            <div class="jka-title">मुख्य बाजार मार्ग पर 2 महीने से सीवर लाइन क्षतिग्रस्त, जलभराव से व्यापारी परेशान</div>
            <img src="../../src/assets/news-river.webp" class="jka-photo">
            <div class="jka-footer-row">
              <div class="upvote-count">142 नागरिकों ने समर्थन दिया</div>
              <div class="action-tag">संज्ञान: नगर पालिका परिषद</div>
            </div>
          </div>

          <div class="card-jka">
            <div class="jka-user-row">
              <div class="user-avatar anon">नागरिक</div>
              <div>
                <div class="user-name">अज्ञात नागरिक • चांदपुर</div>
                <div class="issue-time">आज सुबह 09:15 बजे • ग्राम बास्टा</div>
              </div>
              <span class="status-badge submitted">समीक्षाधीन</span>
            </div>
            <div class="jka-title">प्राथमिक विद्यालय के पास ट्रांसफार्मर से हो रही स्पार्किंग, हादसे का खतरा</div>
          </div>

          <div class="fab-btn">
            {SVG_BOLT} नई समस्या दर्ज करें
          </div>
        """
    },
    {
        "id": "3_live",
        "tag": "24x7 सीधा प्रसारण व वीडियो गैलेक्सी",
        "title_hi": "लाइव टीवी व वीडियो बुलेटिन",
        "title_en": "24x7 Live Streaming & Video News",
        "content_html": f"""
          <div class="app-header">
            <div class="header-left">
              <img src="../../public/pwa-512.png" class="app-logo">
              <div>
                <div class="brand-title">अभी तक लाइव</div>
                <div class="brand-sub">सीधा प्रसारण • जनपद बिजनौर</div>
              </div>
            </div>
            <span class="live-pill-red">LIVE NOW</span>
          </div>

          <div class="video-player-box">
            <img src="../../src/assets/news-market.webp" class="player-bg">
            <div class="player-overlay">
              <div class="live-tag-corner">24x7 लाइव प्रसारण</div>
              <div class="play-circle">{SVG_PLAY}</div>
              <div class="player-caption">बिजनौर कलेक्ट्रेट परिसर से लाइव: जिलाधिकारी की मासिक समीक्षा बैठक व प्रेस वार्ता</div>
            </div>
          </div>

          <div class="section-head">
            <span class="section-title">ताज़ा वीडियो बुलेटिन</span>
            <span class="view-all">सभी देखें</span>
          </div>

          <div class="video-grid">
            <div class="vid-card">
              <div class="vid-thumb-wrap">
                <img src="../../src/assets/news-cricket.webp" class="vid-thumb">
                <span class="vid-duration">03:45</span>
              </div>
              <div class="vid-title">जिला स्तरीय क्रिकेट टूर्नामेंट: धामपुर ने रोमांचक मैच में नजीबाबाद को हराया</div>
              <div class="vid-meta">धामपुर • 4.2k व्यूज</div>
            </div>
            <div class="vid-card">
              <div class="vid-thumb-wrap">
                <img src="../../src/assets/news-school.webp" class="vid-thumb">
                <span class="vid-duration">02:18</span>
              </div>
              <div class="vid-title">मिशन शक्ति अभियान: बालिकाओं को आत्मरक्षा और डिजिटल सुरक्षा के दिए टिप्स</div>
              <div class="vid-meta">बिजनौर • 6.8k व्यूज</div>
            </div>
          </div>

          <div class="bottom-nav">
            <div class="nav-item">{SVG_HOME} <span>होम</span></div>
            <div class="nav-item">{SVG_NEWSPAPER} <span>ई-पेपर</span></div>
            <div class="nav-item">{SVG_CLAPPER} <span>रील्स</span></div>
            <div class="nav-item active">{SVG_RADIO} <span>लाइव</span></div>
            <div class="nav-item">{SVG_MEGAPHONE} <span>जन की आवाज़</span></div>
          </div>
        """
    },
    {
        "id": "4_radar",
        "tag": "हर तहसील व कस्बे की लोकल ख़बरें",
        "title_hi": "कस्बा व तहसील रडार",
        "title_en": "Hyper-Local News For Every Town & Village",
        "content_html": f"""
          <div class="app-header">
            <div class="header-left">
              <div class="header-icon">{SVG_MENU}</div>
              <div>
                <div class="brand-title">जिला रडार</div>
                <div class="brand-sub">अपना कस्बा या तहसील चुनें</div>
              </div>
            </div>
            <div class="header-right">{SVG_SEARCH}</div>
          </div>

          <div class="towns-horizontal">
            <div class="town-chip active">संपूर्ण बिजनौर</div>
            <div class="town-chip">नगीना</div>
            <div class="town-chip">धामपुर</div>
            <div class="town-chip">नजीबाबाद</div>
            <div class="town-chip">चांदपुर</div>
            <div class="town-chip">कीरतपुर</div>
            <div class="town-chip">नूरपुर</div>
          </div>

          <div class="town-banner">
            <div class="town-banner-title">धामपुर तहसील विशेष कवरेज</div>
            <div class="town-banner-sub">धामपुर, स्योहारा, अफजलगढ़ और शेरकोट क्षेत्र की ताज़ा गतिविधियां</div>
          </div>

          <div class="card-featured">
            <div class="img-container">
              <img src="../../src/assets/news-road.webp" class="card-img">
              <span class="cat-pill">यातायात एवं सुरक्षा</span>
            </div>
            <div class="card-body">
              <div class="card-title">धामपुर-स्योहारा बाईपास पर स्ट्रीट लाइट लगाने की मांग को लेकर सभासदों ने सौंपा ज्ञापन</div>
              <div class="card-meta">धामपुर • 40 मिनट पहले</div>
            </div>
          </div>

          <div class="card-compact">
            <img src="../../src/assets/news-market.webp" class="compact-img">
            <div class="compact-body">
              <span class="cat-tag">व्यापार एवं बाज़ार</span>
              <div class="compact-title">धामपुर अनाज मंडी में नई धान की आवक शुरू, बेहतर दामों से किसान उत्साहित</div>
              <div class="compact-meta">धामपुर • 2 घंटे पहले</div>
            </div>
          </div>

          <div class="bottom-nav">
            <div class="nav-item active">{SVG_HOME} <span>होम</span></div>
            <div class="nav-item">{SVG_NEWSPAPER} <span>ई-पेपर</span></div>
            <div class="nav-item">{SVG_CLAPPER} <span>रील्स</span></div>
            <div class="nav-item">{SVG_RADIO} <span>लाइव</span></div>
            <div class="nav-item">{SVG_MEGAPHONE} <span>जन की आवाज़</span></div>
          </div>
        """
    },
    {
        "id": "5_epaper",
        "tag": "डिजिटल ई-पेपर एवं वीडियो रील्स",
        "title_hi": "दैनिक ई-पेपर व न्यूज़ रील्स",
        "title_en": "Daily Digital E-Paper & 30-Sec Reels",
        "content_html": f"""
          <div class="app-header">
            <div class="header-left">
              <img src="../../public/pwa-512.png" class="app-logo">
              <div>
                <div class="brand-title">दैनिक ई-पेपर</div>
                <div class="brand-sub">डिजिटल संस्करण • जनपद बिजनौर</div>
              </div>
            </div>
            <div class="date-picker-badge">02 अक्टूबर 2026</div>
          </div>

          <div class="epaper-hero-card">
            <div class="epaper-preview-box">
              <div class="epaper-header-mast">अभी तक समाचार पत्र</div>
              <div class="epaper-sub-mast">वर्ष 12 • अंक 245 • जनपद बिजनौर संस्करण</div>
              <div class="epaper-lead-news">जिले में विकास परियोजनाओं को मिली गति; 12 नई सड़कों के निर्माण को स्वीकृति</div>
              <div class="epaper-columns-mock">
                <div class="col-mock">नगीना में कौशल विकास केंद्र का उद्घाटन, युवाओं को मिलेगा स्वरोजगार का अवसर...</div>
                <div class="col-mock">कृषि विभाग ने जारी की रबी फसलों के लिए विशेष एडवाइजरी; उन्नत बीजों का वितरण शुरू...</div>
              </div>
              <div class="epaper-overlay-btn">पूरा ई-पेपर पढ़ें (Read Full Paper)</div>
            </div>
            <div class="epaper-meta-bar">
              <span>कुल 8 पृष्ठ (Pages)</span>
              <span>PDF डाउनलोड उपलब्ध</span>
            </div>
          </div>

          <div class="section-head">
            <span class="section-title">फटाफट न्यूज़ रील्स</span>
            <span class="view-all">रील्स देखें</span>
          </div>

          <div class="reels-teaser-row">
            <div class="reel-teaser-card">
              <img src="../../src/assets/news-cricket.webp" class="reel-img">
              <div class="reel-gradient">
                <span class="reel-caption">क्रिकेट फाइनल मैच के मुख्य पल</span>
              </div>
            </div>
            <div class="reel-teaser-card">
              <img src="../../src/assets/news-sugarcane.webp" class="reel-img">
              <div class="reel-gradient">
                <span class="reel-caption">गन्ना भुगतान पर बड़ी अपडेट</span>
              </div>
            </div>
            <div class="reel-teaser-card">
              <img src="../../src/assets/news-health.webp" class="reel-img">
              <div class="reel-gradient">
                <span class="reel-caption">मुफ्त स्वास्थ्य शिविर कल</span>
              </div>
            </div>
          </div>

          <div class="bottom-nav">
            <div class="nav-item">{SVG_HOME} <span>होम</span></div>
            <div class="nav-item active">{SVG_NEWSPAPER} <span>ई-पेपर</span></div>
            <div class="nav-item">{SVG_CLAPPER} <span>रील्स</span></div>
            <div class="nav-item">{SVG_RADIO} <span>लाइव</span></div>
            <div class="nav-item">{SVG_MEGAPHONE} <span>जन की आवाज़</span></div>
          </div>
        """
    }
]

def generate_phone_html(screen):
    return f"""<!DOCTYPE html>
<html lang="hi">
<head>
  {HEAD_TAGS}
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      width: 1080px;
      height: 2400px;
      background: #0f0204;
      font-family: 'Mukta', sans-serif;
      color: #ffffff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }}
    .marketing-top {{
      width: 100%;
      height: 520px;
      background: radial-gradient(circle at 50% 20%, #B80000 0%, #4A0002 50%, #0F0204 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 60px 40px 20px;
      position: relative;
    }}
    .top-accent-bar {{
      position: absolute;
      top: 0; left: 0; right: 0; height: 10px;
      background: linear-gradient(90deg, #D40000 0%, #FFC837 50%, #D40000 100%);
    }}
    .tag-pill {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 200, 50, 0.5);
      border-radius: 999px;
      padding: 8px 24px;
      font-size: 26px;
      font-weight: 700;
      color: #FFC837;
      margin-bottom: 20px;
    }}
    .title-hi {{
      font-family: 'Noto Serif Devanagari', serif;
      font-size: 64px;
      font-weight: 800;
      line-height: 1.15;
      color: #ffffff;
      text-shadow: 0 4px 15px rgba(0,0,0,0.8);
      max-width: 950px;
    }}
    .title-en {{
      font-family: 'Outfit', sans-serif;
      font-size: 30px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.85);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-top: 14px;
    }}
    .device-shell {{
      width: 940px;
      height: 1880px;
      background: #1a1a1a;
      border-radius: 64px 64px 0 0;
      padding: 16px 16px 0 16px;
      box-shadow: 0 -20px 60px rgba(0,0,0,0.9), 0 0 0 4px rgba(255, 255, 255, 0.12);
      position: relative;
    }}
    .device-screen {{
      width: 100%;
      height: 100%;
      background: #0d0103;
      border-radius: 52px 52px 0 0;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
    }}
    .status-bar {{
      height: 54px;
      padding: 0 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      background: #0d0103;
      z-index: 10;
    }}
    .app-header {{
      height: 100px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      background: #140204;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 30px;
      flex-shrink: 0;
    }}
    .header-left {{
      display: flex;
      align-items: center;
      gap: 16px;
    }}
    .header-icon {{
      display: flex;
      align-items: center;
      color: #ffffff;
    }}
    .app-logo {{
      width: 60px;
      height: 60px;
      border-radius: 12px;
    }}
    .brand-title {{
      font-family: 'Noto Serif Devanagari', serif;
      font-size: 32px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.1;
    }}
    .brand-sub {{
      font-size: 20px;
      color: #FFC837;
      font-weight: 600;
    }}
    .header-right {{
      display: flex;
      align-items: center;
      gap: 20px;
    }}
    .live-pill-red {{
      background: #D40000;
      color: #ffffff;
      font-size: 18px;
      font-weight: 800;
      padding: 6px 16px;
      border-radius: 999px;
    }}
    .breaking-strip {{
      background: #200407;
      border-bottom: 1px solid #D40000;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 22px;
    }}
    .breaking-badge {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #D40000;
      color: white;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 18px;
    }}
    .breaking-text {{
      color: #ffffff;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }}
    .card-featured {{
      background: #180306;
      border-bottom: 2px solid rgba(255,255,255,0.08);
      margin-bottom: 20px;
    }}
    .img-container {{
      position: relative;
      width: 100%;
      height: 480px;
    }}
    .card-img {{
      width: 100%;
      height: 100%;
      object-fit: cover;
    }}
    .cat-pill {{
      position: absolute;
      top: 20px;
      left: 20px;
      background: #D40000;
      color: white;
      font-size: 20px;
      font-weight: 700;
      padding: 6px 18px;
      border-radius: 8px;
    }}
    .card-body {{
      padding: 24px 30px;
    }}
    .card-title {{
      font-family: 'Noto Serif Devanagari', serif;
      font-size: 36px;
      font-weight: 800;
      line-height: 1.25;
      color: #ffffff;
    }}
    .card-meta {{
      margin-top: 14px;
      font-size: 22px;
      color: #FFC837;
      font-weight: 600;
      display: flex;
      gap: 12px;
    }}
    .card-compact {{
      display: flex;
      gap: 20px;
      padding: 16px 30px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      background: #120204;
    }}
    .compact-img {{
      width: 220px;
      height: 150px;
      border-radius: 12px;
      object-fit: cover;
      flex-shrink: 0;
    }}
    .compact-body {{
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }}
    .cat-tag {{
      font-size: 18px;
      color: #D40000;
      font-weight: 700;
      text-transform: uppercase;
    }}
    .compact-title {{
      font-family: 'Noto Serif Devanagari', serif;
      font-size: 26px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.25;
      margin-top: 4px;
    }}
    .compact-meta {{
      font-size: 19px;
      color: rgba(255,255,255,0.6);
      margin-top: 6px;
    }}
    .jka-intro-banner {{
      background: linear-gradient(135deg, #3d0006 0%, #150002 100%);
      border: 1px solid #D40000;
      border-radius: 16px;
      margin: 20px 24px;
      padding: 24px;
    }}
    .jka-badge {{
      display: inline-block;
      background: #D40000;
      color: white;
      font-size: 18px;
      font-weight: 800;
      padding: 4px 14px;
      border-radius: 6px;
      margin-bottom: 10px;
    }}
    .jka-banner-title {{
      font-size: 30px;
      font-weight: 800;
      color: #ffffff;
    }}
    .jka-banner-sub {{
      font-size: 21px;
      color: #FFC837;
      margin-top: 6px;
    }}
    .chips-row {{
      display: flex;
      gap: 12px;
      padding: 0 24px 16px;
    }}
    .chip {{
      padding: 10px 20px;
      border-radius: 999px;
      background: #250508;
      border: 1px solid rgba(255,255,255,0.2);
      font-size: 21px;
      font-weight: 700;
      white-space: nowrap;
    }}
    .chip.active {{
      background: #D40000;
      border-color: #D40000;
      color: white;
    }}
    .card-jka {{
      background: #180306;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px;
      margin: 0 24px 20px;
      padding: 22px;
    }}
    .jka-user-row {{
      display: flex;
      align-items: center;
      gap: 14px;
    }}
    .user-avatar {{
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #D40000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      font-weight: 800;
    }}
    .user-avatar.anon {{
      background: #444;
    }}
    .user-name {{
      font-size: 22px;
      font-weight: 700;
    }}
    .issue-time {{
      font-size: 18px;
      color: rgba(255,255,255,0.6);
    }}
    .status-badge {{
      margin-left: auto;
      font-size: 18px;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 999px;
    }}
    .status-badge.progress {{
      background: rgba(255, 180, 0, 0.2);
      color: #FFB400;
      border: 1px solid #FFB400;
    }}
    .status-badge.submitted {{
      background: rgba(0, 180, 255, 0.2);
      color: #00B4FF;
      border: 1px solid #00B4FF;
    }}
    .jka-title {{
      font-size: 26px;
      font-weight: 700;
      line-height: 1.3;
      margin-top: 14px;
    }}
    .jka-photo {{
      width: 100%;
      height: 300px;
      border-radius: 12px;
      object-fit: cover;
      margin-top: 14px;
    }}
    .jka-footer-row {{
      display: flex;
      justify-content: space-between;
      margin-top: 14px;
      font-size: 20px;
      color: #FFC837;
      font-weight: 600;
    }}
    .fab-btn {{
      position: absolute;
      bottom: 120px;
      right: 40px;
      background: #D40000;
      color: white;
      font-size: 24px;
      font-weight: 800;
      padding: 18px 36px;
      border-radius: 999px;
      box-shadow: 0 10px 30px rgba(212,0,0,0.6);
      display: flex;
      align-items: center;
      gap: 12px;
    }}
    .video-player-box {{
      position: relative;
      width: 100%;
      height: 480px;
      background: black;
    }}
    .player-bg {{
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.85;
    }}
    .player-overlay {{
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 24px;
    }}
    .live-tag-corner {{
      background: #D40000;
      color: white;
      font-size: 20px;
      font-weight: 800;
      padding: 6px 18px;
      border-radius: 6px;
      align-self: flex-start;
    }}
    .play-circle {{
      width: 90px;
      height: 90px;
      background: rgba(212,0,0,0.9);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      color: white;
      align-self: center;
      box-shadow: 0 0 30px rgba(212,0,0,0.8);
    }}
    .player-caption {{
      font-size: 28px;
      font-weight: 800;
      color: white;
      line-height: 1.25;
    }}
    .section-head {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 30px 14px;
    }}
    .section-title {{
      font-size: 28px;
      font-weight: 800;
      color: white;
    }}
    .view-all {{
      font-size: 22px;
      color: #FFC837;
      font-weight: 700;
    }}
    .video-grid {{
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      padding: 0 24px;
    }}
    .vid-card {{
      background: #180306;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.1);
    }}
    .vid-thumb-wrap {{
      position: relative;
      height: 180px;
    }}
    .vid-thumb {{
      width: 100%;
      height: 100%;
      object-fit: cover;
    }}
    .vid-duration {{
      position: absolute;
      bottom: 10px;
      right: 10px;
      background: rgba(0,0,0,0.8);
      font-size: 16px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
    }}
    .vid-title {{
      font-size: 21px;
      font-weight: 700;
      padding: 12px 14px 6px;
      line-height: 1.25;
    }}
    .vid-meta {{
      font-size: 18px;
      color: #FFC837;
      padding: 0 14px 14px;
    }}
    .towns-horizontal {{
      display: flex;
      gap: 14px;
      padding: 18px 24px;
      overflow-x: hidden;
    }}
    .town-chip {{
      padding: 10px 24px;
      border-radius: 999px;
      background: #250508;
      border: 1px solid rgba(255,255,255,0.2);
      font-size: 22px;
      font-weight: 700;
      white-space: nowrap;
    }}
    .town-chip.active {{
      background: #D40000;
      border-color: #D40000;
      color: white;
    }}
    .town-banner {{
      background: linear-gradient(90deg, #3d0006 0%, #150002 100%);
      border-left: 6px solid #D40000;
      padding: 18px 24px;
      margin: 0 24px 20px;
    }}
    .town-banner-title {{
      font-size: 28px;
      font-weight: 800;
      color: #ffffff;
    }}
    .town-banner-sub {{
      font-size: 20px;
      color: #FFC837;
      margin-top: 4px;
    }}
    .date-picker-badge {{
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 20px;
      font-weight: 700;
      color: #FFC837;
    }}
    .epaper-hero-card {{
      background: #180306;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 20px;
      margin: 20px 24px;
      padding: 24px;
    }}
    .epaper-preview-box {{
      background: #fbf9f4;
      color: #111111;
      border-radius: 12px;
      padding: 24px;
      position: relative;
      height: 380px;
      display: flex;
      flex-direction: column;
    }}
    .epaper-header-mast {{
      font-family: 'Noto Serif Devanagari', serif;
      font-size: 38px;
      font-weight: 900;
      text-align: center;
      color: #b80000;
      border-bottom: 2px solid #111;
      padding-bottom: 8px;
    }}
    .epaper-sub-mast {{
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      color: #555;
      padding: 4px 0;
      border-bottom: 1px solid #ccc;
    }}
    .epaper-lead-news {{
      font-family: 'Noto Serif Devanagari', serif;
      font-size: 26px;
      font-weight: 800;
      line-height: 1.25;
      margin-top: 14px;
    }}
    .epaper-columns-mock {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      font-size: 17px;
      line-height: 1.3;
      color: #333;
      margin-top: 12px;
    }}
    .epaper-overlay-btn {{
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #D40000;
      color: white;
      font-size: 22px;
      font-weight: 800;
      padding: 12px 32px;
      border-radius: 999px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      white-space: nowrap;
    }}
    .epaper-meta-bar {{
      display: flex;
      justify-content: space-between;
      margin-top: 18px;
      font-size: 22px;
      color: #FFC837;
      font-weight: 700;
    }}
    .reels-teaser-row {{
      display: flex;
      gap: 16px;
      padding: 0 24px;
    }}
    .reel-teaser-card {{
      flex: 1;
      height: 240px;
      border-radius: 16px;
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.15);
    }}
    .reel-img {{
      width: 100%;
      height: 100%;
      object-fit: cover;
    }}
    .reel-gradient {{
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%);
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 14px;
    }}
    .reel-caption {{
      font-size: 18px;
      font-weight: 700;
      line-height: 1.2;
    }}
    .bottom-nav {{
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 100px;
      background: #140204;
      border-top: 1px solid rgba(255,255,255,0.15);
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding-bottom: 10px;
    }}
    .nav-item {{
      display: flex;
      flex-direction: column;
      align-items: center;
      color: rgba(255,255,255,0.5);
    }}
    .nav-item span {{
      font-size: 18px;
      font-weight: 700;
      margin-top: 4px;
    }}
    .nav-item.active {{
      color: #D40000;
    }}
    .nav-item.active span {{
      color: #ffffff;
    }}
  </style>
</head>
<body>
  <div class="marketing-top">
    <div class="top-accent-bar"></div>
    <div class="tag-pill">{screen['tag']}</div>
    <div class="title-hi">{screen['title_hi']}</div>
    <div class="title-en">{screen['title_en']}</div>
  </div>

  <div class="device-shell">
    <div class="device-screen">
      <div class="status-bar">
        <span>09:41</span>
        <span>5G • WiFi 100%</span>
      </div>
      {screen['content_html']}
    </div>
  </div>
</body>
</html>
"""

# Render Phone Screenshots (1080 x 2400)
for s in phone_screens:
    html_file = os.path.join(ASSETS_DIR, "phone", f"screen_{s['id']}.html")
    png_file = os.path.join(ASSETS_DIR, "phone", f"screenshot_{s['id']}.png")
    
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(generate_phone_html(s))
    
    file_uri = "file:///" + html_file.replace("\\", "/")
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--hide-scrollbars",
        "--window-size=1080,2400",
        f"--screenshot={png_file}",
        file_uri
    ]
    subprocess.run(cmd, check=True)
    print(f"Created phone screenshot: {s['id']}")

# Render 7-Inch Tablet Screenshots (1200 x 1920)
tablet_7_screens = [
    {
        "id": "1_home",
        "tag": "7-INCH TABLET OPTIMIZED",
        "title_hi": "जनपद बिजनौर की ताज़ा ख़बरें व सीधा प्रसारण",
        "title_en": "District Bijnor News & Live Broadcast",
        "content_html": phone_screens[0]["content_html"]
    },
    {
        "id": "2_jka",
        "tag": "CITIZEN GRIEVANCE PLATFORM",
        "title_hi": "जन की आवाज़ — नागरिक शिकायत निवारण मंच",
        "title_en": "Raise Local Issues & Track Redressal",
        "content_html": phone_screens[1]["content_html"]
    },
    {
        "id": "3_live",
        "tag": "24X7 LIVE TV & E-PAPER",
        "title_hi": "24x7 लाइव टीवी व डिजिटल ई-पेपर",
        "title_en": "Live Streaming & Daily Digital Edition",
        "content_html": phone_screens[2]["content_html"]
    }
]

for s in tablet_7_screens:
    html_file = os.path.join(ASSETS_DIR, "tablet_7inch", f"tablet_7_{s['id']}.html")
    png_file = os.path.join(ASSETS_DIR, "tablet_7inch", f"screenshot_tablet_7_{s['id']}.png")
    
    # Simple reuse of html with 1200x1920 viewport
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(generate_phone_html(s))
    
    file_uri = "file:///" + html_file.replace("\\", "/")
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--hide-scrollbars",
        "--window-size=1200,1920",
        f"--screenshot={png_file}",
        file_uri
    ]
    subprocess.run(cmd, check=True)
    print(f"Created 7-inch tablet screenshot: {s['id']}")

# Render 10-Inch Tablet Screenshots (1600 x 2560)
tablet_10_screens = [
    {
        "id": "1_home",
        "tag": "10-INCH TABLET & CHROMEBOOK COMPATIBLE",
        "title_hi": "जनपद बिजनौर की संपूर्ण डिजिटल कवरेज",
        "title_en": "Comprehensive Large Screen News Experience",
        "content_html": phone_screens[0]["content_html"]
    },
    {
        "id": "2_jka",
        "tag": "CITIZEN JOURNALISM PORTAL",
        "title_hi": "जन की आवाज़ — डिजिटल नागरिक पोर्टल",
        "title_en": "District Bijnor Grievance Redressal",
        "content_html": phone_screens[1]["content_html"]
    },
    {
        "id": "3_live",
        "tag": "24X7 LIVE STUDIO & E-PAPER",
        "title_hi": "24x7 सीधा प्रसारण व डिजिटल ई-पेपर",
        "title_en": "Live Streaming Studio & Daily E-Paper Edition",
        "content_html": phone_screens[2]["content_html"]
    }
]

for s in tablet_10_screens:
    html_file = os.path.join(ASSETS_DIR, "tablet_10inch", f"tablet_10_{s['id']}.html")
    png_file = os.path.join(ASSETS_DIR, "tablet_10inch", f"screenshot_tablet_10_{s['id']}.png")
    
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(generate_phone_html(s))
    
    file_uri = "file:///" + html_file.replace("\\", "/")
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--hide-scrollbars",
        "--window-size=1600,2560",
        f"--screenshot={png_file}",
        file_uri
    ]
    subprocess.run(cmd, check=True)
    print(f"Created 10-inch tablet screenshot: {s['id']}")

print("All store assets finished successfully!")
