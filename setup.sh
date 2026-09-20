#!/usr/bin/env bash

# ==============================================================================
# 🛡️ CyberEdu LMS — Otomatik Kurulum ve Başlatma Scripti
# ==============================================================================

# Renk Tanımlamaları
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear

echo -e "${PURPLE}${BOLD}"
echo "  ____      _               _____     _         _     __  __ ____  "
echo " / ___|   _| |__   ___ _ __| ____| __| |_   _  | |   |  \/  / ___| "
echo "| |  | | | | '_ \ / _ \ '__|  _|  / _\` | | | | | |   | |\/| \___ \ "
echo "| |__| |_| | |_) |  __/ |  | |___| (_| | |_| | | |___| |  | |___) |"
echo " \____\__, |_.__/ \___|_|  |_____|\__,_|\__,_| |_____|_|  |_|____/ "
echo "      |___/                                                        "
echo -e "${NC}"
echo -e "${CYAN}Açık ve Uzaktan Öğrenme Siber Güvenlik Platformu Kurulum Sihirbazı${NC}"
echo -e "------------------------------------------------------------------"
echo ""

# 1. Node.js ve NPM Kontrolü
echo -e "${BOLD}[1/4] Sistem Gereksinimleri Kontrol Ediliyor...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ HATA: Node.js sisteminizde kurulu bulunamadı!${NC}"
    echo -e "Lütfen https://nodejs.org/ adresinden Node.js (v18+) indirip kurunuz."
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js Tespit Edildi:${NC} $NODE_VERSION"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ HATA: npm paket yöneticisi bulunamadı!${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ NPM Tespit Edildi:${NC} v$NPM_VERSION"
echo ""

# 2. Çevre Değişkenleri (.env) Kontrolü
echo -e "${BOLD}[2/4] Yapılandırma Dosyası (.env) Kontrol Ediliyor...${NC}"

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env dosyası bulunamadı. .env.example şablonundan oluşturuluyor...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ .env dosyası başarıyla oluşturuldu.${NC}"
        echo -e "${YELLOW}👉 Lütfen .env dosyasını bir metin düzenleyiciyle açıp Supabase ve Gemini API anahtarlarınızı giriniz!${NC}"
    else
        cat <<EOT >> .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_GEMINI_API_KEY=your-gemini-api-key-here
EOT
        echo -e "${GREEN}✓ Yeni .env dosyası oluşturuldu.${NC}"
    fi
else
    echo -e "${GREEN}✓ .env yapılandırma dosyası mevcut.${NC}"
fi
echo ""

# 3. Bağımlılıkların Yüklenmesi
echo -e "${BOLD}[3/4] Proje Bağımlılıkları Yükleniyor (npm install)...${NC}"
echo -e "${CYAN}Bu işlem internet hızınıza bağlı olarak birkaç saniye sürebilir...${NC}"

npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Tüm bağımlılıklar eksiksiz başarıyla yüklendi!${NC}"
else
    echo -e "${RED}❌ Paket yükleme sırasında bir sorun oluştu. Lütfen bağlantınızı kontrol ediniz.${NC}"
    exit 1
fi
echo ""

# 4. Veritabanı Bilgilendirmesi
echo -e "${BOLD}[4/4] Veritabanı (Supabase) Hazırlığı${NC}"
echo -e "Eğer Supabase veritabanınızı henüz kurmadıysanız, sırasıyla şu SQL dosyalarını"
echo -e "Supabase Dashboard -> SQL Editor alanında çalıştırınız:"
echo -e "  1. ${CYAN}supabase/migration.sql${NC} (Tablolar & Yetkilendirme)"
echo -e "  2. ${CYAN}supabase/add_mandatory_elective_courses.sql${NC} (Zorunlu/Seçmeli Kurs Yapısı)"
echo -e "  3. ${CYAN}supabase/seed_exact_courses.sql${NC} (Hazır Standart Müfredat)"
echo ""
echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 TEBRİKLER! CyberEdu LMS Kurulumu Tamamlandı.${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo ""

# Kullanıcıya Geliştirme Sunucusunu Başlatma Seçeneği
read -p "Geliştirme sunucusunu şimdi başlatmak ister misiniz? (E/h): " start_dev
start_dev=${start_dev:-E}

if [[ "$start_dev" =~ ^[EeYy]$ ]]; then
    echo ""
    echo -e "${CYAN}🚀 Geliştirme sunucusu başlatılıyor (http://localhost:5173)...${NC}"
    echo -e "Durdurmak için terminalde ${BOLD}Ctrl + C${NC} tuşlarına basabilirsiniz."
    echo ""
    npm run dev
else
    echo ""
    echo -e "Projeyi dilediğiniz zaman başlatmak için şu komutu çalıştırabilirsiniz:"
    echo -e "${CYAN}${BOLD}npm run dev${NC}"
    echo ""
fi
