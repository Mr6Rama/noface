# Интеграция Bootstrap сервера с Flutter приложением

## 🔗 Обновление WebRTCService

Для интеграции с Bootstrap сервером нужно обновить `WebRTCService` в Flutter приложении:

```dart
// lib/services/webrtc_service.dart

import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/post_model.dart';
import '../models/identity.dart';

class WebRTCService {
  static const String _bootstrapUrl = 'https://noface-bootstrap.herokuapp.com';
  
  // Состояние
  bool _isInitialized = false;
  String? _peerId;
  String? _localIP;
  int? _localPort;
  final List<Map<String, dynamic>> _connectedPeers = [];
  final List<Post> _receivedPosts = [];

  // Стримы для событий
  final StreamController<Post> _postController = StreamController<Post>.broadcast();
  final StreamController<String> _peerController = StreamController<String>.broadcast();
  final StreamController<String> _statusController = StreamController<String>.broadcast();

  // Геттеры
  bool get isInitialized => _isInitialized;
  String? get peerId => _peerId;
  List<String> get connectedPeers => _connectedPeers.map((p) => p['id'] as String).toList();
  List<Post> get receivedPosts => List.unmodifiable(_receivedPosts);

  // Стримы
  Stream<Post> get onPostReceived => _postController.stream;
  Stream<String> get onPeerConnected => _peerController.stream;
  Stream<String> get onStatusChanged => _statusController.stream;

  /// Инициализирует P2P сервис
  Future<bool> initialize() async {
    try {
      _updateStatus('Инициализация P2P...');

      // Генерируем peer ID
      _peerId = 'peer_${DateTime.now().millisecondsSinceEpoch}';
      
      // Получаем локальный IP (упрощенно)
      _localIP = '192.168.1.100'; // В реальном приложении нужно получить реальный IP
      _localPort = 8080 + (DateTime.now().millisecondsSinceEpoch % 1000);

      // Регистрируемся на Bootstrap сервере
      await _registerWithBootstrap();

      // Получаем список других пиров
      await _discoverPeers();

      _isInitialized = true;
      _updateStatus('P2P инициализирован');
      return true;

    } catch (e) {
      _updateStatus('Ошибка инициализации: $e');
      print('P2P initialization error: $e');
      return false;
    }
  }

  /// Регистрация на Bootstrap сервере
  Future<void> _registerWithBootstrap() async {
    try {
      final response = await http.post(
        Uri.parse('$_bootstrapUrl/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'id': _peerId,
          'ip': _localIP,
          'port': _localPort,
          'name': 'NoFace Client',
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          _updateStatus('Зарегистрирован на Bootstrap сервере');
        } else {
          throw Exception('Bootstrap registration failed: ${data['error']}');
        }
      } else {
        throw Exception('Bootstrap registration failed: ${response.statusCode}');
      }
    } catch (e) {
      print('Bootstrap registration error: $e');
      rethrow;
    }
  }

  /// Поиск других пиров через Bootstrap сервер
  Future<void> _discoverPeers() async {
    try {
      final response = await http.get(
        Uri.parse('$_bootstrapUrl/peers?active=true&limit=20'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          _connectedPeers.clear();
          for (final peer in data['peers']) {
            if (peer['id'] != _peerId) { // Исключаем себя
              _connectedPeers.add(peer);
              _peerController.add(peer['id']);
            }
          }
          _updateStatus('Найдено ${_connectedPeers.length} пиров');
        }
      }
    } catch (e) {
      print('Peer discovery error: $e');
    }
  }

  /// Публикует пост в P2P сеть
  Future<bool> publishPost(Post post) async {
    if (!_isInitialized) {
      return false;
    }

    try {
      // В реальном приложении здесь будет отправка поста всем подключенным пирам
      // Пока что симулируем успешную публикацию
      _updateStatus('Пост опубликован в P2P сеть');
      return true;

    } catch (e) {
      print('Error publishing post: $e');
      return false;
    }
  }

  /// Создает новый пост
  Future<Post?> createPost(String content, String topic, Identity identity) async {
    try {
      final post = Post(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        content: content,
        authorPkBase64: identity.publicKeyBase64,
        signature: 'dummy_signature', // For MVP, actual signing will be done by KeyService
        createdAt: DateTime.now().millisecondsSinceEpoch,
        topic: topic,
        isLocal: true,
      );

      // Публикуем пост
      await publishPost(post);
      _postController.add(post); // Simulate receiving own post

      return post;
    } catch (e) {
      print('Error creating post: $e');
      return null;
    }
  }

  /// Получает статистику сети
  Map<String, dynamic> getNetworkStats() {
    return {
      'isInitialized': _isInitialized,
      'peerId': _peerId,
      'connectedPeers': _connectedPeers.length,
      'receivedPosts': _receivedPosts.length,
      'bootstrapUrl': _bootstrapUrl,
    };
  }

  /// Обновляет список пиров
  Future<void> refreshPeers() async {
    if (_isInitialized) {
      await _discoverPeers();
    }
  }

  /// Останавливает сервис
  Future<void> stop() async {
    try {
      _isInitialized = false;
      _connectedPeers.clear();
      _receivedPosts.clear();

      _updateStatus('P2P сервис остановлен');

    } catch (e) {
      print('Error stopping P2P service: $e');
    }
  }

  /// Освобождает ресурсы
  void dispose() {
    _postController.close();
    _peerController.close();
    _statusController.close();
  }

  /// Обновляет статус и уведомляет слушателей
  void _updateStatus(String status) {
    _statusController.add(status);
    print('WebRTCService Status: $status');
  }
}
```

## 🌐 Развертывание Bootstrap сервера

### На Render.com

1. **Создайте новый Web Service:**
   - Подключите GitHub репозиторий
   - Выберите `bootstrap-server` папку
   - Укажите:
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Environment**: Node

2. **Настройте переменные окружения:**
   - `NODE_ENV=production`
   - `PORT` (автоматически устанавливается Render)

3. **Получите URL сервера:**
   - После деплоя получите URL вида: `https://noface-bootstrap.onrender.com`
   - Обновите `_bootstrapUrl` в Flutter приложении

### Локальное тестирование

```bash
cd bootstrap-server
npm install
npm start
```

Сервер будет доступен на `http://localhost:3000`

## 🧪 Тестирование интеграции

### Тест Bootstrap сервера
```bash
cd bootstrap-server
node test-api.js
```

### Тест из Flutter приложения
1. Обновите `WebRTCService` с кодом выше
2. Запустите Flutter приложение
3. Перейдите на экран P2P Network
4. Проверьте, что сервер показывает статус "Подключено"

## 📊 Мониторинг

### Логи Bootstrap сервера
- Регистрация новых пиров
- Удаление неактивных пиров
- Ошибки API

### Метрики
- Общее количество зарегистрированных пиров
- Количество активных пиров
- Время работы сервера

## 🔧 Настройка для продакшена

### Переменные окружения
```bash
NODE_ENV=production
PORT=3000
```

### CORS настройки
Сервер уже настроен для работы с любыми доменами через CORS.

### Безопасность
- Валидация входных данных
- Обработка ошибок
- Автоматическая очистка неактивных пиров

## 🚀 Следующие шаги

1. **Реализовать реальный WebRTC** для P2P соединений
2. **Добавить шифрование** сообщений между пирами
3. **Реализовать NAT traversal** для работы за роутерами
4. **Добавить DHT** для децентрализованного поиска пиров
5. **Реализовать синхронизацию** постов между пирами
