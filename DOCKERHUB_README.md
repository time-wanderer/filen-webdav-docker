# Filen WebDAV Docker v2

基于 Filen 官方维护的 [`@filen/webdav@0.3.1`](https://www.npmjs.com/package/@filen/webdav) 制作。

- **镜像：** `qinlingmonkey/filen-webdav:v2`
- **官方源码：** https://github.com/FilenCloudDienste/filen-webdav
- **Node.js：** 20
- **容器端口：** `1900`
- **架构：** `linux/amd64`
- **Digest：** `sha256:26d8d1c6bbdf8e37fbe9dfac09e1f56878830405b852437af427186ed10afe59`

> `v2` 是新增版本。原有 `v1` 保持不变；本次没有修改 `latest`。

## V1 与 V2 端口区别（重要）

| 版本 | 镜像 | 容器内部端口 | 推荐端口映射 |
| --- | --- | --- | --- |
| V1 | `qinlingmonkey/filen-webdav:v1` | `18888` | `18888:18888` |
| V2 | `qinlingmonkey/filen-webdav:v2` | `1900` | `1900:1900` |

**不要把两个版本的内部端口混用：**

- V1 必须映射到容器内部端口 `18888`，例如 `18888:18888`。
- V2 必须映射到容器内部端口 `1900`，例如 `1900:1900`。
- 冒号左边是宿主机端口，可以按需修改；冒号右边是容器内部端口，应保持对应版本的固定值。

## V1 原版使用说明

V1 是此前使用的旧版镜像，内部监听端口为 `18888`。V1 已完整保留，适合需要继续维持旧部署的用户。

原来的 Docker Compose 配置：

```yaml
version: '3.3'
services:
  filen-webdav:
    image: 'reth01/filen-webdav:latest'
    container_name: filen-webdav
    ports:
      - '18888:18888'
    restart: unless-stopped
```

如果希望固定使用本仓库中已经保留的 V1，而不是继续跟随第三方 `latest`，建议使用：

```yaml
version: '3.3'
services:
  filen-webdav:
    image: 'qinlingmonkey/filen-webdav:v1'
    container_name: filen-webdav-v1
    ports:
      - '18888:18888'
    restart: unless-stopped
```

启动和查看日志：

```sh
docker compose up -d
docker compose logs -f
```

V1 WebDAV 客户端连接地址：

```text
http://服务器IP:18888/
```

V1 为旧版第三方实现；本项目不会覆盖、删除或重新标记该镜像。新部署建议优先使用下面的 V2。

## V2 使用说明

V2 基于 Filen 官方当前维护的 `@filen/webdav@0.3.1`，容器内部端口固定为 `1900`。

## 拉取镜像

```sh
docker pull qinlingmonkey/filen-webdav:v2
```

## Docker Compose

创建 `compose.yml`：

```yaml
services:
  filen-webdav:
    image: qinlingmonkey/filen-webdav:v2
    container_name: filen-webdav-v2
    restart: unless-stopped
    init: true
    ports:
      - "${WEBDAV_PUBLISH_PORT:-1900}:1900"
    env_file:
      - .env
    environment:
      HOME: /data
      XDG_CONFIG_HOME: /data/.config
      HOST: 0.0.0.0
      PORT: 1900
      WEBDAV_HOST: 0.0.0.0
      WEBDAV_PORT: 1900
    volumes:
      - filen-webdav-data:/data
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - "require('http').get('http://127.0.0.1:1900',r=>process.exit(r.statusCode===401||(r.statusCode>=200&&r.statusCode<500)?0:1)).on('error',()=>process.exit(1))"
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 20s

volumes:
  filen-webdav-data:
```

创建 `.env`，并替换所有示例值：

```dotenv
WEBDAV_MODE=standalone
WEBDAV_PUBLISH_PORT=1900
WEBDAV_HTTPS=false
WEBDAV_AUTH_MODE=basic
WEBDAV_DISABLE_LOGGING=false

WEBDAV_USERNAME=change-me-webdav-user
WEBDAV_PASSWORD=change-me-webdav-password

FILEN_EMAIL=your-filen-email@example.com
FILEN_PASSWORD=change-me-filen-password
FILEN_2FA=
```

保护配置文件：

```sh
chmod 600 .env
```

启动：

```sh
docker compose up -d
```

查看状态和日志：

```sh
docker compose ps
docker compose logs -f
```

停止、启动和重启：

```sh
docker compose stop
docker compose start
docker compose restart
```

移除容器但保留数据卷：

```sh
docker compose down
```

## standalone 单账号模式

容器启动时登录一个 Filen 账号，WebDAV 客户端使用独立的 WebDAV 用户名和密码：

| 环境变量 | 必填 | 说明 |
| --- | --- | --- |
| `FILEN_EMAIL` | 是 | Filen 账号邮箱 |
| `FILEN_PASSWORD` | 是 | Filen 账号密码 |
| `FILEN_2FA` | 否 | 6 位 OTP 或恢复码 |
| `WEBDAV_USERNAME` | 是 | WebDAV 客户端用户名 |
| `WEBDAV_PASSWORD` | 是 | WebDAV 客户端密码 |

访问地址：

```text
http://服务器IP:1900/
```

## proxy 多账号模式

将 `.env` 中的模式改为：

```dotenv
WEBDAV_MODE=proxy
```

proxy 模式无需预先填写一个固定 Filen 账号。WebDAV 客户端使用：

| 字段 | 内容 |
| --- | --- |
| 用户名 | Filen 账号邮箱 |
| 无 2FA 密码 | `password=你的Filen密码` |
| 有 2FA 密码 | `password=你的Filen密码&twoFactorAuthentication=123456` |

proxy 模式只支持 Basic Auth。

## 数据卷

`filen-webdav-data` 挂载到容器 `/data`：

| 路径 | 用途 |
| --- | --- |
| `/data/.config/@filen/webdav` | WebDAV 配置和本地临时文件 |
| `/data/.config/@filen/logs` | 日志 |
| `/data/tmp/filen-sdk` | Filen SDK 临时文件 |

## 更新

```sh
docker compose pull
docker compose up -d
```

## 注意事项

- 不要把真实 Filen 密码或 WebDAV 密码写入镜像或公开仓库。
- `.env` 应设为 `chmod 600`，且不要提交到 Git。
- Basic Auth 应放在可信 HTTPS 反向代理之后，不建议直接通过公网 HTTP 暴露。
- 未认证请求返回 `401 Unauthorized` 属于正常认证挑战。
- 当前官方依赖树存在 npm 已知安全告警，请关注 Filen 官方 SDK/WebDAV 后续升级。
