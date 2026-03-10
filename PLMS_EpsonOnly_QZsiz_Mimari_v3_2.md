# 🏷️ PLMS v3.2 — Epson-Only, QZ'siz Mimari Karar Dokümanı

**Hazırlayan:** ChatGPT  
**Tarih:** Mart 2026  
**Versiyon:** 3.2 (öneri eki)  
**Durum:** Taslak / Karar Dokümanı

---

## 1. Amaç

Bu doküman, mevcut **PLMS v3.1** mimarisinin yalnızca **Epson ColorWorks CW-C4000e** ile çalışacak şekilde sadeleştirilmiş, **QZ Tray bağımlılığı kaldırılmış** MVP/ilk faz mimarisini tanımlar.

Ana hedef:

- sistemi daha hızlı ayağa kaldırmak,
- istemci tarafı kurulum ve sertifika operasyonunu azaltmak,
- yalnızca renkli etiket çıktısı ihtiyacını karşılamak,
- Zebra / ZPL / diyalogsuz yazdırma gibi ileri ihtiyaçları sonraki fazlara ertelemek.

Bu yaklaşımda baskı modeli şu şekilde olacaktır:

**Backend PDF üretir → kullanıcı tarayıcıda etiketi açar → Epson driver üzerinden yazdırır → kullanıcı sonucu teyit eder.**

---

## 2. Karar Özeti

## 2.1 Alınan Temel Karar

PLMS'in ilk canlı sürümünde:

- **QZ Tray kullanılmayacaktır.**
- **Zebra / ZPL / RAW print kapsam dışıdır.**
- **Tek desteklenen baskı hedefi Epson CW-C4000e olacaktır.**
- **Etiket çıktısı backend tarafından PDF olarak üretilecektir.**
- **Tarayıcı yalnızca PDF görüntüleme ve yazdırma başlatma aracı olarak kullanılacaktır.**
- **Baskı sonucu sistem tarafından kesin teknik teyit yerine kullanıcı teyidi ile kapanacaktır.**

## 2.2 Bu Kararın Gerekçesi

Bu sadeleştirme ile aşağıdaki karmaşıklıklar ilk fazdan çıkarılmış olur:

- QZ Tray kurulumu ve sürüm yönetimi
- istemci sertifika yaşam döngüsü
- browser ↔ localhost yazdırma köprüsü bağımlılığı
- Zebra için ZPL renderer ve printer profile karmaşıklığı
- sessiz baskı ile ilgili güvenlik ve operasyon problemleri
- orphaned / qz_connected / submitted_to_printer gibi ara durumların yönetimi

Bu sayede proje daha hızlı, daha öngörülebilir ve daha az operasyonel riskle canlıya alınabilir.

---

## 3. Bu Yaklaşım Ne Sağlar, Ne Sağlamaz

## 3.1 Sağladıkları

Bu yaklaşım aşağıdaki ihtiyaçları karşılar:

- renkli etiket baskısı
- logo, görsel, ikon ve kurumsal tasarımlı etiketler
- PDF tabanlı sabit ölçülü çıktı üretimi
- kontrollü ve kullanıcı denetimli baskı
- düşük operasyon maliyeti
- tek yazıcı veya az sayıda baskı noktası olan senaryolar
- ilk faz için hızlı devreye alma

## 3.2 Sağlamadıkları

Bu yaklaşım aşağıdakileri sağlamaz veya sınırlı sağlar:

- diyalogsuz / sessiz yazdırma
- arka planda otomatik baskı
- kullanıcıya yazıcı seçtirmeden zorunlu printer'a gönderme
- yazıcının gerçekten fiziksel olarak bastığını sistem tarafından kesin teyit etme
- kiosk / unattended kullanım
- Zebra termal etiket akışı
- çok yüksek hacimli ve hatasız otomatik batch print

Sonuç olarak bu mimari **“kontrollü operatör baskısı”** için uygundur; **“tam otomatik baskı hattı”** için değildir.

---

## 4. Önerilen Hedef Senaryo

