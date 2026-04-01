# Etiket Editörü — UX İyileştirme Önerileri

Mevcut editör kodunu (EditorCanvasStage, EditorShell, EditorInspector, EditorLayersPanel, SelectionToolbar, EditorTopBar, useEditorStore, editor-actions) kapsamlı olarak inceledikten sonra, kullanıcı deneyimini artıracak iyileştirme önerilerini **öncelik sırasına göre** aşağıda grupladım.

---

## 🔴 Yüksek Öncelik — Temel UX Sorunları

### 1. Canvas Üzerinde Inline Text Editing *(Mevcut planda var)*
Text elementine çift tıklayınca doğrudan canvas üstünde yazı yazabilme. Şu an sadece sağ paneldeki textarea'dan düzenlenebiliyor — bu çok yavaşlatıcı.

### 2. Element Üstüne Element Ekleme *(Mevcut planda var)*
Araç seçili iken mevcut bir elementin üstüne tıklayınca yeni element ekleyememe sorunu.

### 3. Fill/Stroke Toggle *(Mevcut planda var)*
Şekillerde dolgu ve kenar çizgisini açıp kapatabilme.

### 4. Toolbar Pozisyonlama *(Mevcut planda var)*
Selection toolbar'ın pozisyon iyileştirmesi.

---

## 🟠 Orta Öncelik — Verimlilik ve Hız

### 5. Sağ Tık Bağlam Menüsü (Context Menu)
**Mevcut Durum:** Yok.
**Öneri:** Canvas'ta veya layers panelinde bir elemente sağ tıklandığında şu seçenekleri sunan bir popup menü:
- Kes / Kopyala / Yapıştır
- Çoğalt
- Öne getir / Arkaya gönder
- Kilitle / Gizle
- Grupla / Grubu çöz
- Sil

**Etki:** Profesyonel editör deneyimi. Kullanıcılar sağ tık menüsünü refleks olarak bekler.

---

### 6. Kopyala-Yapıştır (Ctrl+C / Ctrl+V)
**Mevcut Durum:** Sadece `Ctrl+D` ile çoğaltma var, ama kopyala-yapıştır yok.
**Öneri:**
- `Ctrl+C` → Seçili element(ler)i clipboard'a kopyala
- `Ctrl+V` → Kopyalanan element(ler)i yapıştır (biraz offset ile)
- `Ctrl+X` → Kes

**Etki:** En temel editör beklentilerinden biri.

---

### 7. Katmanlar Panelinde Sürükle-Bırak Sıralama (Drag & Drop Reorder)
**Mevcut Durum:** Katman sıralaması sadece `[` / `]` tuşlarıyla veya toolbar'daki İleri/Geri/Öne/Arkaya butonlarıyla değiştirilebiliyor.
**Öneri:** Layers panelinde katmanları sürükleyerek sırasını değiştirme (react-beautiful-dnd veya @dnd-kit).

**Etki:** Çok daha sezgisel katman yönetimi.

---

### 8. Çoklu Seçimde Tutarlı Özellik Düzenleme
**Mevcut Durum:** Çoklu seçimde inspector paneli sadece sınırlı bulk düzenleme sunuyor (font size, line height, letter spacing).
**Öneri:**
- Ortak olan tüm alanları göster (renk, konum, boyut)
- Farklı değerler varsa "mixed" placeholder göster
- Herhangi bir alan değiştiğinde tüm seçili elementlere uygula
**Durum:** ✅ Tamamlandı (Metinler için font, hizalama, renk eklendi. Şekiller için fill/stroke ayarları çoklu seçimde erişilebilir yapıldı.)

**Etki:** Çoklu seçimle çalışmayı çok hızlandırır.

---

### 9. Akıllı Kılavuz Çizgilerini Geliştirme
**Mevcut Durum:** Snap guides mevcut (`editor-guides.ts`), ama sadece kenar ve merkez hizalama var.
**Öneri:**
- Eşit aralık (equal spacing) kılavuzlar — 3+ element arasındaki mesafeyi göster
- Margin değerlerini onMouseMove sırasında px/mm olarak canvas'ta label olarak göster
- Element boyutu değiştirilirken de kılavuz çizgileri göster
**Durum:** ✅ Tamamlandı (Eşit aralık, kenar/merkez snap ve turuncu ölçü etiketleri eklendi)

