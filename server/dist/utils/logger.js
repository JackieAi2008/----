/**
 * 中集智历 - 日志工具函数
 */
import fs from 'fs';
import path from 'path';
const logsDir = path.join(process.cwd(), 'logs');
// 确保日志目录存在
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}
/**
 * 格式化日志消息
 */
function formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}\n`;
}
/**
 * 写入日志文件
 */
function writeToFile(filename, content) {
    const filepath = path.join(logsDir, filename);
    fs.appendFile(filepath, content, (err) => {
        if (err)
            console.error('写入日志失败:', err);
    });
}
/**
 * 日志记录器
 */
export const logger = {
    info(message, data) {
        const content = formatMessage('info', message, data);
        console.log(content.trim());
        writeToFile('app.log', content);
    },
    warn(message, data) {
        const content = formatMessage('warn', message, data);
        console.warn(content.trim());
        writeToFile('app.log', content);
    },
    error(message, data) {
        const content = formatMessage('error', message, data);
        console.error(content.trim());
        writeToFile('error.log', content);
        writeToFile('app.log', content);
    }
};
//# sourceMappingURL=logger.js.map