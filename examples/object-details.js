var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ObjectApi } from '../src/generated';
import { loadConfig } from '../src/config';
// Получение деталей объекта "Продажа"
export function getObjectDetails() {
    return __awaiter(this, void 0, void 0, function* () {
        const config = loadConfig();
        const api = new ObjectApi(config);
        // 1. Основные поля объекта "Продажа"
        const object = yield api.getObjectById({ id: 'Продажа' });
        console.log(object);
        // 2. Дополнительные поля объекта "Продажа"
        const extras = yield api.getObjectList({ getObjectListRequest: { pageSize: 5 } });
        console.log(extras);
    });
}

// Запуск примера если файл вызван напрямую
if (require.main === module) {
    getObjectDetails().catch(err => console.error(err));
}
