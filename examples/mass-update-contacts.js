var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Configuration, ContactApi, CustomFieldsContactApi } from '../src/generated';
// Пример массового изменения пользовательского поля у контактов
export function massUpdate() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        const config = new Configuration({
            basePath: 'https://your-account.planfix.com/rest',
            accessToken: 'YOUR_TOKEN',
        });
        const contactApi = new ContactApi(config);
        const customApi = new CustomFieldsContactApi(config);
        // 1. Получить id шаблона контактов "Шаблон контакта"
        const templates = yield contactApi.getContactListTemplates();
        const template = (_a = templates.objects) === null || _a === void 0 ? void 0 : _a.find(t => t.name === 'Шаблон контакта');
        if (!template)
            throw new Error('template not found');
        // 2. Получить id полей контактов "Отрасль" и "Отрасли"
        const fieldsResp = yield customApi.getCustomfieldContact();
        const fieldIndustry = (_b = fieldsResp.objects) === null || _b === void 0 ? void 0 : _b.find(f => f.name === 'Отрасль');
        const fieldIndustries = (_c = fieldsResp.objects) === null || _c === void 0 ? void 0 : _c.find(f => f.name === 'Отрасли');
        if (!(fieldIndustry && fieldIndustries))
            throw new Error('fields not found');
        // 3. Получить список контактов с заполненным полем "Отрасль"
        const contacts = yield contactApi.getContactList({
            getContactListRequest: {
                templateId: template.id,
                fields: 'all',
                filters: [{
                        type: null,
                        operator: 'notequal',
                        value: '',
                        field: fieldIndustry.id,
                    }],
            },
        });
        // 4. В каждом контакте обновить поле "Отрасли"
        for (const c of (_d = contacts.objects) !== null && _d !== void 0 ? _d : []) {
            const value = (_f = (_e = c.customFields) === null || _e === void 0 ? void 0 : _e.find(cf => cf.id === fieldIndustry.id)) === null || _f === void 0 ? void 0 : _f.value;
            if (!value)
                continue;
            yield contactApi.postContact({
                contactRequest: {
                    id: c.id,
                    customFields: [{ id: fieldIndustries.id, value: [value] }],
                },
            });
        }
    });
}