**Etki:** Hassas yerleşim çok daha kolay.

---

### 10. Klavye Kısayolları Yardım Paneli
**Mevcut Durum:** Kısayollar var ama kullanıcıya hiçbir yerde gösterilmiyor.
**Öneri:** `?` tuşuyla veya help butonu ile açılan bir modal/overlay:

| Kısayol | İşlev |
|---|---|
| `Ctrl+S` | Kaydet |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Geri/İleri al |
| `Ctrl+D` | Çoğalt |
| `Ctrl+G` / `Ctrl+Shift+G` | Grupla / Grubu çöz |
| `Delete` | Sil |
| `R` / `Shift+R` | Saat yönünde / ters döndür |
| `[` / `]` | Katman sırası ileri/geri |
| `Shift+[` / `Shift+]` | En öne / en arkaya |
| `Arrow Keys` | 0.5mm nudge |
| `Shift+Arrow` | 2mm nudge |
| `Space` sürükle | Pan (kaydır) |
| `Ctrl+Scroll` | Zoom |
| `Escape` | Seçimi kaldır |

**Etki:** Keşfedilebilirlik. Kullanıcılar kısayolları öğrendikçe hızlanır.

---

## 🟡 Orta-Düşük Öncelik — Gelişmiş Özellikler

### 11. Font Ailesi Genişletme ve Google Fonts Desteği
**Mevcut Durum:** Sadece 4 sistem fontu: Arial, Verdana, Courier New, Times New Roman.
**Öneri:**
- Arial ekseninde daha fazla sans-serif font ekle (Inter, Roboto, Montserrat, Open Sans)
- Etiket baskı uyumu için monospace fontlar (Roboto Mono, JetBrains Mono)
- Font önizlemesi (her opsiyonun kendi fontuyla yazılması)

**Etki:** Etiket tasarımında görsel çeşitlilik.

---

### 12. Renk Paleti / Swatch Sistemi
**Mevcut Durum:** Sadece native HTML color picker.
**Öneri:**
- Son kullanılan renkler listesi
- Proje bazlı renk paleti (marka renkleri kayıt)
- Hex / RGB değeri doğrudan girebilme (şu an var ama UX iyileştirilebilir)
- Eyedropper / renk örnekleyici (EyeDropper API)

**Etki:** Tutarlı marka renkleri, hızlı renk seçimi.

---

### 13. Element Şablonları / Hızlı Ekleme
**Mevcut Durum:** Her element tek tek ekleniyor, standart boyut ve konumda.
**Öneri:**
- "Hızlı ekleme" paneli: Sık kullanılan element kombinasyonları
  - "Ürün etiketi" → Barkod + Text + QR hazır şablon
  - "Fiyat etiketi" → Text + Rectangle arkaplan
- Son eklenen elementlerin geçmişi

**Etki:** Tekrarlayan iş akışlarını hızlandırır.

---

### 14. Zoom to Selection
**Mevcut Durum:** Sadece `Fit` ve `100%` zoom seçenekleri var.
**Öneri:**
- Seçili elemente zoom yapma (`Ctrl+1` veya buton)
- Mouse pozisyonuna zoom (şu an Ctrl+Scroll var ama daha smooth olabilir)
- Zoom slider veya girdi alanı (tam değer girilebilir)
**Durum:** ✅ Tamamlandı (Ctrl+1 kısayolu ve toolbar butonu eklendi)

**Etki:** Küçük elementlerle hassas çalışma.

---

### 15. Canvas Üzerinde Boyut/Konum Göstergesi
**Mevcut Durum:** Boyut bilgisi sadece inspector panelinde.
**Öneri:**
- Sürükleme sırasında elementin yanında X, Y koordinatlarını tooltip olarak göster
- Boyut değiştirme sırasında W × H değerini göster
- Seçili elementler arası mesafe göstergesi

**Etki:** Inspector'a bakmadan hassas konumlandırma.

