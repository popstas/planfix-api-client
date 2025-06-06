/* tslint:disable */
/* eslint-disable */
/**
 * Planfix REST API
 * Documentation for Planfix REST API. <br> Generated <a href=\"https://root/restapidocs/swagger.json\">swagger.json</a>
 *
 * The version of the OpenAPI document: 1.3.3
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
import type { PeopleRequest } from './PeopleRequest';
import {
    PeopleRequestFromJSON,
    PeopleRequestFromJSONTyped,
    PeopleRequestToJSON,
    PeopleRequestToJSONTyped,
} from './PeopleRequest';
import type { FileRequest } from './FileRequest';
import {
    FileRequestFromJSON,
    FileRequestFromJSONTyped,
    FileRequestToJSON,
    FileRequestToJSONTyped,
} from './FileRequest';
import type { GroupRequest } from './GroupRequest';
import {
    GroupRequestFromJSON,
    GroupRequestFromJSONTyped,
    GroupRequestToJSON,
    GroupRequestToJSONTyped,
} from './GroupRequest';
import type { BaseEntity } from './BaseEntity';
import {
    BaseEntityFromJSON,
    BaseEntityFromJSONTyped,
    BaseEntityToJSON,
    BaseEntityToJSONTyped,
} from './BaseEntity';
import type { CustomFieldValueRequest } from './CustomFieldValueRequest';
import {
    CustomFieldValueRequestFromJSON,
    CustomFieldValueRequestFromJSONTyped,
    CustomFieldValueRequestToJSON,
    CustomFieldValueRequestToJSONTyped,
} from './CustomFieldValueRequest';
import type { ContactRequestBirthDate } from './ContactRequestBirthDate';
import {
    ContactRequestBirthDateFromJSON,
    ContactRequestBirthDateFromJSONTyped,
    ContactRequestBirthDateToJSON,
    ContactRequestBirthDateToJSONTyped,
} from './ContactRequestBirthDate';
import type { PhoneRequest } from './PhoneRequest';
import {
    PhoneRequestFromJSON,
    PhoneRequestFromJSONTyped,
    PhoneRequestToJSON,
    PhoneRequestToJSONTyped,
} from './PhoneRequest';

/**
 * 
 * @export
 * @interface ContactRequest
 */
export interface ContactRequest {
    /**
     * 
     * @type {number}
     * @memberof ContactRequest
     */
    id?: number;
    /**
     * 
     * @type {BaseEntity}
     * @memberof ContactRequest
     */
    template?: BaseEntity;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    sourceObjectId?: string;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    sourceDataVersion?: string;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    name?: string;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    midname?: string;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    lastname?: string;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    gender?: ContactRequestGenderEnum;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    description?: string;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    address?: string;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    site?: string;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    email?: string;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    skype?: string;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    telegramId?: string;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    telegram?: string;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    facebook?: string;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    instagram?: string;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    vk?: string;
    /**
     * 
     * @type {string}
     * @memberof ContactRequest
     */
    position?: string;
    /**
     * 
     * @type {GroupRequest}
     * @memberof ContactRequest
     */
    group?: GroupRequest;
    /**
     * 
     * @type {boolean}
     * @memberof ContactRequest
     */
    isCompany?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ContactRequest
     */
    isDeleted?: boolean;
    /**
     * 
     * @type {ContactRequestBirthDate}
     * @memberof ContactRequest
     */
    birthDate?: ContactRequestBirthDate | null;
    /**
     * 
     * @type {PeopleRequest}
     * @memberof ContactRequest
     */
    supervisors?: PeopleRequest;
    /**
     * 
     * @type {Array<PhoneRequest>}
     * @memberof ContactRequest
     */
    phones?: Array<PhoneRequest>;
    /**
     * 
     * @type {Array<BaseEntity>}
     * @memberof ContactRequest
     */
    companies?: Array<BaseEntity>;
    /**
     * 
     * @type {Array<BaseEntity>}
     * @memberof ContactRequest
     */
    contacts?: Array<BaseEntity>;
    /**
     * 
     * @type {Array<CustomFieldValueRequest>}
     * @memberof ContactRequest
     */
    customFieldData?: Array<CustomFieldValueRequest>;
    /**
     * 
     * @type {Array<FileRequest>}
     * @memberof ContactRequest
     */
    files?: Array<FileRequest>;
}


/**
 * @export
 */
export const ContactRequestGenderEnum = {
    NotDefined: 'NotDefined',
    Female: 'Female',
    Male: 'Male'
} as const;
export type ContactRequestGenderEnum = typeof ContactRequestGenderEnum[keyof typeof ContactRequestGenderEnum];


