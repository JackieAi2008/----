/**
 * 通用API限流
 */
export declare const apiLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * 认证接口限流（更严格）
 */
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * AI总结接口限流
 * 每用户每分钟最多3次请求，避免频繁调用消耗API额度
 */
export declare const aiSummaryLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rateLimiter.d.ts.map