PLMS ilk sürümünde aşağıdaki operasyon modeline göre kurgulanmalıdır:

1. Kullanıcı etiketi editörde hazırlar veya onaylı şablondan seçer.
2. Kullanıcı baskı verisini girer ya da kayıt seçer.
3. Backend canonical model + payload üzerinden PDF üretir.
4. PDF uygulama içinde preview edilir.
5. Kullanıcı "Yazdır" dediğinde sistem PDF'i yeni sekmede veya gömülü görüntüleyicide açar.
6. Kullanıcı Epson CW-C4000e yazıcısını seçer.
7. Kullanıcı baskı sonrası sistem ekranında şu seçeneklerden birini işaretler:
   - Başarıyla yazdırıldı
   - Yazdırma başarısız oldu
   - İptal edildi
8. Buna göre print job kapanır.

Bu modelde insan operatör, baskı sürecinin bilinçli bir parçasıdır.

---

## 5. Mimari Sadeleştirme

## 5.1 Çıkarılan Bileşenler

Aşağıdaki bileşenler ilk faz kapsamından çıkarılır:

- QZ Tray entegrasyonu
- QZ sertifika zinciri ve GPO dağıtımı
- Zebra için ZPL builder
- RAW print yolu
- printer_confirmed / qz_connected / orphaned gibi QZ odaklı job durumları
- ZPL stored format optimizasyonu
- emergency Zebra print tool
- QZ support matrix

## 5.2 Korunan Bileşenler

Aşağıdaki çekirdek yapı aynen korunur:

- web tabanlı etiket editörü
- canonical label model
- preview renderer
- PDF renderer
- ürün / etiket / şablon veritabanı
- şablon yaşam döngüsü
- audit log
- RBAC
- reprint politikası
- import (CSV/Excel)
- seri numarası üretimi

## 5.3 Yeni Basitleştirilmiş Mimari

```text
Kullanıcı
   │
   ▼
Web Uygulaması (Editor + Preview + Print UI)
   │
   ├── Template Service
   ├── Variable/Data Service
   ├── Render Service (Preview + PDF)
   ├── Print Job Service
   └── Audit Service
   │
   ▼
PostgreSQL
   │
   ▼
PDF çıktısı
   │
   ▼
Tarayıcı / PDF görüntüleyici
   │
   ▼
Windows print dialog + Epson driver
   │
   ▼
Epson CW-C4000e
```

Bu akışta uygulama yazıcıya doğrudan komut göndermez. Uygulama yalnızca doğru ölçüde ve doğru tasarımda çıktı üretir.

---

## 6. Baskı Modeli

## 6.1 Temel İlke

PLMS, Epson-only fazda bir **print orchestration platformu** değil, bir **print-ready PDF üretim sistemi** olarak davranmalıdır.

Bu mimaride sistemin ana sorumluluğu:

- etiketi doğru üretmek,
- kullanıcının doğru veriyi bastığından emin olmak,
- baskı denemesini kayda almak,
- reprint ve audit sürecini yönetmek.

Sistemin sorumlu olmadığı alan:

- driver seviyesi spool yönetimi,
- yazıcı donanım teyidi,
- OS print queue takibi,
- fiziksel çıktı doğrulaması.

## 6.2 Önerilen Print Job Durumları

QZ'siz Epson modelinde state machine sadeleştirilmelidir.

### Önerilen Job Status Akışı

```text
queued
  → rendering
    → rendered
      → sent_to_client
        → user_print_initiated
          → user_confirmed
          → user_reported_failed
          → cancelled
```

## 6.3 Durum Açıklamaları

| Durum | Açıklama |
|------|----------|
| `queued` | Baskı isteği oluşturuldu |
| `rendering` | PDF üretimi devam ediyor |
| `rendered` | PDF başarıyla üretildi |
| `sent_to_client` | PDF istemciye ulaştı / açıldı |
| `user_print_initiated` | Kullanıcı yazdırma aksiyonunu başlattı |
| `user_confirmed` | Kullanıcı baskının başarılı olduğunu teyit etti |
| `user_reported_failed` | Kullanıcı baskının başarısız olduğunu bildirdi |
| `cancelled` | Kullanıcı işlemi iptal etti |

