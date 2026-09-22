#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

TPL="scripts/gen-poster-template.svg"
OUT="assets/actors"
mkdir -p "$OUT"

# slug|initials|accent|seed|line1|line2
entries=(
  "pawan-kalyan|PK|#FF1A1A|11|PAWAN|KALYAN"
  "prabhas|PR|#FF1A1A|22|PRABHAS|"
  "allu-arjun|AA|#B00000|33|ALLU|ARJUN"
  "mahesh-babu|MB|#FF1A1A|44|MAHESH|BABU"
  "jr-ntr|NTR|#B00000|55|JR|NTR"
  "ram-charan|RC|#FF1A1A|66|RAM|CHARAN"
  "chiranjeevi|CH|#B00000|77|CHIRANJEEVI|"
  "balakrishna|BK|#FF1A1A|40|BALA|KRISHNA"
  "nagarjuna|NAG|#FF1A1A|88|NAGARJUNA|"
  "venkatesh|VK|#B00000|99|VENKATESH|"
  "ravi-teja|RT|#FF1A1A|10|RAVI|TEJA"
  "nani|NN|#B00000|12|NANI|"
  "vijay-deverakonda|VD|#FF1A1A|14|VIJAY|DEVERAKONDA"
  "naga-chaitanya|NC|#B00000|26|NAGA|CHAITANYA"
  "nithiin|NT|#B00000|16|NITHIIN|"
  "sharwanand|SH|#FF1A1A|18|SHARWANAND|"
  "akhil-akkineni|AK|#FF1A1A|28|AKHIL|AKKINENI"
  "rana-daggubati|RD|#B00000|20|RANA|DAGGUBATI"
  "ram-pothineni|RP|#FF1A1A|24|RAM|POTHINENI"
  "adivi-sesh|AD|#FF1A1A|32|ADIVI|SESH"
)

for e in "${entries[@]}"; do
  IFS='|' read -r slug initials accent seed line1 line2 <<< "$e"
  isize=70
  idy=25
  if [ ${#initials} -ge 3 ]; then
    isize=50
    idy=18
  fi
  sed \
    -e "s/__SLUG__/$slug/g" \
    -e "s/__ACCENT__/$accent/g" \
    -e "s/__SEED__/$seed/g" \
    -e "s/__INITIALS__/$initials/g" \
    -e "s/__INITIAL_SIZE__/$isize/g" \
    -e "s/__INITIAL_DY__/$idy/g" \
    -e "s/__NAME_LINE1__/$line1/g" \
    -e "s/__NAME_LINE2__/$line2/g" \
    "$TPL" > "$OUT/$slug.svg"
  echo "wrote $OUT/$slug.svg"
done
