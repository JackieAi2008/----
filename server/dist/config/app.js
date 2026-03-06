/**
 * 中集智历 - 应用配置
 */
export const appConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development',
    upload: {
        dir: process.env.UPLOAD_DIR || './uploads',
        maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10) // 10MB
    }
};
//# sourceMappingURL=app.js.map