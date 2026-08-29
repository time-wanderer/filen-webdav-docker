# Filen WebDAV Docker v2

基于 Filen 官方当前维护的 [`@filen/webdav@0.3.1`](https://www.npmjs.com/package/@filen/webdav) 制作的 Docker 镜像。

- 官方源码：https://github.com/FilenCloudDienste/filen-webdav
- 官方 npm 包：`@filen/webdav@0.3.1`
- 官方要求 Node.js：`>=20`（镜像使用 `node:20-bookworm-slim`）
- Docker Hub：`qinlingmonkey/filen-webdav:v2`
- 已有 `qinlingmonkey/filen-webdav:v1` **完整保留，不会被覆盖、删除或改成 latest**

本目录是独立的 Docker 包装层。官方仓库本身是库，不是可直接运行的 Docker 项目；v2 通过官方 npm 包启动 WebDAV，而不是继续使用旧第三方镜像代码。

## v2 与 v1 的关系

| 项目 | 说明 |
| --- | --- |
| `qinlingmonkey/filen-webdav:v1` | 旧镜像，完整保留 |
| `qinlingmonkey/filen-webdav:v2` | 本次新增，基于官方 `@filen/webdav@0.3.1` |
| `latest` | 本次不修改 |

以后制作 v3 时，继续新增 tag，不要覆盖 v1 / v2。

## 环境变量

复制 `.env.example` 为 `.env`，填入自己的值。不要把真实密码写入 Dockerfile、镜像、README 或 Git。

### 通用

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `WEBDAV_MODE` | `standalone` | `standalone` 单账号；`proxy` 多账号网关 |
| `WEBDAV_HOST` | `0.0.0.0` | 容器内监听地址 |
| `WEBDAV_PORT` / `PORT` | `1900` | 容器内监听端口 |
| `WEBDAV_PUBLISH_PORT` | `1900` | Compose 映射到宿主机的端口 |
| `WEBDAV_HTTPS` | `false` | 容器内自签 HTTPS，一般保持关闭 |
| `WEBDAV_AUTH_MODE` | `basic` | `basic` 或 `digest`；proxy 模式只能 basic |
| `WEBDAV_THREADS` | 空 | 设置后启用官方 cluster 模式 |
| `FILEN_TMP_PATH` | `/data/tmp/filen-sdk` | SDK 临时目录 |

### standalone 模式（推荐单用户）

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `FILEN_EMAIL` | 是 | Filen 账号邮箱 |
| `FILEN_PASSWORD` | 是 | Filen 账号密码 |
| `FILEN_2FA` | 否 | 6 位 OTP 或恢复码 |
| `WEBDAV_USERNAME` | 是 | 给 WebDAV 客户端用的用户名 |
| `WEBDAV_PASSWORD` | 是 | 给 WebDAV 客户端用的密码 |

### proxy 模式（多账号）

不需要预先配置 Filen 账号。客户端使用：

- 用户名：Filen 邮箱
- 密码：`password=你的Filen密码`
- 若开启 2FA：`password=你的Filen密码&twoFactorAuthentication=123456`

## 数据卷

容器使用 `/data` 持久化：

- `/data/.config/@filen/webdav`：官方配置和本地临时磁盘文件
- `/data/.config/@filen/logs`：日志
- `/data/tmp/filen-sdk`：SDK 临时文件

## 拉取

```sh
docker pull qinlingmonkey/filen-webdav:v2
```

不要执行 `docker pull/push qinlingmonkey/filen-webdav:v1` 来替换旧镜像。

## docker run

```sh
docker run -d \
  --name filen-webdav-v2 \
  --restart unless-stopped \
  -p 1900:1900 \
  -e WEBDAV_MODE=standalone \
  -e FILEN_EMAIL='your-filen-email@example.com' \
  -e FILEN_PASSWORD='your-filen-password' \
  -e FILEN_2FA='' \
  -e WEBDAV_USERNAME='webdav-user' \
  -e WEBDAV_PASSWORD='webdav-password' \
  -v filen-webdav-data:/data \
  qinlingmonkey/filen-webdav:v2
```

proxy 模式示例：

```sh
docker run -d \
  --name filen-webdav-v2 \
  --restart unless-stopped \
  -p 1900:1900 \
  -e WEBDAV_MODE=proxy \
  -v filen-webdav-data:/data \
  qinlingmonkey/filen-webdav:v2
```

## Docker Compose

```sh
cd filen-webdav-docker
cp .env.example .env
# 编辑 .env，填入真实 Filen / WebDAV 凭据
docker compose up -d
```

`compose.yml` 已固定使用 `qinlingmonkey/filen-webdav:v2`。

## 常用命令

```sh
# 启动
docker compose up -d
# 或
docker start filen-webdav-v2

# 停止
docker compose stop
# 或
docker stop filen-webdav-v2

# 重启
docker compose restart
# 或
docker restart filen-webdav-v2

# 查看状态
docker ps --filter name=filen-webdav-v2

# 查看日志
docker logs -f filen-webdav-v2
# 或
docker compose logs -f
```

## 更新 v2

```sh
docker pull qinlingmonkey/filen-webdav:v2
docker stop filen-webdav-v2
docker rm filen-webdav-v2
# 再按上面的 docker run 或 compose 启动
```

不要用新镜像覆盖 v1 tag。

## 重新构建

```sh
cd filen-webdav-docker
docker build -t qinlingmonkey/filen-webdav:v2 .
```

只打 `v2`，不要改 `v1` 或 `latest`。

## 以后制作 v3

1. 确认官方最新 `@filen/webdav` 版本。
2. 更新根目录 `package.json` 中的版本并重新生成 lock 文件。
3. 构建并测试：`docker build -t qinlingmonkey/filen-webdav:v3 .`
4. 本地 `docker run` / `docker logs` 验证后再 push `v3`。
5. 保留 v1、v2，不要覆盖旧 tag。

## 本地测试建议

无 Filen 凭据时，先用 proxy 模式验证容器能启动并监听：

```sh
docker run --rm -p 1900:1900 -e WEBDAV_MODE=proxy qinlingmonkey/filen-webdav:v2
curl -i http://127.0.0.1:1900/
```

未认证请求应返回 `401 Unauthorized`，并带 `WWW-Authenticate` 和 `DAV` 头。这表示 WebDAV 服务已正常监听。

完整云端读写需要真实 Filen 账号，请通过环境变量传入，不要写入文件。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| 容器立刻退出，日志提示缺少 `FILEN_EMAIL` | standalone 模式必须提供 Filen 和 WebDAV 环境变量 |
| 日志提示 login / 2FA 失败 | 检查邮箱、密码、2FA；2FA 用 `FILEN_2FA` |
| `401 Unauthorized` | 对未登录请求是正常的；客户端需使用正确 WebDAV 用户名密码 |
| proxy 模式登录失败 | 用户名必须是 Filen 邮箱；密码格式为 `password=...` |
| 端口连不上 | 确认映射的是宿主机 `WEBDAV_PUBLISH_PORT`，容器内固定 1900 |
| 重启循环 | `docker logs` 查看 Node / SDK 错误，不要覆盖 v1 |

## 官方启动方式对照

官方 README 的 standalone 模式：`FilenSDK.login()` 后创建 `WebDAVServer({ user: { username, password, sdk } })`，默认端口 `1900`。

本镜像把这些参数改成环境变量，监听 `0.0.0.0:1900`，便于 Docker 使用。