## 6.4 Neden Bu Kadar Basit Tutulmalı?

Çünkü tarayıcı tabanlı standart yazdırmada uygulama çoğu zaman şunları kesin olarak bilemez:

- kullanıcı gerçekten hangi printer'ı seçti,
- kaç kopya bastı,
- driver hata verdi mi,
- spool'a düşüp düşmedi,
- fiziksel olarak etiket çıktı mı.

Bu yüzden sistemin gerçekte bilmediği olayları sahte bir teknik doğrulukla modellemek yanlış olur.

---

## 7. PDF Stratejisi

## 7.1 HTML Print Yerine PDF

Epson-only sürümde çıktı kanalı olarak **HTML print değil, backend-generated PDF** kullanılmalıdır.

Sebep:

- tarayıcılar arası render farkı azalır,
- margin / scale problemleri daha kontrollü olur,
- etiket ölçüsü daha öngörülebilir hâle gelir,
- görsel kalite daha iyi korunur,
- audit ve yeniden üretim daha güvenilir olur.

## 7.2 PDF İçin Teknik Kurallar

- PDF fiziksel etiket ölçüsüne bire bir uygun üretilmelidir.
- Varsayılan sayfa boyutu etiket boyutuna göre özel tanımlanmalıdır.
- Otomatik page scaling kapatılmalıdır.
- PDF içinde raster yerine mümkün oldukça vektörel içerik korunmalıdır.
- Barkod ve QR'lar mümkünse vektörel çizim olarak üretilmelidir.
- Yazı tiplerinde metrik kayma yaşanmaması için font whitelist uygulanmalıdır.

## 7.3 `UnitConverter` Zorunluluğu

Tüm boyut hesaplamaları tek merkezden yapılmalıdır.

Önerilen yaklaşım:

- editörde mm bazlı çalışma
- backend'de decimal tabanlı hesaplama
- PDF render aşamasında sabit unit conversion
- tüm renderer'larda ortak `UnitConverter` kullanımı

Örnek sorumluluklar:

- mm → point dönüşümü
- mm → pixel dönüşümü (sadece preview için)
- güvenli rounding kuralları
- margin / bleed / printable area hesapları

Bu sınıf olmadan preview ile PDF arasında kayma riski artar.

---

## 8. Epson Driver Standardizasyonu

QZ'siz modelde baskı kalitesi büyük ölçüde **Windows driver preset standardizasyonuna** bağlıdır.

Bu nedenle proje yalnızca yazılımdan ibaret görülmemelidir; istemci yazdırma profili de standardize edilmelidir.

## 8.1 Zorunlu Driver Standardı

Her baskı noktasında aşağıdakiler tanımlanmalıdır:

- aynı driver sürümü
- aynı medya tipi
- aynı etiket boyutu tanımı
- aynı orientation
- aynı scaling ayarı
- aynı color / quality preset
- aynı margin davranışı

## 8.2 Operasyon Kuralı

IT, tüm Epson cihazlar için standart bir **Printer Profile / Driver Preset** oluşturmalıdır.

Önerilen profil adı:

- `PLMS_100x50_Default`
- `PLMS_80x40_Default`
- `PLMS_AssetTag_Small`

Uygulama tarafında da her şablon hangi preset ile basılması gerektiğini metadata olarak taşımalıdır.

Örnek:

```json
{
  "templateCode": "URN-100x50-RENKLI",
  "printerFamily": "EPSON_CW_C4000E",
  "recommendedDriverPreset": "PLMS_100x50_Default",
  "mediaWidthMm": 100,
  "mediaHeightMm": 50,
  "orientation": "landscape"
}
```

---

## 9. UI/UX Değişiklikleri

QZ'siz Epson-only sürümde yazdırma ekranı aşağıdaki şekilde tasarlanmalıdır.

