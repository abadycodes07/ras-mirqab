import urllib.request
import os

AVATAR_GALLERY = {
  "AJELNEWS2475": "https://nitter.tiekoetter.com/pic/https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F1711448602751520768%2FTl5dxkuf_bigger.jpg",
  "AlArabiya_Brk": "https://nitter.tiekoetter.com/pic/https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F2020571683288129536%2Fb_PEXEQB_bigger.jpg",
  "AlHadath": "https://nitter.tiekoetter.com/pic/https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F1728142260775108608%2F-rIPG6PV_bigger.jpg",
  "AsharqNewsBrk": "https://nitter.tiekoetter.com/pic/https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F1693101761257521152%2FfWZIHaGm_bigger.jpg",
  "NewsNow4USA": "https://nitter.tiekoetter.com/pic/https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F1878139670241894400%2Fvu5AGy9p_bigger.jpg",
  "SkyNewsArabia_B": "https://nitter.tiekoetter.com/pic/https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F1302533841316392960%2FFwtdXUph_bigger.jpg",
  "ajmubasher": "https://nitter.tiekoetter.com/pic/https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F1765272983839387648%2F2aS1ngvi_bigger.jpg",
  "alekhbariyaBRK": "https://nitter.tiekoetter.com/pic/https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F1991965775553286144%2FM_XXpcLV_bigger.jpg",
  "alekhbariyaNews": "https://nitter.tiekoetter.com/pic/https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F1991967468563144704%2Fc8qJPCIK_bigger.jpg",
  "alrougui": "https://nitter.tiekoetter.com/pic/https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F1621999837708173312%2Fg1x5NCdB_bigger.jpg",
  "modgovksa": "https://nitter.tiekoetter.com/pic/https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F1607032803534716930%2FyUkGxZCe_bigger.jpg",
  "RTonline_ar": "https://pbs.twimg.com/profile_images/1455513233347092482/M8_n3uX9_bigger.jpg"
}

LOGOS_DIR = "/Users/abady/Downloads/OLD VERSION راس مرقاب/public/logos"

def download_avatars():
    if not os.path.exists(LOGOS_DIR):
        os.makedirs(LOGOS_DIR)
        
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'}
    
    for handle, url in AVATAR_GALLERY.items():
        try:
            filename = f"{handle.lower()}.jpg"
            save_path = os.path.join(LOGOS_DIR, filename)
            print(f"Downloading {handle}...")
            
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as response:
                with open(save_path, 'wb') as f:
                    f.write(response.read())
            print(f"✅ Saved {filename}")
        except Exception as e:
            print(f"❌ Error {handle}: {e}")

if __name__ == "__main__":
    download_avatars()
