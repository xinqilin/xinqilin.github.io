---
title: "Geohash 與地理索引：附近搜尋的格子邊界、Redis GEO，以及距離如何洩漏位置"
date: 2026-11-22
draft: false
author: Bill.Lin
description: "System Design 系列 Part 3：用 Geohash 把經緯度變成 B+Tree 能查的字串，實測格子邊界與 9 格查詢，比較 Redis GEO、MySQL SPATIAL 與 H3，並示範如何只靠距離回應三角定位使用者"
categories: ["SystemDesign"]
tags: ["System Design", "Geohash", "Geospatial", "Redis", "MySQL", "Security", "Privacy"]
---

> **System Design 系列** Part 3-8｜上一篇：[全文搜尋與倒排索引](/post/systemdesign/full-text-search/)｜下一篇：Replication 與 Replication Lag（撰寫中）｜[系列地圖](/post/systemdesign/system-design-thinking/#系列地圖)

## 情境與問題

講座平台開始辦實體講座，全台有 10 萬個合作場地（教室、共享空間、書店）。App 要新增「附近的實體講座」：

1. 以使用者目前的位置為圓心，列出 3 公里內的場地，由近到遠排序
2. 尖峰每秒 2,000 次查詢
3. 下一階段要做「附近的同好」，讓願意公開位置的學員找到彼此

## 最簡單的做法與它的極限

經緯度存成兩個 `DOUBLE` 欄位，查詢時對每個場地算一次距離，留下 3 公里內的。每次查詢要算 10 萬次距離，尖峰每秒 2 億次。

加索引也幫不上太多忙。B+Tree 是一維的：在 `(latitude, longitude)` 的複合索引上，緯度用了範圍條件，經度就不能再縮小掃描範圍（[Index 篇](/post/systemdesign/index-btree/)的最左前綴原則）。索引只能把範圍縮小到一條橫跨東西的「緯度帶」，下面的實測中，緯度帶裡有 1,500 多筆，真正在圓內的只有 43 筆。

問題的本質是：**要把二維的位置，變成一維的索引能處理的形式**。

## 核心機制

### Geohash：把座標變成一個字串

1. 把經度的範圍 [-180, 180] 對半切，座標落在右半就記 1、左半記 0，再對落進去的那一半繼續切
2. 緯度的範圍 [-90, 90] 用同樣的方式切
3. 把經度與緯度的 bit 交錯排列（第 1、3、5… 個 bit 是經度，第 2、4、6… 個是緯度）
4. 每 5 個 bit 換成一個 base32 字元

每多一個字元，格子就再切成 32 份。最重要的性質是：**前綴相同，就落在同一個格子裡**。台北 101 的 geohash 是 `wsqqqm29d`，它在 `wsqqq` 這個格子裡，也在更大的 `wsqq` 格子裡。所以「找出 `wsqqq` 格子裡的場地」就是 `geohash LIKE 'wsqqq%'`，一般的 B+Tree 索引就能做。

`wsqqq` 和它周圍的 8 個格子：

| | 西 | 中 | 東 |
|---|---|---|---|
| **北** | `wsqqt` | `wsqqw` | `wsqqx` |
| **中** | `wsqqm` | **`wsqqq`** | `wsqqr` |
| **南** | `wsqqj` | `wsqqn` | `wsqqp` |

### 實測：格子大小、邊界與附近搜尋

在台灣附近的經緯度範圍內隨機放 10 萬個場地，依 geohash 排序存放（等同於資料庫裡 geohash 欄位上的 B+Tree 索引），比較幾種查詢方式：

<details>
<summary>Geohash 實作（<code>Geohash.java</code>）</summary>

```java
package geo;

import java.util.ArrayList;
import java.util.List;

/** Geohash：把經度、緯度的二分結果交錯成一串 bit，每 5 bits 用一個 base32 字元表示。 */
public final class Geohash {

    private static final String BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
    private static final double EARTH_RADIUS_KM = 6371.0088;

    private Geohash() {
    }

    public static String encode(double latitude, double longitude, int length) {
        double[] lat = {-90, 90};
        double[] lng = {-180, 180};
        StringBuilder hash = new StringBuilder(length);
        boolean evenBit = true;                                     // 偶數位放經度，奇數位放緯度
        int bits = 0;
        int ch = 0;
        while (hash.length() < length) {
            double[] range = evenBit ? lng : lat;
            double value = evenBit ? longitude : latitude;
            double mid = (range[0] + range[1]) / 2;
            ch <<= 1;
            if (value >= mid) {
                ch |= 1;
                range[0] = mid;
            } else {
                range[1] = mid;
            }
            evenBit = !evenBit;
            if (++bits == 5) {
                hash.append(BASE32.charAt(ch));
                bits = 0;
                ch = 0;
            }
        }
        return hash.toString();
    }

    /** 回傳 {minLat, maxLat, minLng, maxLng}。 */
    public static double[] bounds(String hash) {
        double[] lat = {-90, 90};
        double[] lng = {-180, 180};
        boolean evenBit = true;
        for (char c : hash.toCharArray()) {
            int value = BASE32.indexOf(c);
            for (int bit = 4; bit >= 0; bit--) {
                double[] range = evenBit ? lng : lat;
                double mid = (range[0] + range[1]) / 2;
                if ((value >> bit & 1) == 1) {
                    range[0] = mid;
                } else {
                    range[1] = mid;
                }
                evenBit = !evenBit;
            }
        }
        return new double[] {lat[0], lat[1], lng[0], lng[1]};
    }

    /** 自己加上周圍 8 格。只要格子的寬高都不小於搜尋半徑，這 9 格就一定蓋住整個圓。 */
    public static List<String> cellAndNeighbors(String hash) {
        double[] b = bounds(hash);
        double height = b[1] - b[0];
        double width = b[3] - b[2];
        double centerLat = (b[0] + b[1]) / 2;
        double centerLng = (b[2] + b[3]) / 2;
        List<String> cells = new ArrayList<>(9);
        for (int dy = -1; dy <= 1; dy++) {
            for (int dx = -1; dx <= 1; dx++) {
                cells.add(encode(centerLat + dy * height, centerLng + dx * width, hash.length()));
            }
        }
        return cells;
    }

    /** 選擇格子不小於半徑的最長精度。 */
    public static int precisionFor(double radiusKm, double latitude) {
        for (int length = 9; length >= 1; length--) {
            double[] b = bounds(encode(latitude, 0, length));
            double heightKm = distanceKm(b[0], 0, b[1], 0);
            double widthKm = distanceKm(latitude, b[2], latitude, b[3]);
            if (Math.min(heightKm, widthKm) >= radiusKm) {
                return length;
            }
        }
        throw new IllegalArgumentException("半徑太大");
    }

    /** Haversine：把地球當成球體計算大圓距離。 */
    public static double distanceKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.pow(Math.sin(dLng / 2), 2);
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
    }
}
```

</details>

<details>
<summary>實測程式（<code>GeohashDemo.java</code>）</summary>

```java
package geo;

import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

public class GeohashDemo {

    record Venue(long id, double lat, double lng) {}

    public static void main(String[] args) {
        System.out.println("格子大小（寬 × 高）：");
        for (int length = 4; length <= 8; length++) {
            System.out.printf("  長度 %d：赤道 %s｜北緯 25 度 %s%n", length, cellSize(0, length), cellSize(25, length));
        }

        double lat = 25.0340;
        double lng = 121.5645;                                      // 台北 101
        System.out.printf("%n台北 101：%s%n", Geohash.encode(lat, lng, 9));

        // 找出台灣範圍內，相距約 100 公尺、共同前綴卻最短的兩個點
        String bestA = null;
        String bestB = null;
        int shortest = 99;
        for (double x = 120.0; x < 122.0; x += 0.0005) {
            String a = Geohash.encode(23.5, x, 9);
            String b = Geohash.encode(23.5, x + 0.00098, 9);
            int common = commonPrefix(a, b);
            if (common < shortest) {
                shortest = common;
                bestA = a;
                bestB = b;
            }
        }
        System.out.printf("相距約 100 公尺的兩點：%s 與 %s，共同前綴只有 %d 個字元%n", bestA, bestB, shortest);

        // 10 萬個場地，依 geohash 排序存放，模擬資料庫中 geohash 欄位上的 B+Tree 索引
        Random random = new Random(42);
        TreeMap<String, Venue> index = new TreeMap<>();
        for (long id = 1; id <= 100_000; id++) {
            Venue v = new Venue(id, 21.9 + random.nextDouble() * 3.4, 120.0 + random.nextDouble() * 2.0);
            index.put(Geohash.encode(v.lat(), v.lng(), 9) + ":" + id, v);
        }

        double radiusKm = 3;
        int precision = Geohash.precisionFor(radiusKm, lat);
        System.out.printf("%n搜尋半徑 %.0f 公里，選用長度 %d 的格子%n", radiusKm, precision);
        search("台北 101", index, lat, lng, radiusKm, precision);
        double[] b = Geohash.bounds(Geohash.encode(lat, lng, precision));
        search("同一格的角落", index, b[1] - 0.0005, b[3] - 0.0005, radiusKm, precision);
    }

    static void search(String label, TreeMap<String, Venue> index, double lat, double lng, double radiusKm, int precision) {
        Set<Long> truth = index.values().stream()
                .filter(v -> Geohash.distanceKm(lat, lng, v.lat(), v.lng()) <= radiusKm)
                .map(Venue::id).collect(Collectors.toSet());
        double band = radiusKm / 110.574;                           // 只有緯度的 B+Tree 索引：只能縮小到一條緯度帶
        long latitudeBand = index.values().stream().filter(v -> Math.abs(v.lat() - lat) <= band).count();
        String center = Geohash.encode(lat, lng, precision);
        int[] scanned = new int[1];
        Set<Long> centerOnly = scan(index, List.of(center), lat, lng, radiusKm, scanned);
        int centerScanned = scanned[0];
        scanned[0] = 0;
        Set<Long> nine = scan(index, Geohash.cellAndNeighbors(center), lat, lng, radiusKm, scanned);
        System.out.printf("%s：半徑內實際有 %d 個場地%n", label, truth.size());
        System.out.printf("  緯度索引     掃描 %,6d 筆%n", latitudeBand);
        System.out.printf("  只查中心格   掃描 %,6d 筆，找到 %d 個%n", centerScanned, centerOnly.size());
        System.out.printf("  查 9 格      掃描 %,6d 筆，找到 %d 個%s%n", scanned[0], nine.size(),
                nine.equals(truth) ? "（與全表掃描相同）" : "（不一致）");
    }

    static Set<Long> scan(TreeMap<String, Venue> index, List<String> cells, double lat, double lng, double radiusKm, int[] scanned) {
        return cells.stream()
                .flatMap(cell -> index.subMap(cell, true, cell + "{", false).values().stream())  // '{' 緊接在 'z' 之後：前綴查詢
                .peek(v -> scanned[0]++)
                .filter(v -> Geohash.distanceKm(lat, lng, v.lat(), v.lng()) <= radiusKm)
                .map(Venue::id).collect(Collectors.toSet());
    }

    static String cellSize(double latitude, int length) {
        double[] b = Geohash.bounds(Geohash.encode(latitude, 0, length));
        double heightKm = Geohash.distanceKm(b[0], 0, b[1], 0);
        double widthKm = Geohash.distanceKm(latitude, b[2], latitude, b[3]);
        return widthKm >= 1 ? String.format("%7.2f km × %5.2f km", widthKm, heightKm)
                : String.format("%7.0f m  × %5.0f m ", widthKm * 1000, heightKm * 1000);
    }

    static int commonPrefix(String a, String b) {
        int i = 0;
        while (i < a.length() && a.charAt(i) == b.charAt(i)) {
            i++;
        }
        return i;
    }
}
```

</details>

```text
格子大小（寬 × 高）：
  長度 4：赤道   39.09 km × 19.55 km｜北緯 25 度   35.43 km × 19.55 km
  長度 5：赤道    4.89 km ×  4.89 km｜北緯 25 度    4.43 km ×  4.89 km
  長度 6：赤道    1.22 km ×  0.61 km｜北緯 25 度    1.11 km ×  0.61 km
  長度 7：赤道     153 m  ×   153 m ｜北緯 25 度     138 m  ×   153 m 
  長度 8：赤道      38 m  ×    19 m ｜北緯 25 度      35 m  ×    19 m 

台北 101：wsqqqm29d
相距約 100 公尺的兩點：wsjvxyp9k 與 wsnj8n037，共同前綴只有 2 個字元

搜尋半徑 3 公里，選用長度 5 的格子
台北 101：半徑內實際有 43 個場地
  緯度索引     掃描  1,561 筆
  只查中心格   掃描     28 筆，找到 22 個
  查 9 格      掃描    254 筆，找到 43 個（與全表掃描相同）
同一格的角落：半徑內實際有 33 個場地
  緯度索引     掃描  1,602 筆
  只查中心格   掃描     28 筆，找到 9 個
  查 9 格      掃描    254 筆，找到 33 個（與全表掃描相同）
```

**格子大小**：長度 5 大約 5 公里見方，長度 6 約 1 公里 × 600 公尺，長度 7 約 150 公尺見方。格子的高度到哪裡都一樣，寬度則隨緯度變窄：經線在兩極匯聚，同樣的經度差，在北緯 25 度只有赤道的 90%，到北緯 60 度只剩一半。

**相鄰不代表前綴相同**：兩個相距約 100 公尺的點，geohash 卻從第 3 個字元就不同了。Geohash 的編號順序是一條 Z 字形的曲線（Z-order curve），在大格子的邊界上會跳很遠，所以「前綴越長越接近」只在一個方向成立：前綴相同代表很近，很近卻不代表前綴相同。

**只查中心格會漏掉一半**：使用者站在台北 101，3 公里內的 43 個場地只找到 22 個；站在格子的角落，33 個只找到 9 個。

**查 9 格**：只要格子的寬與高都不小於搜尋半徑，以使用者為圓心的圓就一定落在「自己的格子加周圍 8 格」裡面。9 格掃描 254 筆，再逐筆算精確距離，結果和全表掃描完全相同；緯度索引則要掃描 1,500 多筆。

格子大小是取捨：格子越小，掃描的筆數越少，但格子比半徑小時，9 格就蓋不住整個圓，要查更多格。實作中的 `precisionFor` 選擇「格子不小於半徑」的最長精度，並且考慮緯度對寬度的影響。

### 其他空間索引

Geohash 是最容易理解、也最容易用一般資料庫實作的做法，但不是唯一的做法：

- **Quadtree**：區域內的點太多就切成四塊，密集的市區切得細，鄉下保持大格子。資料分布不均時比固定大小的格子有效率，常用在記憶體內的索引
- **R-Tree**：把鄰近的物件用最小外接矩形（MBR）分組，組成一棵樹。除了點，也能存線與多邊形。MySQL 的 `SPATIAL` 索引、PostGIS 的 GiST 索引都屬於這一類
- **S2**（Google）：把地球投影到立方體的六個面上，用 Hilbert curve 編號。Hilbert curve 不會像 Z-order 那樣大跳，覆蓋任意形狀需要的格子比較少
- **H3**（Uber）：六角形的格子，共 16 種解析度。六角形的六個鄰居與中心等距，適合做區域統計，例如各區的需求熱度

Redis 的 GEO 指令也是 geohash：經緯度交錯成 52 bits 的整數，存成 sorted set 的 score。查詢時同樣檢查中心加周圍 8 個區域對應的 score 範圍，再濾掉圓外的成員，原理和上面的實測相同。

## 方案比較

| | Geohash 欄位 + B+Tree | MySQL `SPATIAL`（R-Tree） | Redis GEO | PostGIS |
|---|---|---|---|---|
| 原理 | 9 個前綴範圍查詢，再算距離 | R-Tree | sorted set + 52 bits geohash | R-Tree（GiST） |
| 形狀 | 點 | 點、線、多邊形 | 點 | 點、線、多邊形，函式最完整 |
| 和業務資料的一致性 | 同一個交易 | 同一個交易 | 衍生資料，需要同步 | 同一個交易 |
| 適合 | 任何資料庫都能做 | 已經在用 MySQL | 高頻查詢、會移動的物件 | 行政區、外送範圍、路線等地理運算 |

## Java 落地

### 1. 附近的場地：Redis GEO

場地資料很少變動，查詢量卻很大，適合放在 Redis。資料庫仍是唯一的資料來源，場地新增或搬家時，透過 outbox 事件更新 Redis（同 [全文搜尋篇](/post/systemdesign/full-text-search/)的索引同步）：

```java
package geo;

import java.util.List;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.Metrics;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.connection.RedisGeoCommands.GeoSearchCommandArgs;
import org.springframework.data.redis.core.GeoOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.domain.geo.GeoReference;

public class NearbyVenueService {

    private static final String KEY = "geo:venues";
    private static final double MAX_RADIUS_KM = 10;
    private static final int MAX_RESULTS = 50;

    private final GeoOperations<String, String> geo;

    public NearbyVenueService(StringRedisTemplate redis) {
        this.geo = redis.opsForGeo();
    }

    public record NearbyVenue(long venueId, double distanceKm) {}

    /** 場地新增或搬家時呼叫；資料庫仍是唯一的資料來源，這裡只是衍生的索引。 */
    public void upsert(long venueId, double longitude, double latitude) {
        geo.add(KEY, new Point(longitude, latitude), Long.toString(venueId));   // Point 是 (x = 經度, y = 緯度)
    }

    public void remove(long venueId) {
        geo.remove(KEY, Long.toString(venueId));
    }

    public List<NearbyVenue> nearby(double longitude, double latitude, double radiusKm) {
        GeoSearchCommandArgs args = GeoSearchCommandArgs.newGeoSearchArgs()
                .includeDistance()
                .sortAscending()
                .limit(MAX_RESULTS);
        return geo.search(KEY,
                        GeoReference.fromCoordinate(longitude, latitude),
                        new Distance(Math.min(radiusKm, MAX_RADIUS_KM), Metrics.KILOMETERS),
                        args)
                .getContent().stream()
                .map(r -> new NearbyVenue(Long.parseLong(r.getContent().getName()), r.getDistance().getValue()))
                .toList();
    }
}
```

- `geo.search` 對應 Redis 6.2 起的 `GEOSEARCH`
- 半徑與筆數都有上限，不讓一個請求掃過大片區域
- Spring 的 `Point` 與 Redis 的參數順序都是**經度在前**

查到附近的場地 ID 後，再到資料庫查這些場地本週的講座。要注意「先找最近的 50 個，再篩本週有講座的」可能篩到一個不剩；如果業務條件會篩掉大部分場地，就把條件反映在 key 上，例如只把本週有講座的場地放進 `geo:venues:active`。

### 2. 不想多維運 Redis：geohash 欄位

資料量與查詢量沒那麼大時，在資料表多存一個 geohash 欄位就夠了。寫入時由應用程式計算 `Geohash.encode(lat, lng, 9)`，查詢時用 9 個格子的前綴：

```sql
ALTER TABLE venue
    ADD COLUMN geohash CHAR(9) NOT NULL,
    ADD INDEX idx_venue_geohash (geohash);

SELECT id, latitude, longitude
  FROM venue
 WHERE geohash LIKE 'wsqqj%' OR geohash LIKE 'wsqqn%' OR geohash LIKE 'wsqqp%'
    OR geohash LIKE 'wsqqm%' OR geohash LIKE 'wsqqq%' OR geohash LIKE 'wsqqr%'
    OR geohash LIKE 'wsqqt%' OR geohash LIKE 'wsqqw%' OR geohash LIKE 'wsqqx%';
```

開頭不是萬用字元的 `LIKE` 可以用索引，9 個條件就是 9 段範圍掃描，和實測中的 `subMap` 相同。查回來的資料再用 `Geohash.distanceKm` 算精確距離、排序。

### 3. MySQL SPATIAL 的座標順序

要用 MySQL 的 R-Tree 索引時，欄位必須是 `NOT NULL` 並指定 SRID，否則最佳化器不會使用這個索引：

```sql
CREATE TABLE venue (
    id       BIGINT PRIMARY KEY,
    location POINT NOT NULL SRID 4326,
    SPATIAL INDEX idx_venue_location (location)
);

INSERT INTO venue
VALUES (1, ST_GeomFromText('POINT(121.5645 25.0340)', 4326, 'axis-order=long-lat'));
```

SRID 4326（WGS 84，GPS 使用的座標系統）在 MySQL 裡預設的座標順序是**緯度在前**。少了 `'axis-order=long-lat'`，121.5645 會被當成緯度，因為超出 ±90 度而報錯。

## 踩坑與 Gotchas

- **經緯度的順序**：Redis、Spring 的 `Point`、GeoJSON 都是經度在前；在地圖 App 上複製的座標、MySQL 的 SRID 4326 則是緯度在前。台灣的經度超過 90，寫反會直接報錯；歐洲、非洲這類經緯度都在 90 以內的地區，就會悄悄存到錯的位置
- **只查中心格**：實測中漏掉一半以上
- **格子比半徑小**：9 格蓋不住整個圓。精度要依半徑與緯度選擇
- **跨越 180 度經線與極區**：自己寫的鄰居計算要處理經度繞回，正式環境用成熟的函式庫
- **直線距離不是路程**：3 公里內的場地可能隔著一條河。Redis 的距離也是把地球當成球體計算，最多有 0.5% 的誤差，計費或運費要用其他方式計算
- **GEO 成員不會過期**：GEO 是 sorted set，成員不能個別設定 TTL。外送員、司機這類會移動的物件，下線後會一直留在 key 裡，需要另一個以最後回報時間為 score 的 sorted set，定期找出太久沒回報的成員一起移除
- **單一 key 的熱點**：Redis Cluster 中一個 key 只在一個節點上。會移動的物件更新頻繁時（10 萬名外送員每 4 秒回報一次，就是每秒 2.5 萬次寫入），可以依 geohash 前綴分成多個 key，代價是靠近邊界的查詢要查多個 key 再合併

### 資安相關

- **距離會洩漏位置（三角定位）**：「附近的同好」顯示「距離 1 公里」看似無害，但攻擊者可以偽造自己的位置，從不同地點反覆查詢，用三個距離畫圓求交點。下面的模擬中，攻擊者只看得到伺服器回傳的距離：

  <details>
  <summary>三角定位模擬（<code>TrilaterationDemo.java</code>）</summary>

  ```java
  package geo;

  import java.util.Random;

  /** 攻擊者可以任意偽造自己的位置，伺服器只回傳「你和對方相距多遠」。光靠這個回答，能把對方定位到多準？ */
  public class TrilaterationDemo {

      static final double TARGET_LAT = 25.0418;
      static final double TARGET_LNG = 121.5503;                      // 被搜尋者的真實位置，攻擊者不知道
      static final double START_LAT = 25.0340;
      static final double START_LNG = 121.5645;                       // 攻擊者只知道對方大概在台北 101 附近

      interface DistanceApi {
          double distanceKm(double lat, double lng);                  // 攻擊者唯一看得到的東西
      }

      static int queries;

      public static void main(String[] args) {
          Random random = new Random(7);
          double[] cell = Geohash.bounds(Geohash.encode(TARGET_LAT, TARGET_LNG, 6));
          double snappedLat = (cell[0] + cell[1]) / 2;
          double snappedLng = (cell[2] + cell[3]) / 2;

          DistanceApi exact = (lat, lng) -> Math.round(distance(lat, lng, TARGET_LAT, TARGET_LNG) * 1000) / 1000.0;
          DistanceApi rounded = (lat, lng) -> Math.round(distance(lat, lng, TARGET_LAT, TARGET_LNG));
          DistanceApi noisy = (lat, lng) -> distance(lat, lng, TARGET_LAT, TARGET_LNG) + (random.nextDouble() - 0.5);
          DistanceApi snapped = (lat, lng) -> Math.round(distance(lat, lng, snappedLat, snappedLng));

          report("回傳精確距離（到公尺）", averagingAttack(exact, 1));
          report("距離四捨五入到整數公里", boundaryAttack(rounded));
          report("每次查詢加上 ±500 公尺的隨機誤差", averagingAttack(noisy, 500));
          report("先把位置對齊到格子中心，再四捨五入", boundaryAttack(snapped));
          System.out.printf("（真實位置與所在 geohash 長度 6 格子中心的距離：%.0f 公尺）%n",
                  distance(TARGET_LAT, TARGET_LNG, snappedLat, snappedLng) * 1000);
      }

      static void report(String label, double[] guess) {
          System.out.printf("查詢 %,5d 次｜定位誤差 %,4.0f 公尺｜%s%n",
                  queries, distance(guess[0], guess[1], TARGET_LAT, TARGET_LNG) * 1000, label);
          queries = 0;
      }

      /** 從三個位置各查 n 次取平均，再用三個圓求交點。 */
      static double[] averagingAttack(DistanceApi api, int n) {
          double[][] anchors = {{START_LAT, START_LNG}, {START_LAT + 0.02, START_LNG}, {START_LAT, START_LNG - 0.02}};
          double[] radii = new double[3];
          for (int i = 0; i < 3; i++) {
              double sum = 0;
              for (int k = 0; k < n; k++) {
                  sum += query(api, anchors[i]);
              }
              radii[i] = sum / n;
          }
          return trilaterate(anchors, radii);
      }

      /** 沿三個方向移動自己的位置，用二分搜尋找出回答剛好改變的點：那一點和對方的距離正好是 k + 0.5 公里。 */
      static double[] boundaryAttack(DistanceApi api) {
          double[][] centers = new double[3][];
          double[] radii = new double[3];
          for (int i = 0; i < 3; i++) {
              double angle = Math.toRadians(90 + 120 * i);
              double dLat = Math.sin(angle) / 110.574;               // 每走 1 公里，緯度與經度各變多少
              double dLng = Math.cos(angle) / (111.320 * Math.cos(Math.toRadians(START_LAT)));
              double first = query(api, new double[] {START_LAT, START_LNG});
              double low = 0;
              double high = 0.25;
              while (query(api, new double[] {START_LAT + high * dLat, START_LNG + high * dLng}) == first) {
                  low = high;
                  high += 0.25;
              }
              double changed = query(api, new double[] {START_LAT + high * dLat, START_LNG + high * dLng});
              for (int k = 0; k < 40; k++) {
                  double mid = (low + high) / 2;
                  if (query(api, new double[] {START_LAT + mid * dLat, START_LNG + mid * dLng}) == first) {
                      low = mid;
                  } else {
                      high = mid;
                  }
              }
              centers[i] = new double[] {START_LAT + low * dLat, START_LNG + low * dLng};
              radii[i] = Math.min(first, changed) + 0.5;
          }
          return trilaterate(centers, radii);
      }

      static double query(DistanceApi api, double[] position) {
          queries++;
          return api.distanceKm(position[0], position[1]);
      }

      /** 在幾公里的範圍內把經緯度當成平面座標（公里），三個圓的方程式兩兩相減得到線性方程組。 */
      static double[] trilaterate(double[][] centers, double[] r) {
          double kmPerLng = 111.320 * Math.cos(Math.toRadians(START_LAT));
          double[] x = new double[3];
          double[] y = new double[3];
          for (int i = 0; i < 3; i++) {
              x[i] = (centers[i][1] - START_LNG) * kmPerLng;
              y[i] = (centers[i][0] - START_LAT) * 110.574;
          }
          double a1 = 2 * (x[1] - x[0]);
          double b1 = 2 * (y[1] - y[0]);
          double c1 = r[0] * r[0] - r[1] * r[1] + x[1] * x[1] - x[0] * x[0] + y[1] * y[1] - y[0] * y[0];
          double a2 = 2 * (x[2] - x[0]);
          double b2 = 2 * (y[2] - y[0]);
          double c2 = r[0] * r[0] - r[2] * r[2] + x[2] * x[2] - x[0] * x[0] + y[2] * y[2] - y[0] * y[0];
          double det = a1 * b2 - a2 * b1;
          double px = (c1 * b2 - c2 * b1) / det;
          double py = (a1 * c2 - a2 * c1) / det;
          return new double[] {START_LAT + py / 110.574, START_LNG + px / kmPerLng};
      }

      static double distance(double lat1, double lng1, double lat2, double lng2) {
          return Geohash.distanceKm(lat1, lng1, lat2, lng2);
      }
  }
  ```

  </details>

  ```text
  查詢     3 次｜定位誤差    3 公尺｜回傳精確距離（到公尺）
  查詢   134 次｜定位誤差    9 公尺｜距離四捨五入到整數公里
  查詢 1,500 次｜定位誤差    8 公尺｜每次查詢加上 ±500 公尺的隨機誤差
  查詢   153 次｜定位誤差  329 公尺｜先把位置對齊到格子中心，再四捨五入
  （真實位置與所在 geohash 長度 6 格子中心的距離：336 公尺）
  ```

  - 回傳精確距離：3 次查詢就定位到 3 公尺
  - **只把輸出四捨五入沒有用**：攻擊者移動自己的位置，找出回答從「1 公里」變成「2 公里」的那一點，那一點和對方的距離正好是 1.5 公里。134 次查詢就定位到 9 公尺
  - **每次加隨機誤差也沒有用**：同一個位置查 500 次取平均，誤差就互相抵銷了
  - **有效的做法是在計算之前就降低精度**：把被搜尋者的位置對齊到固定格子的中心，而且同一格內保持不變。攻擊者最多只能找到格子中心，誤差就是對齊造成的 300 多公尺。再搭配查詢頻率限制與「不可能的移動速度」檢查，提高邊界搜尋的成本
- **只能找到願意被找到的人**：只把開啟分享的學員放進專用的 key，關閉分享時立刻移除（GEO 成員不會自己過期）。可見性條件要在查詢本身成立，和 [全文搜尋篇](/post/systemdesign/full-text-search/)的道理相同，這是 BOLA 的另一種形態（Part 8）
- **位置是個資**：位置的歷史紀錄可以推出住家與上班地點。只存需要的精度、設定保存期限，log 不要記錄原始座標
- **用戶端回報的位置可以偽造**：模擬定位的 App 隨手可得，GPS 不能當作「人在現場」的證明。實體講座的現場簽到，改用場地螢幕上定時更換的 QR code

## 何時用／何時別用

- **geohash 欄位**：資料已經在關聯式資料庫、只需要點的附近搜尋、不想多維運一套系統
- **Redis GEO**：查詢頻率高、物件會移動、可以接受衍生資料的同步延遲
- **`SPATIAL`／PostGIS**：需要多邊形（行政區、外送範圍）、路線或其他地理運算
- **H3**：區域統計與熱度分析
- **別用**：只有幾百個點（全部載入記憶體直接算距離就好）；需要路程距離或到達時間（要用路網與路徑規劃服務）

## 參考資料

- G. M. Morton, "A Computer Oriented Geodetic Data Base and a New Technique in File Sequencing", IBM, 1966
- Antonin Guttman, "R-Trees: A Dynamic Index Structure for Spatial Searching", *SIGMOD*, 1984
- Redis — GEOADD：<https://redis.io/docs/latest/commands/geoadd/>
- Redis — GEOSEARCH：<https://redis.io/docs/latest/commands/geosearch/>
- MySQL 8.4 Reference Manual — SPATIAL Index Optimization：<https://dev.mysql.com/doc/refman/8.4/en/spatial-index-optimization.html>
- MySQL 8.4 Reference Manual — Functions That Create Geometry Values from WKT Values：<https://dev.mysql.com/doc/refman/8.4/en/gis-wkt-functions.html>
- S2 Geometry：<https://s2geometry.io/>
- H3：<https://h3geo.org/>
- 互動圖解延伸：Dilum Sanjaya，System Design — an interactive course：<https://designed-to-scale.vercel.app/>
