interface RegisterData {
    email: string;
    password: string;
    nickname: string;
    securityQuestion: number;
    securityAnswer: string;
    departmentId?: string;
}
/**
 * 用户登录
 */
export declare function login(email: string, password: string): Promise<{
    token: string;
    user: {
        id: string;
        email: string;
        nickname: string;
        avatar: string | null;
        bio: string | null;
        isAdmin: boolean;
        isDepartmentAdmin: boolean;
        departmentId: string | null;
        department: {
            id: string;
            name: string;
        } | null;
        managedDepartment: {
            id: string;
            name: string;
        } | null;
    };
}>;
/**
 * 用户注册
 */
export declare function register(data: RegisterData): Promise<{
    token: string;
    user: {
        id: string;
        email: string;
        nickname: string;
        avatar: string | null;
        bio: string | null;
        isAdmin: boolean;
        isDepartmentAdmin: boolean;
        departmentId: string | null;
        department: {
            id: string;
            name: string;
        } | null;
    };
}>;
/**
 * 修改密码
 */
export declare function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>;
/**
 * 重置密码
 */
export declare function resetPassword(email: string, questionIndex: number, answer: string, newPassword: string): Promise<void>;
/**
 * 验证安全问题答案
 */
export declare function verifySecurityAnswer(email: string, questionIndex: number, answer: string): Promise<boolean>;
export {};
//# sourceMappingURL=authService.d.ts.map