## 9.1 Yazdırma Diyaloğu Öncesi Uyarı Ekranı

Kullanıcıya şu bilgiler gösterilmelidir:

- şablon adı
- versiyon
- etiket boyutu
- baskı adedi
- önerilen yazıcı ailesi
- önerilen driver preset
- son önizleme

## 9.2 Yazdırma Sonrası Kullanıcı Teyidi

Tarayıcı print aksiyonu sonrası kullanıcıya şu basit modal gösterilir:

**Baskı sonucu nedir?**

- Başarıyla yazdırıldı
- Yazdırılamadı
- Vazgeçtim / iptal ettim

Gerekirse başarısız durumda neden seçimi de alınabilir:

- yanlış hizalama
- driver hatası
- yazıcı görünmedi
- medya bitti
- renk / kalite problemi
- kullanıcı hatası
- diğer

Bu veri audit ve operasyon iyileştirmesi için çok değerlidir.

## 9.3 Reprint UX

QZ'siz modelde yanlış baskı ihtimali daha yüksek olduğu için reprint akışı korunmalıdır.

Öneri:

- aynı etiketi yeniden basmak için gerekçe zorunlu olsun,
- orijinal print job ile bağlantı kurulsun,
- tekrar baskı adedi loglansın,
- belirli şablonlarda onay zorunlu olsun.

---

## 10. Veri Modeli Etkileri

## 10.1 Sadeleştirilebilecek Alanlar

Aşağıdaki alanlar Epson-only ilk fazda opsiyonel veya gereksiz olabilir:

- `qz_session_id`
- `client_ack_payload`
- `printer_submit_at`
- `spooled_unconfirmed`
- `printer_confirmed`
- `orphan_resolution_user_id`
- Zebra odaklı capability alanları

## 10.2 Korunması Gereken Alanlar

Aşağıdaki alanlar mutlaka korunmalıdır:

- `print_jobs`
- `print_job_items`
- `label_instances`
- `reprint_requests`
- `template_version_id`
- `printed_payload` snapshot
- `requested_by`
- `status`
- `failure_reason`
- `user_confirmation_at`

## 10.3 Önerilen Ek Alanlar

Epson-only model için şu alanlar faydalıdır:

| Alan | Amaç |
|------|------|
| `recommended_driver_preset` | Hangi preset ile basılması gerektiği |
| `client_pdf_opened_at` | PDF istemcide ne zaman açıldı |
| `user_print_started_at` | Kullanıcı yazdırmayı ne zaman başlattı |
| `user_confirmed_at` | Başarılı teyit zamanı |
| `user_failure_reason` | Başarısızlık kategorisi |
| `client_machine_name` | Hangi terminalden denendi |

---

## 11. Güvenlik ve Yetkilendirme

QZ Tray kaldırılınca güvenlik modeli sadeleşir; fakat baskı ve veri güvenliği hâlâ kritik olmaya devam eder.

## 11.1 Basitleşen Riskler

Azalan riskler:

- localhost print bridge kötüye kullanımı
- sertifika güven zinciri problemleri
- istemci tarafı print middleware zafiyetleri
- browser ↔ local agent entegrasyon sorunları

## 11.2 Devam Eden Riskler

Hâlâ yönetilmesi gerekenler:

- yetkisiz reprint
- yanlış veri ile baskı
- yanlış template versiyonunun kullanılması
- PDF'in dışarı alınması / paylaşılması
- hatalı veya eski driver preset kullanımı
- kullanıcıların farklı printer seçmesi

## 11.3 Önerilen Kontroller

- yalnızca onaylı template versiyonları basılabilsin
- reprint için policy bazlı onay zorunlu olsun
- her baskıda payload snapshot saklansın
- hassas etiketlerde watermark veya internal trace id değerlendirilsin
- audit log değiştirilemez yapıda tutulsun
- kullanıcı bazlı günlük baskı limiti opsiyonel olsun

---

## 12. Operasyonel Riskler

## 12.1 En Büyük Risk

