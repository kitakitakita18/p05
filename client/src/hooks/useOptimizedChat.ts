// 🚀 最適化されたチャットフック
import { useState, useCallback, useMemo, useRef } from 'react';
import { cacheService } from '../utils/cacheService';

export interface OptimizedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  cached?: boolean;
  performanceMetrics?: {
    responseTime: number;
    cacheHit: boolean;
    aiTime?: number;
    searchTime?: number;
  };
}

export interface ChatPerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  totalCacheHits: number;
  fastestResponse: number;
  slowestResponse: number;
}

export const useOptimizedChat = () => {
  const [messages, setMessages] = useState<OptimizedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<ChatPerformanceStats>({
    totalRequests: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    totalCacheHits: 0,
    fastestResponse: Infinity,
    slowestResponse: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const performanceMetrics = useRef<number[]>([]);

  // 🎯 メッセージ送信の最適化
  const sendOptimizedMessage = useCallback(async (
    content: string,
    ragEnabled: boolean = true
  ): Promise<void> => {
    if (!content.trim()) return;

    // 進行中のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const startTime = performance.now();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // ユーザーメッセージを即座に追加
    const userMessage: OptimizedMessage = {
      id: messageId + '_user',
      role: 'user',
      content: content.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // 新しいAbortController
    abortControllerRef.current = new AbortController();

    try {
      // 🔄 キャッシュチェック（即座に）
      const cacheKey = `${content}_rag_${ragEnabled}`;
      const cachedResponse = cacheService.get(cacheKey);

      if (cachedResponse) {
        const responseTime = performance.now() - startTime;
        
        const assistantMessage: OptimizedMessage = {
          id: messageId + '_assistant',
          role: 'assistant',
          content: cachedResponse.content,
          timestamp: Date.now(),
          cached: true,
          performanceMetrics: {
            responseTime,
            cacheHit: true
          }
        };

        setMessages(prev => [...prev, assistantMessage]);
        updatePerformanceStats(responseTime, true);
        setIsLoading(false);
        return;
      }

      // 📡 API呼び出し
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          ragEnabled
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const responseTime = performance.now() - startTime;

      // 📊 パフォーマンスメトリクス抽出
      const performanceMetrics = {
        responseTime,
        cacheHit: data.cached || false,
        aiTime: data.performanceProfile?.aiTime,
        searchTime: data.performanceProfile?.searchTime
      };

      const assistantMessage: OptimizedMessage = {
        id: messageId + '_assistant',
        role: 'assistant',
        content: data.content,
        timestamp: Date.now(),
        cached: data.cached,
        performanceMetrics
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 💾 新しいレスポンスをキャッシュに保存
      if (!data.cached) {
        cacheService.set(cacheKey, { content: data.content });
      }

      updatePerformanceStats(responseTime, data.cached);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🚫 リクエストがキャンセルされました');
        return;
      }

      console.error('❌ メッセージ送信エラー:', error);
      
      const errorMessage: OptimizedMessage = {
        id: messageId + '_error',
        role: 'assistant',
        content: '申し訳ございません。エラーが発生しました。もう一度お試しください。',
        timestamp: Date.now(),
        performanceMetrics: {
          responseTime: performance.now() - startTime,
          cacheHit: false
        }
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  // 📊 パフォーマンス統計更新
  const updatePerformanceStats = useCallback((responseTime: number, cacheHit: boolean) => {
    performanceMetrics.current.push(responseTime);
    
    setStats(prev => {
      const newTotalRequests = prev.totalRequests + 1;
      const newTotalCacheHits = prev.totalCacheHits + (cacheHit ? 1 : 0);
      
      // 最新100件の平均を計算
      const recentMetrics = performanceMetrics.current.slice(-100);
      const averageResponseTime = recentMetrics.reduce((sum, time) => sum + time, 0) / recentMetrics.length;
      
      return {
        totalRequests: newTotalRequests,
        averageResponseTime,
        cacheHitRate: (newTotalCacheHits / newTotalRequests) * 100,
        totalCacheHits: newTotalCacheHits,
        fastestResponse: Math.min(prev.fastestResponse, responseTime),
        slowestResponse: Math.max(prev.slowestResponse, responseTime)
      };
    });
  }, []);

  // 🗑️ メッセージクリア
  const clearMessages = useCallback(() => {
    setMessages([]);
    performanceMetrics.current = [];
    setStats({
      totalRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      totalCacheHits: 0,
      fastestResponse: Infinity,
      slowestResponse: 0
    });
  }, []);

  // 🔄 リクエストキャンセル
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  // 🎯 最適化されたメッセージリスト（メモ化）
  const optimizedMessages = useMemo(() => {
    return messages.map(msg => ({
      ...msg,
      // パフォーマンス表示用の追加情報
      performanceLabel: msg.performanceMetrics ? (
        msg.performanceMetrics.cacheHit 
          ? `⚡ ${msg.performanceMetrics.responseTime.toFixed(0)}ms (キャッシュ)`
          : `🚀 ${msg.performanceMetrics.responseTime.toFixed(0)}ms`
      ) : undefined
    }));
  }, [messages]);

  // 📈 パフォーマンス分析
  const getPerformanceAnalysis = useCallback(() => {
    const recentMetrics = performanceMetrics.current.slice(-20); // 最新20件
    if (recentMetrics.length === 0) return null;

    const sorted = [...recentMetrics].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    return {
      ...stats,
      medianResponseTime: median,
      p95ResponseTime: p95,
      recentTrend: recentMetrics.length >= 5 ? 
        (recentMetrics.slice(-3).reduce((a, b) => a + b, 0) / 3) - 
        (recentMetrics.slice(0, 3).reduce((a, b) => a + b, 0) / 3) : 0
    };
  }, [stats]);

  return {
    messages: optimizedMessages,
    isLoading,
    stats,
    sendOptimizedMessage,
    clearMessages,
    cancelRequest,
    getPerformanceAnalysis
  };
};