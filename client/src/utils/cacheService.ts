// キャッシュサービス - 高性能な応答キャッシュ機能
export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  expiry: number;
  hitCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  cacheSize: number;
  oldestEntry: number;
  newestEntry: number;
}

class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 100; // 最大キャッシュエントリ数
  private defaultTTL: number = 30 * 60 * 1000; // 30分のデフォルトTTL
  private stats = {
    hits: 0,
    misses: 0
  };

  // キャッシュキーを正規化（質問の表記揺れを吸収）
  private normalizeKey(input: string): string {
    return input
      .toLowerCase()
      .replace(/\s+/g, ' ') // 複数スペースを単一スペースに
      .replace(/[？?]/g, '') // 疑問符を除去
      .replace(/[。、]/g, '') // 句読点を除去
      .trim();
  }

  // 類似キーを検索（部分一致や言い換えを検出）
  private findSimilarKey(key: string): string | null {
    const normalizedKey = this.normalizeKey(key);
    const keywords = normalizedKey.split(' ').filter(k => k.length > 1);
    
    let similarKey: string | null = null;
    
    this.cache.forEach((entry, cachedKey) => {
      if (similarKey) return; // 既に見つかっている場合はスキップ
      
      const cachedNormalized = this.normalizeKey(cachedKey);
      
      // 完全一致
      if (normalizedKey === cachedNormalized) {
        similarKey = cachedKey;
        return;
      }
      
      // キーワードベースの類似度チェック
      const cachedKeywords = cachedNormalized.split(' ').filter(k => k.length > 1);
      const matchingKeywords = keywords.filter(k => cachedKeywords.includes(k));
      
      // 60%以上のキーワードが一致する場合は類似とみなす
      if (matchingKeywords.length / Math.max(keywords.length, cachedKeywords.length) >= 0.6) {
        console.log(`🎯 類似キーを発見: "${key}" ≈ "${cachedKey}"`);
        similarKey = cachedKey;
      }
    });
    
    return similarKey;
  }

  // データをキャッシュに保存
  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    const now = Date.now();
    const entry: CacheEntry = {
      key,
      data,
      timestamp: now,
      expiry: now + ttl,
      hitCount: 0,
      lastAccessed: now
    };

    // キャッシュサイズ制限チェック
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    console.log(`💾 キャッシュ保存: "${key}" (TTL: ${ttl}ms)`);
  }

  // キャッシュからデータを取得
  get(key: string): any | null {
    // 直接一致を先にチェック
    let entry = this.cache.get(key);
    let actualKey = key;
    
    // 直接一致しない場合は類似キーを検索
    if (!entry) {
      const similarKey = this.findSimilarKey(key);
      if (similarKey) {
        entry = this.cache.get(similarKey);
        actualKey = similarKey;
      }
    }

    if (!entry) {
      this.stats.misses++;
      console.log(`❌ キャッシュミス: "${key}"`);
      return null;
    }

    const now = Date.now();
    
    // 有効期限チェック
    if (now > entry.expiry) {
      this.cache.delete(actualKey);
      this.stats.misses++;
      console.log(`⏰ キャッシュ期限切れ: "${actualKey}"`);
      return null;
    }

    // ヒット統計更新
    entry.hitCount++;
    entry.lastAccessed = now;
    this.stats.hits++;
    
    console.log(`✅ キャッシュヒット: "${actualKey}" (ヒット回数: ${entry.hitCount})`);
    return entry.data;
  }

  // LRU（Least Recently Used）に基づく退避
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    this.cache.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ LRU退避: "${oldestKey}"`);
    }
  }

  // キャッシュ統計を取得
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const total = this.stats.hits + this.stats.misses;
    
    return {
      totalEntries: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total * 100) : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      cacheSize: this.calculateCacheSize(),
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0
    };
  }

  // キャッシュサイズを計算（概算）
  private calculateCacheSize(): number {
    let size = 0;
    this.cache.forEach(entry => {
      size += JSON.stringify(entry).length;
    });
    return size;
  }

  // キャッシュをクリア
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    console.log('🗑️ キャッシュを全削除しました');
  }

  // 期限切れエントリを削除
  cleanup(): number {
    const now = Date.now();
    let deletedCount = 0;
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiry) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      deletedCount++;
    });
    
    if (deletedCount > 0) {
      console.log(`🧹 期限切れキャッシュを${deletedCount}件削除しました`);
    }
    
    return deletedCount;
  }

  // 人気の高いキャッシュエントリを取得
  getPopularEntries(limit: number = 5): CacheEntry[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, limit);
  }
}

// シングルトンインスタンス
export const cacheService = new CacheService();

// 定期的なクリーンアップ（5分間隔）
setInterval(() => {
  cacheService.cleanup();
}, 5 * 60 * 1000);