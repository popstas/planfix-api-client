/**
 * API instantiation and error formatting shared by example scripts.
 */

import {
  Configuration,
  ContactApi,
  CustomFieldsTaskApi,
  ObjectApi,
  TaskApi,
} from '../../src/generated';

/** Instantiate the commonly used *Api classes from one shared Configuration. */
export function buildApis(config: Configuration) {
  return {
    taskApi: new TaskApi(config),
    contactApi: new ContactApi(config),
    objectApi: new ObjectApi(config),
    cfTaskApi: new CustomFieldsTaskApi(config),
  };
}

export type Apis = ReturnType<typeof buildApis>;

/**
 * Format an API error including HTTP status and response body when available
 * (from fix-payments-empty-date.ts). The generated fetch client attaches the
 * Response to the thrown error.
 */
export async function formatApiError(error: unknown): Promise<string> {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const errAny = error as any;
  const status = errAny?.response?.status;
  const statusText = errAny?.response?.statusText;
  const responseData = errAny?.response?.data;
  let responseText = '';

  if (errAny?.response?.text && !errAny?.response?.bodyUsed) {
    try {
      responseText = await errAny.response.text();
    } catch {
      responseText = '';
    }
  }

  if (status != null || responseData != null) {
    const statusPart = status != null ? `status ${status}${statusText ? ` ${statusText}` : ''}` : '';
    let dataPart = '';

    if (typeof responseData === 'string') {
      dataPart = responseData;
    } else if (responseData != null) {
      try {
        dataPart = JSON.stringify(responseData);
      } catch {
        dataPart = String(responseData);
      }
    }

    return [error.message, statusPart, dataPart, responseText].filter(Boolean).join(' | ');
  }

  return [error.message, responseText].filter(Boolean).join(' | ');
}
