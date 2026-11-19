# Обновка: расчёт перетяжки мебели

Клиент собирает свою мебель в 3D, выбирает новую ткань и ремонт, видит цену и отправляет заявку с фото. Мастер получает её в кабинете.

- `src/client` страница для клиентов
- `src/cabinet` кабинет мастера
- `src/lib` прайс, расчёт, работа с API
- `scripts/parts.py` модели для Blender (`pip install bpy==5.3.0`, затем `npm run models`)

Сервер общий с калькулятором химчистки (`../himchistka-svezho-src/server`), правила расчёта для перетяжки повторяют `src/lib/store.ts`.

```bash
npm install
npm run dev                                   # демо, данные в браузере
VITE_API_URL=http://localhost:5080 npm run dev # с сервером
npm run build && npm run place                # сборка в ../peretyazhka-obnovka
```
