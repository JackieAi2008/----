/**
 * 中集智历 - 数据库配置
 */
import { PrismaClient } from '@prisma/client';
declare const prisma: PrismaClient<{
    log: ("query" | "warn" | "error")[];
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
export default prisma;
//# sourceMappingURL=database.d.ts.map