QZ kaldırıldığında en büyük teknik risk artık yazılım değil, **istemci driver konfigürasyon sapması** olur.

Yani sorunlar daha çok şu başlıklarda görülür:

- bir bilgisayarda scaling açık, diğerinde kapalı
- yanlış etiket boyutu seçilmiş
- kullanıcı farklı printer seçmiş
- medya tipi yanlış
- sürücü sürümü farklı
- kalite ayarı farklı

## 12.2 Risk Tablosu

| Risk | Etki | Azaltma Yöntemi |
|------|------|-----------------|
| Yanlış driver ayarı | Baskı kayması / yanlış boyut | Standart preset + kurulum checklist |
| Kullanıcının yanlış printer seçmesi | Yanlış cihaza baskı | UI uyarısı + terminal bazlı printer önerisi |
| Kullanıcının baskıyı teyit etmemesi | Kayıt eksikliği | Zorunlu sonrası modal |
| PDF ölçekleme hatası | Ölçü bozulması | Sabit PDF üretimi + test etiketi |
| Farklı Windows/driver sürümü | Tutarsız kalite | versiyon standardizasyonu |
| Toplu baskıda insan hatası | Yanlış adet / tekrar baskı | batch preview + limit + reprint kontrolü |

---

## 13. Test ve Kalibrasyon Standardı

Epson-only modelde canlı öncesi aşağıdaki testler zorunlu tutulmalıdır.

## 13.1 Golden Sample Set

Her kritik etiket tipi için şu set saklanmalıdır:

- canonical JSON
- örnek payload
- beklenen PDF referansı
- ölçüm noktaları
- kabul toleransı

## 13.2 Fiziksel Testler

Her etiket tipi için:

- genişlik doğruluğu
- yükseklik doğruluğu
- barkod okunabilirliği
- QR okunabilirliği
- renk tutarlılığı
- logo netliği
- hizalama
- kesim / medya pozisyonu

## 13.3 Test Etiketi Sihirbazı

Her yeni baskı noktasında aşağıdaki akış çalıştırılmalıdır:

1. Test etiketi üret
2. Epson preset ile yazdır
3. Operatör ölçüm değerlerini girsin
4. Sapma varsa terminal "uygunsuz" işaretlensin
5. Canlı baskıya ancak sonrasında izin verilsin

---

## 14. Faz Planı

## 14.1 Faz A — Çekirdek Platform

- editor MVP
- template yönetimi
- canonical model
- preview renderer
- PDF renderer
- ürün/veri import
- temel audit log

## 14.2 Faz B — Epson-only Canlı Pilot

- Epson CW-C4000e desteği
- driver preset standardı
- print job takibi
- kullanıcı teyitli baskı kapanışı
- reprint akışı
- test etiketi ve kalibrasyon sihirbazı
- 1-2 baskı noktasında pilot

## 14.3 Faz C — Operasyon Sertleştirme

- batch print UX iyileştirmeleri
- daha güçlü audit dashboard
- istasyon bazlı printer önerisi
- başarısız baskı analitiği
- asset/font governance

## 14.4 Faz D — Zebra / Sessiz Baskı (Opsiyonel)

Bu faz yalnızca gerçekten ihtiyaç oluşursa açılmalıdır:

- Zebra desteği
- ZPL renderer
- sessiz baskı çözümü
- QZ Tray veya alternatif native print bridge
- printer capability matrix genişletme
- orphaned / unconfirmed job yönetimi

Bu yaklaşım, yüksek karmaşıklıklı kısmı gerçek ihtiyaç doğana kadar ertelemiş olur.

---

## 15. API Uyarlamaları

QZ'siz model için API yüzeyi sadeleştirilebilir.

## 15.1 Korunacak API'ler

- `POST /api/templates`
- `POST /api/render/preview`
- `POST /api/render/pdf`
- `POST /api/print/jobs`
- `GET /api/print/jobs/{id}`
- `POST /api/print/jobs/{id}/confirm`
- `POST /api/print/jobs/{id}/fail`
- `POST /api/labels/{id}/reprint`

