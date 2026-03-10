"""
多部门用户体系功能测试
测试内容：
1. 部门管理 API（系统管理员创建/编辑/删除部门）
2. 部门成员管理（添加/移除成员）
3. 注册页面部门选择
4. 项目列表按部门过滤
5. 权限控制（系统管理员、部门管理员、普通成员）
"""
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'server', 'src'))

import asyncio
import pytest
from httpx import AsyncClient
from unittest.mock import patch

# 测试配置
BASE_URL = "http://localhost:3000/api"

class TestDepartmentAPI:
    """部门 API 测试"""

    @pytest.fixture
    async def client(self):
        """创建测试客户端"""
        async with AsyncClient(base_url=BASE_URL) as client:
            yield client

    @pytest.fixture
    def admin_token(self):
        """模拟系统管理员 token"""
        # 实际测试时需要使用真实的 token
        return "test_admin_token"

    @pytest.fixture
    def dept_admin_token(self):
        """模拟部门管理员 token"""
        return "test_dept_admin_token"

    @pytest.fixture
    def member_token(self):
        """模拟普通成员 token"""
        return "test_member_token"

    @pytest.mark.asyncio
    async def test_create_department(self, client: AsyncClient, admin_token: str):
        """测试创建部门"""
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 创建部门
        response = await client.post(
            "/departments",
            json={
                "name": "研发部",
                "description": "负责产品研发",
                "adminId": "user_id_here"
            },
            headers=headers
        )

        assert response.status_code in [200, 201]
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == "研发部"

    @pytest.mark.asyncio
    async def test_get_departments(self, client: AsyncClient, admin_token: str):
        """测试获取部门列表"""
        headers = {"Authorization": f"Bearer {admin_token}"}

        response = await client.get("/departments", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)

    @pytest.mark.asyncio
    async def test_get_department_options(self, client: AsyncClient, member_token: str):
        """测试获取部门选项列表"""
        headers = {"Authorization": f"Bearer {member_token}"}

        response = await client.get("/departments/options", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)

    @pytest.mark.asyncio
    async def test_update_department(self, client: AsyncClient, admin_token: str):
        """测试更新部门"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        dept_id = "test_dept_id"

        response = await client.put(
            f"/departments/{dept_id}",
            json={
                "name": "研发部-更新",
                "description": "负责产品研发和创新"
            },
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_add_department_member(self, client: AsyncClient, dept_admin_token: str):
        """测试添加部门成员"""
        headers = {"Authorization": f"Bearer {dept_admin_token}"}
        dept_id = "test_dept_id"

        response = await client.post(
            f"/departments/{dept_id}/members",
            json={"userId": "new_member_id"},
            headers=headers
        )

        assert response.status_code in [200, 201]

    @pytest.mark.asyncio
    async def test_remove_department_member(self, client: AsyncClient, dept_admin_token: str):
        """测试移除部门成员"""
        headers = {"Authorization": f"Bearer {dept_admin_token}"}
        dept_id = "test_dept_id"
        user_id = "member_to_remove_id"

        response = await client.delete(
            f"/departments/{dept_id}/members/{user_id}",
            headers=headers
        )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_change_department_admin(self, client: AsyncClient, admin_token: str):
        """测试更换部门管理员"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        dept_id = "test_dept_id"

        response = await client.put(
            f"/departments/{dept_id}/admin",
            json={"newAdminId": "new_admin_user_id"},
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_delete_department(self, client: AsyncClient, admin_token: str):
        """测试删除部门"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        dept_id = "test_dept_id"

        response = await client.delete(
            f"/departments/{dept_id}",
            headers=headers
        )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_my_department(self, client: AsyncClient, dept_admin_token: str):
        """测试获取我管理的部门"""
        headers = {"Authorization": f"Bearer {dept_admin_token}"}

        response = await client.get("/departments/my", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "id" in data["data"]
        assert "name" in data["data"]

    @pytest.mark.asyncio
    async def test_register_with_department(self, client: AsyncClient):
        """测试带部门选择的注册"""
        response = await client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123",
                "nickname": "测试用户",
                "securityQuestion": 0,
                "securityAnswer": "测试答案",
                "departmentId": "test_dept_id"
            }
        )

        assert response.status_code in [200, 201]
        data = response.json()
        assert data["success"] is True
        assert data["data"]["user"]["departmentId"] == "test_dept_id"

    @pytest.mark.asyncio
    async def test_login_returns_department_info(self, client: AsyncClient):
        """测试登录返回部门信息"""
        response = await client.post(
            "/auth/login",
            json={
                "email": "admin@example.com",
                "password": "password123"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "departmentId" in data["data"]["user"]
        assert "isDepartmentAdmin" in data["data"]["user"]

    @pytest.mark.asyncio
    async def test_project_list_filtered_by_department(self, client: AsyncClient, member_token: str):
        """测试项目列表按部门过滤"""
        headers = {"Authorization": f"Bearer {member_token}"}

        response = await client.get("/projects", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # 验证返回的项目包含部门信息
        for project in data["data"]:
            assert "departmentId" in project or "department" in project

    @pytest.mark.asyncio
    async def test_create_project_auto_department(self, client: AsyncClient, member_token: str):
        """测试创建项目自动设置部门"""
        headers = {"Authorization": f"Bearer {member_token}"}

        response = await client.post(
            "/projects",
            json={
                "name": "测试项目",
                "description": "这是一个测试项目",
                "visibility": "PRIVATE"
            },
            headers=headers
        )

        assert response.status_code in [200, 201]
        data = response.json()
        assert data["success"] is True
        # 验证项目自动设置了创建者的部门
        assert "departmentId" in data["data"]


class TestPermissionControl:
    """权限控制测试"""

    @pytest.fixture
    async def client(self):
        """创建测试客户端"""
        async with AsyncClient(base_url=BASE_URL) as client:
            yield client

    @pytest.mark.asyncio
    async def test_member_cannot_access_department_list(self, client: AsyncClient, member_token: str):
        """测试普通成员无法访问部门列表"""
        headers = {"Authorization": f"Bearer {member_token}"}

        response = await client.get("/departments", headers=headers)

        # 应该返回 403 Forbidden
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_dept_admin_can_manage_own_department(self, client: AsyncClient, dept_admin_token: str):
        """测试部门管理员可以管理自己的部门"""
        headers = {"Authorization": f"Bearer {dept_admin_token}"}

        # 获取我管理的部门
        response = await client.get("/departments/my", headers=headers)
        assert response.status_code == 200

        dept_id = response.json()["data"]["id"]

        # 添加成员
        response = await client.post(
            f"/departments/{dept_id}/members",
            json={"userId": "new_member_id"},
            headers=headers
        )
        assert response.status_code in [200, 201]

    @pytest.mark.asyncio
    async def test_dept_admin_cannot_manage_other_department(self, client: AsyncClient, dept_admin_token: str):
        """测试部门管理员不能管理其他部门"""
        headers = {"Authorization": f"Bearer {dept_admin_token}"}
        other_dept_id = "other_department_id"

        # 尝试添加成员到其他部门
        response = await client.post(
            f"/departments/{other_dept_id}/members",
            json={"userId": "new_member_id"},
            headers=headers
        )

        # 应该返回 403 Forbidden
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_can_access_all_departments(self, client: AsyncClient, admin_token: str):
        """测试系统管理员可以访问所有部门"""
        headers = {"Authorization": f"Bearer {admin_token}"}

        response = await client.get("/departments", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestProjectDepartmentFilter:
    """项目部门过滤测试"""

    @pytest.fixture
    async def client(self):
        """创建测试客户端"""
        async with AsyncClient(base_url=BASE_URL) as client:
            yield client

    @pytest.mark.asyncio
    async def test_project_visibility_by_department(self, client: AsyncClient, member_token: str):
        """测试项目按部门可见性"""
        headers = {"Authorization": f"Bearer {member_token}"}

        # 获取项目列表
        response = await client.get("/projects", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # 验证只能看到本部门项目和被邀请的项目
        # 实际验证需要根据测试数据调整
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_cross_department_project_access(self, client: AsyncClient, member_token: str):
        """测试跨部门项目访问"""
        headers = {"Authorization": f"Bearer {member_token}"}

        # 尝试访问不属于自己部门的项目
        other_project_id = "other_department_project_id"

        response = await client.get(f"/projects/{other_project_id}", headers=headers)

        # 如果没有被邀请，应该返回 403
        # 如果被邀请了
应该返回 200
        # 具体验证取决于测试数据
        assert response.status_code in [200, 403]


def run_tests():
    """运行测试"""
    print("=" * 60)
    print("多部门用户体系功能测试")
    print("=" * 60)
    print()
    print("测试内容：")
    print("1. 部门管理 API（系统管理员创建/编辑/删除部门）")
    print("2. 部门成员管理（添加/移除成员）")
    print("3. 注册页面部门选择")
    print("4. 项目列表按部门过滤")
    print("5. 权限控制（系统管理员、部门管理员、普通成员）")
    print()
    print("运行测试命令：")
    print("  pytest server/tests/test_department.py -v")
    print()
    print("注意：运行测试前需要：")
    print("1. 启动后端服务器：cd server && npm run dev")
    print("2. 确保数据库已迁移：npx prisma migrate dev")
    print("3. 准备测试用户和 token")


if __name__ == "__main__":
    run_tests()