/**
 * Check if a given object implements the ContactRequest interface.
 */
export function instanceOfContactRequest(value: object): value is ContactRequest {
    return true;
}

export function ContactRequestFromJSON(json: any): ContactRequest {
    return ContactRequestFromJSONTyped(json, false);
}

export function ContactRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): ContactRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'] == null ? undefined : json['id'],
        'template': json['template'] == null ? undefined : BaseEntityFromJSON(json['template']),
        'sourceObjectId': json['sourceObjectId'] == null ? undefined : json['sourceObjectId'],
        'sourceDataVersion': json['sourceDataVersion'] == null ? undefined : json['sourceDataVersion'],
        'name': json['name'] == null ? undefined : json['name'],
        'midname': json['midname'] == null ? undefined : json['midname'],
        'lastname': json['lastname'] == null ? undefined : json['lastname'],
        'gender': json['gender'] == null ? undefined : json['gender'],
        'description': json['description'] == null ? undefined : json['description'],
        'address': json['address'] == null ? undefined : json['address'],
        'site': json['site'] == null ? undefined : json['site'],
        'email': json['email'] == null ? undefined : json['email'],
        'skype': json['skype'] == null ? undefined : json['skype'],
        'telegramId': json['telegramId'] == null ? undefined : json['telegramId'],
        'telegram': json['telegram'] == null ? undefined : json['telegram'],
        'facebook': json['facebook'] == null ? undefined : json['facebook'],
        'instagram': json['instagram'] == null ? undefined : json['instagram'],
        'vk': json['vk'] == null ? undefined : json['vk'],
        'position': json['position'] == null ? undefined : json['position'],
        'group': json['group'] == null ? undefined : GroupRequestFromJSON(json['group']),
        'isCompany': json['isCompany'] == null ? undefined : json['isCompany'],
        'isDeleted': json['isDeleted'] == null ? undefined : json['isDeleted'],
        'birthDate': json['birthDate'] == null ? undefined : ContactRequestBirthDateFromJSON(json['birthDate']),
        'supervisors': json['supervisors'] == null ? undefined : PeopleRequestFromJSON(json['supervisors']),
        'phones': json['phones'] == null ? undefined : ((json['phones'] as Array<any>).map(PhoneRequestFromJSON)),
        'companies': json['companies'] == null ? undefined : ((json['companies'] as Array<any>).map(BaseEntityFromJSON)),
        'contacts': json['contacts'] == null ? undefined : ((json['contacts'] as Array<any>).map(BaseEntityFromJSON)),
        'customFieldData': json['customFieldData'] == null ? undefined : ((json['customFieldData'] as Array<any>).map(CustomFieldValueRequestFromJSON)),
        'files': json['files'] == null ? undefined : ((json['files'] as Array<any>).map(FileRequestFromJSON)),
    };
}

export function ContactRequestToJSON(json: any): ContactRequest {
    return ContactRequestToJSONTyped(json, false);
}

export function ContactRequestToJSONTyped(value?: ContactRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'id': value['id'],
        'template': BaseEntityToJSON(value['template']),
        'sourceObjectId': value['sourceObjectId'],
        'sourceDataVersion': value['sourceDataVersion'],
        'name': value['name'],
        'midname': value['midname'],
        'lastname': value['lastname'],
        'gender': value['gender'],
        'description': value['description'],
        'address': value['address'],
        'site': value['site'],
        'email': value['email'],
        'skype': value['skype'],
        'telegramId': value['telegramId'],
        'telegram': value['telegram'],
        'facebook': value['facebook'],
        'instagram': value['instagram'],
        'vk': value['vk'],
        'position': value['position'],
        'group': GroupRequestToJSON(value['group']),
        'isCompany': value['isCompany'],
        'isDeleted': value['isDeleted'],
        'birthDate': ContactRequestBirthDateToJSON(value['birthDate']),
        'supervisors': PeopleRequestToJSON(value['supervisors']),
        'phones': value['phones'] == null ? undefined : ((value['phones'] as Array<any>).map(PhoneRequestToJSON)),
        'companies': value['companies'] == null ? undefined : ((value['companies'] as Array<any>).map(BaseEntityToJSON)),
        'contacts': value['contacts'] == null ? undefined : ((value['contacts'] as Array<any>).map(BaseEntityToJSON)),
        'customFieldData': value['customFieldData'] == null ? undefined : ((value['customFieldData'] as Array<any>).map(CustomFieldValueRequestToJSON)),
        'files': value['files'] == null ? undefined : ((value['files'] as Array<any>).map(FileRequestToJSON)),
    };
}