## 15.2 Ertelenebilecek API'ler

- `POST /api/render/zpl`
- `POST /api/print/jobs/{id}/retry-to-printer`
- QZ session / connectivity API'leri
- Zebra printer profile API'leri

## 15.3 Önerilen Yeni API'ler

- `POST /api/print/jobs/{id}/opened` → PDF istemcide açıldı bilgisi
- `POST /api/print/jobs/{id}/print-started` → kullanıcı yazdırmayı başlattı
- `POST /api/print/jobs/{id}/confirm` → kullanıcı başarılı teyidi verdi
- `POST /api/print/jobs/{id}/fail` → kullanıcı başarısızlık nedeni bildirdi

---

## 16. Uygulama İçin Net Tavsiyeler

## 16.1 Hemen Yapılmalı

- QZ Tray kapsamdan çıkarılsın
- Zebra/ZPL modülleri backlog'a alınsın
- Epson-only baskı akışı ana MVP olarak kabul edilsin
- PDF renderer ana çıktı motoru olsun
- driver preset standardı ayrı bir operasyon çıktısı olarak tanımlansın
- print state machine sadeleştirilsin
- kullanıcı teyit ekranı zorunlu kılınsın
- golden sample test seti kurulsun

## 16.2 Erken Yapılmamalı

- sessiz baskı
- browser bypass çözümleri
- local print agent geliştirme
- Zebra stored format optimizasyonu
- çok karmaşık printer telemetry hedefleri

## 16.3 Kritik Tasarım Prensibi

İlk sürümün hedefi:

**“kusursuz otomasyon” değil, “öngörülebilir ve ölçülebilir baskı süreci”** olmalıdır.

Bu prensip korunursa sistem hem daha hızlı çıkar hem de daha az sürpriz üretir.

---

## 17. Nihai Karar

Mevcut ihtiyaç yalnızca **Epson CW-C4000e üzerinden kontrollü etiket baskısı** ise, proje **QZ Tray olmadan rahatlıkla hazırlanabilir**.

Bu senaryoda tarayıcının baskı özelliği tek başına yeterlidir; ancak şu koşulla:

- sistem, yazıcıya doğrudan hükmeden otomatik baskı sistemi gibi değil,
- kullanıcı kontrollü PDF baskı platformu gibi tasarlanmalıdır.

Bu nedenle PLMS v3.2 için önerilen resmi karar şudur:

> **İlk canlı sürüm Epson-only + QZ'siz + PDF tabanlı + kullanıcı teyitli baskı modeli ile yayınlansın.**

Zebra, ZPL ve diyalogsuz yazdırma yalnızca sahada gerçek ihtiyaç doğrulanırsa ikinci fazda ele alınsın.

---

## 18. Ek — Kısa Karşılaştırma

| Konu | QZ'li Model | Epson-only QZ'siz Model |
|------|-------------|--------------------------|
| Yazıcıya doğrudan gönderim | Var | Yok |
| Sessiz baskı | Var | Yok |
| Sertifika operasyonu | Var | Yok |
| İstemci kurulum yükü | Daha yüksek | Daha düşük |
| Zebra desteği | Var | Yok |
| Epson desteği | Var | Var |
| Kullanıcı kontrolü | Orta | Yüksek |
| Otomasyon seviyesi | Yüksek | Orta |
| İlk faz karmaşıklığı | Yüksek | Düşük |
| MVP'ye uygunluk | Orta | Çok yüksek |

---

## 19. Sonuç Cümlesi

**Eğer bugün gerçek ihtiyaç Epson CW-C4000e ile doğru, kontrollü ve izlenebilir çıktı almak ise, QZ Tray şu aşamada gereksiz karmaşıklık yaratır.**

En doğru yol, PLMS'i önce **PDF tabanlı Epson-only mimari** ile canlıya almak; sessiz baskı ve Zebra desteğini ise ihtiyaç doğrulanınca eklemektir.
