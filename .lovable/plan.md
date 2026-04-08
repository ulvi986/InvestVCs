
## Plan: Platform Yenilənməsi

### 1. Dizayn Yenilənməsi
- Landing page-ə dinamik dalğa animasiyası (CSS/SVG wave animation) əlavə et
- Sidebar əvəzinə yuxarıda horizontal navigation bar (platform görünüşü)
- Logo klikləndikdə ana səhifəyə yönləndir
- Ümumi dizaynı daha modern və cəlbedici et (gradient-lər, animasiyalar)

### 2. Database Dəyişiklikləri
- `vouchers` table: admin tərəfindən yaradılan voucher kodları (code, type: 'bmc'|'pitch_deck', max_uses, used_count, created_by)
- `voucher_redemptions` table: istifadəçinin hansı voucher istifadə etdiyini izləmək
- `business_model_canvas` table: istifadəçinin BMC məlumatları (JSON formatda 9 blok)
- `pitch_deck_analyses` table: yüklənmiş pitch deck-lərin təhlil nəticələri
- Storage bucket: pitch deck faylları üçün

### 3. Venture Analysis Bölməsi
- **Business Model Canvas**: 
  - 9 bloklu interaktiv canvas şablonu (Key Partners, Key Activities, Value Propositions, Customer Relationships, Customer Segments, Key Resources, Channels, Cost Structure, Revenue Streams)
  - İstifadəçi doldurur → Voucher daxil edir → AI təhlil edir → Nəticələr göstərilir
  
- **Pitch Deck Analizi**:
  - PPT yükləmə (max 10 slayd, 15MB)
  - Voucher daxil edir → AI sənədi təhlil edir → Nəticələr göstərilir

### 4. Voucher Sistemi
- Admin paneldə voucher yaratma/silmə
- Voucher kodu, tipi (BMC/Pitch Deck), istifadə limiti
- İstifadəçi təhlil istəyəndə voucher kodu daxil edir

### 5. AI İnteqrasiyası
- Lovable AI Gateway vasitəsilə Edge Function yaradılacaq
- BMC təhlili: 9 bloku oxuyub güclü/zəif tərəfləri, tövsiyələr verəcək
- Pitch Deck təhlili: slaydları oxuyub struktur, məzmun, dizayn haqqında rəy verəcək

### Sıralama
1. Əvvəlcə dizayn yenilənməsi (dalğa, navigation, platform görünüşü)
2. Database migrasiyaları
3. BMC səhifəsi
4. Pitch Deck səhifəsi
5. Voucher sistemi + Admin panel
6. AI Edge Function-lar
