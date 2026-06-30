# Настройка автообновления EasyZapret

Приложение использует [Tauri Updater](https://v2.tauri.app/plugin/updater/) и подписанные артефакты с GitHub Releases.

## Уже сделано в проекте

- Публичный ключ в `src-tauri/tauri.conf.json` → `plugins.updater.pubkey` (совпадает с `~/.tauri/easyzapret-updater.key.pub`)
- `bundle.createUpdaterArtifacts: true`
- Endpoint: `https://github.com/danyalacio/easyzapret/releases/latest/download/latest.json`
- Плагины updater + process в приложении
- Workflow `.github/workflows/release.yml` для сборки на Windows

## Что нужно сделать тебе

### 1. GitHub Secrets (один раз)

Репозиторий → **Settings → Secrets and variables → Actions → New repository secret**:

| Секрет | Значение |
|--------|----------|
| `TAURI_SIGNING_PRIVATE_KEY` | Содержимое `~/.tauri/easyzapret-updater.key` **целиком** (может быть одной строкой base64 — вставь как есть) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Пароль, который задавал при `tauri signer generate` |

**Важно для CI:** секрет должен быть **Repository secret** (не Environment). Файл должен начинаться с `untrusted comment: minisign encrypted secret key`.

Если сборка падает на подписи — закодируй ключ в base64 и вставь в секрет:

```bash
base64 < ~/.tauri/easyzapret-updater.key | tr -d '\n' | pbcopy   # Mac
```

Проверка на Mac/Linux:

```bash
cat ~/.tauri/easyzapret-updater.key
```

Файл `.key` **никогда** не коммитить в git.

### 2. Первый релиз v0.3.0

**Вариант A — через GitHub Actions (рекомендуется):**

```bash
git add .
git commit -m "v0.3.0: autopilot modes, in-app updater"
git tag v0.3.0
git push origin main
git push origin v0.3.0
```

Workflow соберёт Windows-установщик и создаст **черновик** Release. Открой Releases на GitHub, проверь Assets (должны быть `.exe`, `.nsis.zip`, `.sig`, `latest.json`) и нажми **Publish release**.

**Вариант B — сборка вручную на Windows:**

```bash
npm ci
npm run tauri build
```

Артефакты в `src-tauri/target/release/bundle/nsis/`. Загрузи в Release на GitHub:

- `EasyZapret_*_x64-setup.exe` — для новых пользователей
- `EasyZapret_*_x64-setup.nsis.zip` + `.sig` — для кнопки «Установить обновление»
- **`latest.json`** — манифест (генерируется при сборке)

При ручной сборке задай переменные окружения:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$env:USERPROFILE\.tauri\easyzapret-updater.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "ТВОЙ_ПАРОЛЬ"
npm run tauri build
```

### 3. Следующие релизы

1. Поднять версию в `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`
2. `git tag v0.3.1` (или `v0.4.0`) и `git push origin v0.3.1`
3. Опубликовать Release — пользователи с 0.3.0 увидят обновление в приложении

## Как это работает для пользователя

- При запуске проверяется GitHub (`check_app_update` + Tauri updater).
- Если версия в `latest.json` новее — кнопка **«Установить обновление»** в настройках или в окне обновлений.
- Скачивается подписанный `.nsis.zip`, проверяется подпись, установщик запускается в passive-режиме, приложение перезапускается.

**Важно:** автообновление работает только у тех, кто уже установил сборку **с updater** (начиная с 0.3.0 с этими изменениями). Старые установки без updater — один раз поставить новый установщик вручную.

## Рекомендации

- **Authenticode** для `.exe` — не обязателен для updater, но уменьшает предупреждения SmartScreen.
- Не меняй приватный ключ без смены `pubkey` в `tauri.conf.json`.
- Тест: установи 0.3.0, выпусти 0.3.1, нажми «Установить обновление».

## Если в Releases только тег, без файлов

1. Открой **Actions → Release** — если красный, открой лог шага **Build Tauri app** или **Validate signing key secret**.
2. Чаще всего: неверный формат `TAURI_SIGNING_PRIVATE_KEY` — пересоздай секрет (сырой `.key` или base64, см. выше).
3. Перезапусти workflow: **Actions → Release → Run workflow** или заново:
   ```bash
   git push origin :refs/tags/v0.3.0
   git tag -f v0.3.0
   git push origin v0.3.0
   ```
4. Черновик Release появится после успешной сборки — нажми **Publish release**.
