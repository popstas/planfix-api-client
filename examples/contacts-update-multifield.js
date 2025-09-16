var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ContactApi } from '../src/generated';
import { loadConfig } from '../src/config';
function parseArgs(args) {
    const opts = {
        templateId: 0,
        oldFieldId: 0,
        newFieldId: 0,
    };
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--templateId') {
            opts.templateId = Number(args[++i]);
        }
        else if (a === '--oldFieldId') {
            opts.oldFieldId = Number(args[++i]);
        }
        else if (a === '--newFieldId') {
            opts.newFieldId = Number(args[++i]);
        }
    }
    if (!opts.templateId)
        throw new Error('templateId is required');
    if (!opts.oldFieldId)
        throw new Error('oldFieldId is required');
    if (!opts.newFieldId)
        throw new Error('newFieldId is required');
    return opts;
}
// Example: copy value from a single-value field to a multi-value field
export function updateMultiField() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const opts = parseArgs(process.argv.slice(2));
        const config = loadConfig();
        const api = new ContactApi(config);
        console.log('Loading contacts...');
        const t0 = Date.now();
        const list = yield api.getContactList({
            getContactListRequest: {
                templateId: opts.templateId,
                fields: 'all',
                filters: [
                    {
                        type: null,
                        operator: 'notequal',
                        value: '',
                        field: opts.oldFieldId,
                    },
                ],
            },
        });
        const contacts = (_a = list.objects) !== null && _a !== void 0 ? _a : [];
        const loadTime = (Date.now() - t0) / 1000;
        console.log(`Loaded ${contacts.length} contacts in ${loadTime.toFixed(2)}s (${(contacts.length / loadTime).toFixed(2)} per sec)`);
        console.log('Updating contacts...');
        const total = contacts.length;
        const t1 = Date.now();
        let processed = 0;
        for (const c of contacts) {
            const value = (_c = (_b = c.customFields) === null || _b === void 0 ? void 0 : _b.find(cf => cf.id === opts.oldFieldId)) === null || _c === void 0 ? void 0 : _c.value;
            if (!value)
                continue;
            yield api.postContact({
                contactRequest: {
                    id: c.id,
                    customFields: [{ id: opts.newFieldId, value: [value] }],
                },
            });
            processed++;
            const elapsed = (Date.now() - t1) / 1000;
            const speed = processed / (elapsed || 1);
            console.log(`Updated ${processed}/${total} contacts (${speed.toFixed(2)} per sec)`);
        }
        const totalTime = (Date.now() - t1) / 1000;
        console.log(`Done in ${totalTime.toFixed(2)}s (${(processed / totalTime).toFixed(2)} per sec)`);
    });
}
if (require.main === module) {
    updateMultiField().catch(err => console.error(err));
}
