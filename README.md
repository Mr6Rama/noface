# NoFace Bootstrap Server

Минимальный Bootstrap сервер для P2P-сети NoFace. Помогает узлам находить друг друга в сети.

## 🚀 Быстрый старт

### Установка зависимостей
```bash
npm install
```

### Запуск сервера
```bash
npm start
```

Сервер запустится на порту 3000 (или на порту из переменной окружения PORT).

## 📡 API Endpoints

### POST /register
Регистрация нового узла в сети.

**Запрос:**
```json
{
  "id": "peer_1234567890",
  "ip": "192.168.1.100",
  "port": 8080,
  "name": "MyNode" // опционально
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "Peer registered successfully",
  "peer": {
    "id": "peer_1234567890",
    "name": "MyNode",
    "registeredAt": 1640995200000
  }
}
```

### GET /peers
Получение списка активных узлов.

**Параметры запроса:**
- `limit` (опционально) - максимальное количество узлов (по умолчанию 50)
- `active` (опционально) - только активные узлы (true/false)

**Пример запроса:**
```
GET /peers?limit=20&active=true
```

**Ответ:**
```json
{
  "success": true,
  "count": 5,
  "total": 10,
  "peers": [
    {
      "id": "peer_1234567890",
      "ip": "192.168.1.100",
      "port": 8080,
      "name": "MyNode",
      "lastSeen": 1640995200000,
      "registeredAt": 1640995200000
    }
  ]
}
```

### GET /status
Получение статуса сервера и статистики.

**Ответ:**
```json
{
  "success": true,
  "server": {
    "status": "running",
    "uptime": 3600,
    "version": "1.0.0"
  },
  "network": {
    "totalPeers": 10,
    "activePeers": 5,
    "lastCleanup": "2023-12-31T12:00:00.000Z"
  }
}
```

### GET /health
Проверка здоровья сервера.

**Ответ:**
```json
{
  "status": "ok",
  "timestamp": "2023-12-31T12:00:00.000Z"
}
```

### DELETE /peers/:id
Отмена регистрации узла.

**Ответ:**
```json
{
  "success": true,
  "message": "Peer unregistered successfully"
}
```

## 🔧 Конфигурация

### Переменные окружения
- `PORT` - порт сервера (по умолчанию 3000)

### Настройки
- **Таймаут неактивных узлов**: 5 минут
- **Проверка активности**: каждую минуту
- **Максимальное количество узлов в ответе**: 50

## 🏗️ Архитектура

### Хранение данных
- Все данные хранятся в оперативной памяти (Map)
- Автоматическая очистка неактивных узлов
- Нет постоянного хранения (данные теряются при перезапуске)

### Безопасность
- CORS включен для всех доменов
- Валидация входных данных
- Обработка ошибок

## 🚀 Развертывание

### Локальная разработка
```bash
npm install
npm start
```

### Production (Render.com)
1. Подключите репозиторий к Render
2. Выберите "Web Service"
3. Укажите:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

### Docker (опционально)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Мониторинг

### Логи
Сервер выводит в консоль:
- Регистрацию новых узлов
- Удаление неактивных узлов
- Ошибки

### Метрики
- Общее количество зарегистрированных узлов
- Количество активных узлов
- Время работы сервера

## 🔄 Интеграция с NoFace

### В Flutter приложении
```dart
// Регистрация узла
final response = await http.post(
  Uri.parse('https://noface-bootstrap.herokuapp.com/register'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'id': peerId,
    'ip': localIP,
    'port': localPort,
    'name': 'NoFace Client',
  }),
);

// Получение списка пиров
final peersResponse = await http.get(
  Uri.parse('https://noface-bootstrap.herokuapp.com/peers?active=true'),
);
```

## 🐛 Отладка

### Проверка работы сервера
```bash
curl http://localhost:3000/health
```

### Тестирование регистрации
```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"id":"test123","ip":"127.0.0.1","port":8080}'
```

### Получение списка пиров
```bash
curl http://localhost:3000/peers
```

## 📝 Лицензия

MIT License - см. файл LICENSE для деталей.
