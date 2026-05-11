#!/usr/bin/env bash
# Скачивает изображения с kuhni-forest.ru в ../assets/img/ под именами, которые ждёт вёрстка.
set -euo pipefail
BASE="https://kuhni-forest.ru"
DEST="$(cd "$(dirname "$0")/../assets/img" && pwd)"

mkdir -p "$DEST"
cd "$DEST"

dl() {
  local out="$1" path="$2"
  echo "→ $out"
  /usr/bin/curl -fsSL -A "Mozilla/5.0 (compatible; Forest-redesign/1.0)" \
    "${BASE}${path}" -o "$out"
}

# Герои и категории (широкие 16:9 с главной)
dl "hero-kitchen.jpg"              "/site/assets/files/1/kuhnya-matovaya.jpg"
dl "cat-neoclassic.jpg"            "/site/assets/files/1/lora-1_16-9.jpg"
dl "cat-modern.jpg"                "/site/assets/files/1/20241219_121953.jpg"
dl "cat-classic.jpg"               "/site/assets/files/1/malenkaya_kukhnya_v_klassicheskom_stile.jpg"

# Модели и материалы
dl "model-sharlotta.jpg"           "/site/assets/files/1221/sharlotta_roza_belaia.500x500.jpg"
dl "model-kristina.jpg"            "/site/assets/files/1242/kristina_01.jpg"
dl "model-gretta.jpg"              "/site/assets/files/1398/2gretta_viz1p4.500x500.jpg"
dl "model-gretta-alt.jpg"          "/site/assets/files/1081/fregat-20v.500x500.jpg"
dl "model-lora.jpg"                "/site/assets/files/1416/lora_site20v.500x500.jpg"
dl "model-alexa-light.jpg"         "/site/assets/files/1394/alexa_render-071016_post.254x248.jpg"
dl "model-tessa.jpg"               "/site/assets/files/1051/tessa2_site20v.500x500.jpg"
dl "model-francesca.jpg"           "/site/assets/files/1052/fran_1.500x500.jpg"
dl "model-nensi.jpg"               "/site/assets/files/1053/nensy-20v.500x500.jpg"
dl "model-betty.jpg"               "/site/assets/files/1071/viz1_betty_05021620v.500x500.jpg"
dl "model-korri.jpg"               "/site/assets/files/1433/012mario_site-1-1.jpg"

dl "mat-acrylic.jpg"               "/site/assets/files/1223/acryl.500x500.jpg"
dl "mat-mdf.jpg"                   "/site/assets/files/2368/1.500x500.jpg"
dl "mat-wood.jpg"                  "/site/assets/files/2388/img_4462.500x500.jpg"
dl "mat-glass.jpg"                 "/site/assets/files/2401/10000_1.500x500.jpg"
dl "mat-veneer.jpg"                "/site/assets/files/1269/lora-shpon.500x500.jpg"

# Проекты и мебель
dl "project-neoclassic.jpg"        "/site/assets/files/1242/kristina_01.jpg"
dl "project-modern.jpg"            "/site/assets/files/1530/2_1.jpg"
dl "project-living.jpg"            "/site/assets/files/1/6_0post_post_16-9.jpg"
dl "project-classic.png"           "/site/assets/files/1029/20000_6.254x248.png"

dl "mebel-hallway.jpg"             "/site/assets/files/2390/img_4268.500x500.jpg"
dl "mebel-living.jpg"              "/site/assets/files/1732/1_0_0-2.500x500.jpg"
dl "mebel-wardrobe.jpg"            "/site/assets/files/2354/img_20191125_164009.288x0-is.jpg"

dl "about-production.jpg"          "/site/assets/files/1/1_2.jpg"

# Иконка (с сайта)
dl "favicon.ico"                   "/site/templates/build/img/favicon.ico"

echo "Готово: $DEST"