---

### 16. Otomatik Kaydetme (Auto-save)
**Mevcut Durum:** Sadece `Ctrl+S` veya buton ile manuel kayıt.
**Öneri:**
- Son değişiklikten 3-5 saniye sonra otomatik kayıt (debounced)
- "Kaydediliyor..." / "Kaydedildi" göstergesi
- Ağ hatası durumunda retry ve uyarı

**Etki:** Veri kaybını önler, kullanıcı güvenini artırır.

---

## 🟢 Düşük Öncelik — "Nice to Have"

### 17. Undo/Redo Geçmişi Görüntüleme
**Mevcut Durum:** Sadece Ctrl+Z / Ctrl+Shift+Z.
**Öneri:** History paneli — her adımın ne olduğunu gösteren liste ("Text 1 taşındı", "Rect 2 silindi"). Belirli bir adıma tıklayarak o duruma dönme.

---

### 18. Grid / Izgara Gösterimi
**Mevcut Durum:** Snap mevcut ama görünür bir grid yok.
**Öneri:**
- Canvas üzerinde toggle edilebilir mm grid çizgileri
- Grid boyutu ayarlanabilir (1mm, 2mm, 5mm)
- Grid'e snap on/off

---

### 19. Alignment Kılavuz Çizgileri (Rulers'a Tıklama)
**Mevcut Durum:** Ruler mevcut ama etkileşimsiz.
**Öneri:**
- Üst/Sol ruler'a tıklayıp sürükleyerek sabitlenmiş kılavuz çizgisi oluşturma
- Kılavuzları silme / gizleme

---

### 20. Dark/Light Preview Toggle
**Mevcut Durum:** Canvas arka planı her zaman beyaz.
**Öneri:** Etiketin basılacağı yüzey rengi simülasyonu — beyaz, şeffaf (checkerboard), özel renk.

---

### 21. Element Kilitleme Görseli
**Mevcut Durum:** Kilitli elementler draggable değil ama görsel bir gösterge yok.
**Öneri:** Kilitli elementlerin köşesinde küçük bir kilit ikonu, gizli elementler için yarı saydam + göz ikonu.

---

### 22. Multi-page / Ön-Arka Yüz Desteği
**Mevcut Durum:** Tek sayfa.
**Öneri:** Etiketin ön ve arka yüzünü ayrı tab'larda düzenleyebilme.

---

### 23. Touch / Tablet Desteği
**Mevcut Durum:** Mouse-only etkileşim.
**Öneri:**
- Pinch-to-zoom
- İki parmakla pan
- Touch-friendly daha büyük tıklama hedefleri

---

## Öncelik Matrisi

| # | Özellik | Zorluk | Etki | Öncelik |
|---|---------|--------|------|---------|
| 1-4 | Mevcut plan (inline edit, overlay, toggle, layering) | Orta | 🔴 Yüksek | **Hemen** |
| 5 | Sağ tık menüsü | Düşük | 🟠 Yüksek | **Sonraki sprint** |
| 6 | Kopyala-Yapıştır | Düşük | 🟠 Yüksek | **Sonraki sprint** |
| 7 | Layers drag-drop | Orta | 🟠 Orta | **Sonraki sprint** |
| 10 | Kısayol yardım paneli | Düşük | 🟠 Orta | **Sonraki sprint** |
| 15 | Canvas boyut/konum tooltip | Orta | 🟡 Orta | **3. sprint** |
| 16 | Auto-save | Düşük | 🟡 Orta | **3. sprint** |
| 11 | Font genişletme | Düşük | 🟡 Orta | **3. sprint** |
| 12 | Renk paleti | Orta | 🟡 Düşük | **Backlog** |
| 8 | Çoklu seçim detaylı düzenleme | Orta | 🟡 Orta | **Backlog** |
| 9 | Gelişmiş snap kılavuzlar | Yüksek | 🟡 Orta | **Backlog** |
| 18 | Grid gösterimi | Düşük | 🟢 Düşük | **Backlog** |
| 14 | Zoom to selection | Düşük | 🟢 Düşük | **Backlog** |
