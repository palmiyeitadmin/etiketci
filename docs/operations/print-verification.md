# Baskı doğrulama kontrol listesi

Bu liste, ekranda görünen etiketin Epson ColorWorks yazıcıdan aynen çıktığını kontrol etmek içindir. Yeni bir şablon yayına alındığında, yazıcı veya sürücü değiştiğinde ve PDF üretiminde bir değişiklik olduğunda bir kez uygulayın.

Otomatik kontroller zaten şunları yapıyor:
- `src/backend/Plms.Tests/GoldenImageTests.cs` referans etiketleri (Türkçe metin, tüm barkod türleri, QR, şekiller, döndürme, filigran) 300 DPI görüntüye çevirip kayıtlı görüntülerle karşılaştırır.
- Aynı test, adetli PDF'te sayfa sayısının adede eşit olduğunu doğrular.

Bu liste, otomatik testlerin göremediği tarafı kapsar: sürücü ayarları, kâğıt ve gerçek ölçü.

## 1. PDF'in içini görmek (tarayıcı olmadan)

```bash
cd src/frontend
PLMS_API_URL=https://api.ornek.local PLMS_EMAIL=ad@palmiye.com.tr PLMS_PASSWORD=... \
  node scripts/pdf-snapshot.mjs --template <şablon id> --version <sürüm id> --product <ürün id> --out ./pdf-snapshot
```

Bir baskı talebinin PDF'i için `--intent <talep id>` kullanın.

Betik şunları yazar: sayfa sayısı, sayfa boyutu (mm), her sayfanın PNG görüntüsü.
- Sayfa boyutu şablonun boyutuyla aynı olmalı (örneğin 60 × 40 mm).
- Sayfa sayısı adetle aynı olmalı.

Gerekenler: Node 18+ ve `poppler-utils` (`pdftoppm`, `pdfinfo`).

## 2. Tarayıcı ve sürücü ayarları

1. Baskı PDF'ini Chrome veya Edge'de açın. Talep ekranındaki "PDF'i aç" düğmesi PDF'i yeni sekmede açar.
2. Yazdır penceresinde:
   - Yazıcı: Epson CW-C4000e.
   - Ölçek: **%100 / Gerçek boyut**. "Sayfaya sığdır" kapalı olmalı.
   - Kenar boşlukları: **Yok**.
   - Kâğıt boyutu: etiketin boyutu (ör. 60 × 40 mm). Sürücüde bu boyut yoksa Epson sürücüsünde özel kâğıt boyutu tanımlayın.
   - Arka plan grafikleri: **açık**. Renkli bantlar bu ayar kapalıyken basılmaz.
3. Sürücüde medya türünü kullanılan etiket rulosuna göre seçin (mat / parlak).

## 3. Test etiketi

Bir adet basın ve kontrol edin:

| Kontrol | Nasıl | Beklenen |
|---|---|---|
| Ölçü | Cetvelle genişlik ve yükseklik | Şablon boyutu ±0,5 mm |
| Konum | Kenardan metin/barkod uzaklığı | Editördeki X/Y değerleri ±0,5 mm |
| Türkçe karakterler | Ç Ğ İ Ö Ş Ü ç ğ ı ö ş ü | Hepsi doğru ve aynı yazı tipinde |
| Barkod | El okuyucusuyla okutun | Ürün kodu (SKU) aynen okunur |
| QR | Telefonla okutun | Beklenen içerik okunur |
| Renk | Kurumsal yeşil bant vb. | Gözle kabul edilebilir; sapma varsa medya ayarını kontrol edin |
| Adet | 3 adetlik bir talep basın | 3 etiket, aynı içerik |

## 4. Sorun çıkarsa

- **Etiket küçük veya kaymış:** ölçek %100 değildir ya da kenar boşluğu vardır. Yazdır penceresini tekrar kontrol edin.
- **Barkod okunmuyor:** barkodun genişliğini artırın. Bu, editörde barkod öğesinin genişliği demektir.
  - Barkodlar şu an raster görüntü olarak basılıyor; çok küçük barkodlarda okuma zorlaşabilir.
  - Vektör barkod Faz 4 kapsamındadır.
- **Yazı tipi farklı görünüyor:** sunucu, editördeki yazı tiplerinin açık kaynak eşdeğerleriyle basar.

  | Editördeki yazı tipi | Sunucunun bastığı |
  |---|---|
  | Arial | Liberation Sans |
  | Times New Roman | Liberation Serif |
  | Courier New | Liberation Mono |
  | Verdana | DejaVu Sans |

  Arial, Times New Roman ve Courier New eşdeğerlerinin harf genişlikleri aynıdır. Verdana eşdeğeri biraz farklı olabilir.
- **Renk farklı:** Epson sürücüsünde medya türü ve renk ayarını kontrol edin.

Bir sorunu bildirirken basılan etiketin fotoğrafını, `pdf-snapshot` çıktısını ve kullanılan sürücü ayarlarını ekleyin.
