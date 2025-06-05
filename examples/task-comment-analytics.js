var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Configuration, TaskApi, DataTagsApi } from '../src/generated';
// Создание комментария с аналитикой в задаче
export function createCommentWithAnalytics() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const config = new Configuration({
            basePath: 'https://your-account.planfix.com/rest',
            accessToken: 'YOUR_TOKEN',
        });
        const taskApi = new TaskApi(config);
        const dataTagApi = new DataTagsApi(config);
        // 1. Получить id аналитики "Оплата факт"
        const dataTags = yield dataTagApi.getDatatagList();
        const analytic = (_a = dataTags.objects) === null || _a === void 0 ? void 0 : _a.find(d => d.name === 'Оплата факт');
        if (!analytic)
            throw new Error('datatag not found');
        // 2. Получить id полей аналитики
        const fields = yield dataTagApi.getDatatagFields({ id: analytic.id });
        // 3. Создать комментарий с аналитикой в задаче 123456
        yield taskApi.postTaskAddDataTagEntryNewComment({
            id: 123456,
            dataTagEntryCreateRequest: {
                datatagId: analytic.id,
                fields: (_b = fields.objects) === null || _b === void 0 ? void 0 : _b.map(f => ({ id: f.id, value: Math.random().toString() }))
            }
        });
    });
}
