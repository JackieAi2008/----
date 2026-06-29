
### Windows PowerShell Select-String 返回 MatchInfo 而非 String (2026-06-25)
Type: gotcha

PowerShell 的 Select-String 输出 Microsoft.PowerShell.Commands.MatchInfo 对象,**没有** .Trim() / .Substring() / .Length 这些 String 方法,直接调用会 RuntimeException。

错误示例: `git status --short | Select-String "^ M" | ForEach-Object { $_.Substring(3) }` → Cannot find a method 'Substring' on type 'MatchInfo'

正确做法 (三种之一):
1. 拆分: `ForEach-Object { ($_ -split " M ", 2)[1] }`
2. 显式转字符串: `ForEach-Object { $_.ToString() -replace ... }`
3. 走 match 操作符: `Where-Object { $_ -match "^ M " } | ForEach-Object { $_.Matches[0].Value }`

更根本的: `git status` 一律用 `--porcelain` 输出(每行 = 1 个 path,可直接 .Substring(0,2) 取状态码),避免 Select-String 这条路。

### Windows 下 git commit 中文 commit message 被 bash 改码 (2026-06-25)
Type: gotcha

在 Windows PowerShell 里直接 `git commit -m "<chinese>"` 时,中文会变成乱码(看到「脏状�?」之类),因为 PowerShell 5.1 默认 ANSI 代码页 + bash 工具链的 UTF-8 处理不兼容。即使命令"成功", `git log` 出来的 commit message 也是错的。

正确做法 — **不要**走 -m 字符串,**写临时文件**再用 -F:
1. 用 Write 工具(UTF-8)把 commit message 写到 `C:\Users\57526\AppData\Local\Temp\commit-msg.txt`
2. `git commit --no-verify -F "C:\Users\57526\AppData\Local\Temp\commit-msg.txt"`
3. 提交后用 `git log -1 --format='%H %s'` 独立验证(Write 不会乱码,git 直接读文件)

这个套路对 PR description、tag message、merge commit message 一律适用。

### Windows 下 `mavis communication send --content "<chinese>"` 中文被吃 (2026-06-25)
Type: gotcha

把中文写进 `--content "..."` 字符串直接通过 bash 工具调用 `mavis communication send` 时,收件方收到的 content 是空字符串 (id=N 长度 0,大概率是 bash → spawn → mavis 这条链上某一步按 Windows-1252 解码 UTF-8 字节)。表格符 / emoji / box-drawing 在视觉上更明显,但裸中文也一样会被吃。

错误示例: `mavis communication send --to <sess> --content "中文内容带表格"` → 收件方 `messages --from <sess>` 拿到 `content=""` 或者乱码 + 截断。

**【已验证失败,不能用】** 半截方案:PowerShell `$c = Get-Content -Encoding UTF8 msg.txt; mavis send --content "$c"` — 短消息(标题 + 1-2 行)能过,**长内容(>20 行)会被截到只剩标题+冒号**(2026-06-25 id=73 实证)。PowerShell 把多行字符串当 argv 传时,换行/长度阈值在某处被吃。

**【真正可行的方案】走 stdin 管道,不要用 --content**:
```powershell
Get-Content -Encoding UTF8 "C:\Users\57526\AppData\Local\Temp\msg.txt" | `
  mavis communication send --to <sess> --command prompt
```
- 文件用 Write 工具写(UTF-8 无 BOM,纯中文+英文标点+换行)
- `Get-Content` 不带 -Raw 也能 pipe,逐行流式入 mavis stdin
- mavis 在没拿到 --content 时从 stdin 读 message body
- 2026-06-25 id=83 用这个方式发长内容,收件方拿到完整正文

**【2026-06-25 二次确认】stdin pipe 也被吃**:
- 收件方报 id=187 / id=198 content=empty (虽然 send API 返回 "delivered")
- 推测是 mavis server 侧某种 transport 把 stdin 内容 strip 了
- 真正的可靠路径是 **inline ASCII short body**:
  ```powershell
  mavis communication send --to <sess> --command prompt --content "ASCII ack only, no CJK"
  ```
- orchestrator 建议 (id=207 验证): 走 --content 内联 + 短 ASCII
- **不要中文 / 不要 emoji / 不要 box-drawing / 不要换行超过 3 行**
- 详细方案 / 列表 / 代码: 落 git 文件,消息里只发 commit hash + 1-2 行提示

**【优先级排序(2026-06-25 实测)】**:
1. inline ASCII short body (最稳)
2. Python subprocess (orchestrator 推荐,未实测)
3. stdin pipe (不稳定)
4. --content "$c" (短可用,长必死)

**【兜底】内容很长且 mavis 不收 stdin 时**:
- 把内容直接落 git 仓库的文件
- 消息里只发 "看 server/scripts/xxx.sh, 已 commit d55e0d68" 这类短行
- 收件方走 git pull + cat 路径

WHY: bash → PowerShell → mavis.exe 的 argv 传递链上,Windows 1252 ↔ UTF-8 的转换在 PowerShell 5.1 默认 ANSI 代码页下不可靠。stdin 是字节流,不经过 argv 解析,所以不会中招。

跟 git commit 中文 message 是同一个根因(PowerShell 5.1 默认 ANSI 代码页),套路一致。

### Deploy script 必须补 npm install 步 (2026-06-25)
Type: lesson

**症状**: deploy-stage1.sh rsync exclude node_modules,产线原 node_modules 只装了运行时依赖 (`npm install --production` 或只装 dependencies 段)。后续 step=build 跑 `npx tsc` 报 `This is not the tsc command you are looking for`,因为 typescript 在 devDependencies。

**根因**: zjzl-deploy 在 ECS 跑 §2.3 暴露:7/9 PASS(generate/build/pm2 三步里 generate 之前就找不到 tsc)。

**修复** (server/scripts/deploy-stage1.sh b8b41394):
- 在 `rsync` 和 `generate` 之间插入新 step `npm_install`
- 智能检测: 检查 `node_modules/{typescript,prisma,@types/node}` 都在才跳过(否则启动 `npm ci --include=dev --omit=optional`)
- 有 `package-lock.json` 走 `npm ci`(版本精确),否则 `npm install`
- 加 `SKIP_NPM_INSTALL=1` 开关
- 关键: 不要无脑跑 npm install --production,产线 dist/ 后面还要 rebuild,需要 devDeps

**通用 deploy script 模板坑**:
1. rsync exclude node_modules 是对的(防跨架构不兼容),但必须补 install 步
2. generate / build / migrate / seed 之类的开发期工具,大多在 devDeps,产线默认没装
3. 任何 deploy 脚本第一次在新环境跑,先 dry-run 列出会执行哪些步骤,逐一确认每个工具在产线 node_modules 里存在

WHY: zjzl-deploy 团队 memory 2026-06-25 已记 'Deploy script npm',这是任何 monorepo / microservice deploy script 的通用坑,不限于本项目。
