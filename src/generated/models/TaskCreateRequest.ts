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
import type { PersonRequest } from './PersonRequest';
import {
    PersonRequestFromJSON,
    PersonRequestFromJSONTyped,
    PersonRequestToJSON,
    PersonRequestToJSONTyped,
} from './PersonRequest';
import type { TimePoint } from './TimePoint';
import {
    TimePointFromJSON,
    TimePointFromJSONTyped,
    TimePointToJSON,
    TimePointToJSONTyped,
} from './TimePoint';

/**
 * 
 * @export
 * @interface TaskCreateRequest
 */
export interface TaskCreateRequest {
    /**
     * 
     * @type {number}
     * @memberof TaskCreateRequest
     */
    id?: number;
    /**
     * 
     * @type {string}
     * @memberof TaskCreateRequest
     */
    sourceObjectId?: string;
    /**
     * 
     * @type {string}
     * @memberof TaskCreateRequest
     */
    sourceDataVersion?: string;
    /**
     * 
     * @type {string}
     * @memberof TaskCreateRequest
     */
    name?: string;
    /**
     * 
     * @type {string}
     * @memberof TaskCreateRequest
     */
    description?: string;
    /**
     * 
     * @type {string}
     * @memberof TaskCreateRequest
     */
    priority?: TaskCreateRequestPriorityEnum;
    /**
     * 
     * @type {BaseEntity}
     * @memberof TaskCreateRequest
     */
    status?: BaseEntity;
    /**
     * 
     * @type {number}
     * @memberof TaskCreateRequest
     */
    processId?: number;
    /**
     * 
     * @type {boolean}
     * @memberof TaskCreateRequest
     */
    resultChecking?: boolean;
    /**
     * 
     * @type {PersonRequest}
     * @memberof TaskCreateRequest
     */
    assigner?: PersonRequest;
    /**
     * 
     * @type {BaseEntity}
     * @memberof TaskCreateRequest
     */
    parent?: BaseEntity;
    /**
     * 
     * @type {BaseEntity}
     * @memberof TaskCreateRequest
     */
    template?: BaseEntity;
    /**
     * 
     * @type {BaseEntity}
     * @memberof TaskCreateRequest
     */
    object?: BaseEntity;
    /**
     * 
     * @type {BaseEntity}
     * @memberof TaskCreateRequest
     */
    project?: BaseEntity;
    /**
     * 
     * @type {PersonRequest}
     * @memberof TaskCreateRequest
     */
    counterparty?: PersonRequest;
    /**
     * 
     * @type {TimePoint}
     * @memberof TaskCreateRequest
     */
    dateTime?: TimePoint;
    /**
     * 
     * @type {TimePoint}
     * @memberof TaskCreateRequest
     */
    startDateTime?: TimePoint;
    /**
     * 
     * @type {TimePoint}
     * @memberof TaskCreateRequest
     */
    endDateTime?: TimePoint;
    /**
     * 
     * @type {TimePoint}
     * @memberof TaskCreateRequest
     */
    delayedTillDate?: TimePoint;
    /**
     * 
     * @type {number}
     * @memberof TaskCreateRequest
     */
    duration?: number;
    /**
     * 
     * @type {string}
     * @memberof TaskCreateRequest
     */
    durationUnit?: TaskCreateRequestDurationUnitEnum;
    /**
     * 
     * @type {string}
     * @memberof TaskCreateRequest
     */
    durationType?: TaskCreateRequestDurationTypeEnum;
    /**
     * 
     * @type {boolean}
     * @memberof TaskCreateRequest
     */
    overdue?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof TaskCreateRequest
     */
    closeToDeadLine?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof TaskCreateRequest
     */
    notAcceptedInTime?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof TaskCreateRequest
     */
    inFavorites?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof TaskCreateRequest
     */
    isSummary?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof TaskCreateRequest
     */
    isSequential?: boolean;
    /**
     * 
     * @type {PeopleRequest}
     * @memberof TaskCreateRequest
     */
    assignees?: PeopleRequest;
    /**
     * 
     * @type {PeopleRequest}
     * @memberof TaskCreateRequest
     */
    participants?: PeopleRequest;
    /**
     * 
     * @type {PeopleRequest}
     * @memberof TaskCreateRequest
     */
    auditors?: PeopleRequest;
    /**
     * 
     * @type {boolean}
     * @memberof TaskCreateRequest
     */
    isDeleted?: boolean;
    /**
     * 
     * @type {Array<CustomFieldValueRequest>}
     * @memberof TaskCreateRequest
     */
    customFieldData?: Array<CustomFieldValueRequest>;
    /**
     * 
     * @type {Array<FileRequest>}
     * @memberof TaskCreateRequest
     */
    files?: Array<FileRequest>;
}


/**
 * @export
 */
export const TaskCreateRequestPriorityEnum = {
    NotUrgent: 'NotUrgent',
    Urgent: 'Urgent'
} as const;
export type TaskCreateRequestPriorityEnum = typeof TaskCreateRequestPriorityEnum[keyof typeof TaskCreateRequestPriorityEnum];

/**
 * @export
 */
export const TaskCreateRequestDurationUnitEnum = {
    Minute: 'Minute',
    Hour: 'Hour',
    Day: 'Day',
    Week: 'Week',
    Month: 'Month'
} as const;
export type TaskCreateRequestDurationUnitEnum = typeof TaskCreateRequestDurationUnitEnum[keyof typeof TaskCreateRequestDurationUnitEnum];

/**
 * @export
 */
export const TaskCreateRequestDurationTypeEnum = {
    CalendarDays: 'CalendarDays',
    WorkerDays: 'WorkerDays'
} as const;
export type TaskCreateRequestDurationTypeEnum = typeof TaskCreateRequestDurationTypeEnum[keyof typeof TaskCreateRequestDurationTypeEnum];


/**
 * Check if a given object implements the TaskCreateRequest interface.
 */
export function instanceOfTaskCreateRequest(value: object): value is TaskCreateRequest {
    return true;
}

export function TaskCreateRequestFromJSON(json: any): TaskCreateRequest {
    return TaskCreateRequestFromJSONTyped(json, false);
}

export function TaskCreateRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): TaskCreateRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'] == null ? undefined : json['id'],
        'sourceObjectId': json['sourceObjectId'] == null ? undefined : json['sourceObjectId'],
        'sourceDataVersion': json['sourceDataVersion'] == null ? undefined : json['sourceDataVersion'],
        'name': json['name'] == null ? undefined : json['name'],
        'description': json['description'] == null ? undefined : json['description'],
        'priority': json['priority'] == null ? undefined : json['priority'],
        'status': json['status'] == null ? undefined : BaseEntityFromJSON(json['status']),
        'processId': json['processId'] == null ? undefined : json['processId'],
        'resultChecking': json['resultChecking'] == null ? undefined : json['resultChecking'],
        'assigner': json['assigner'] == null ? undefined : PersonRequestFromJSON(json['assigner']),
        'parent': json['parent'] == null ? undefined : BaseEntityFromJSON(json['parent']),
        'template': json['template'] == null ? undefined : BaseEntityFromJSON(json['template']),
        'object': json['object'] == null ? undefined : BaseEntityFromJSON(json['object']),
        'project': json['project'] == null ? undefined : BaseEntityFromJSON(json['project']),
        'counterparty': json['counterparty'] == null ? undefined : PersonRequestFromJSON(json['counterparty']),
        'dateTime': json['dateTime'] == null ? undefined : TimePointFromJSON(json['dateTime']),
        'startDateTime': json['startDateTime'] == null ? undefined : TimePointFromJSON(json['startDateTime']),
        'endDateTime': json['endDateTime'] == null ? undefined : TimePointFromJSON(json['endDateTime']),
        'delayedTillDate': json['delayedTillDate'] == null ? undefined : TimePointFromJSON(json['delayedTillDate']),
        'duration': json['duration'] == null ? undefined : json['duration'],
        'durationUnit': json['durationUnit'] == null ? undefined : json['durationUnit'],
        'durationType': json['durationType'] == null ? undefined : json['durationType'],
        'overdue': json['overdue'] == null ? undefined : json['overdue'],
        'closeToDeadLine': json['closeToDeadLine'] == null ? undefined : json['closeToDeadLine'],
        'notAcceptedInTime': json['notAcceptedInTime'] == null ? undefined : json['notAcceptedInTime'],
        'inFavorites': json['inFavorites'] == null ? undefined : json['inFavorites'],
        'isSummary': json['isSummary'] == null ? undefined : json['isSummary'],
        'isSequential': json['isSequential'] == null ? undefined : json['isSequential'],
        'assignees': json['assignees'] == null ? undefined : PeopleRequestFromJSON(json['assignees']),
        'participants': json['participants'] == null ? undefined : PeopleRequestFromJSON(json['participants']),
        'auditors': json['auditors'] == null ? undefined : PeopleRequestFromJSON(json['auditors']),
        'isDeleted': json['isDeleted'] == null ? undefined : json['isDeleted'],
        'customFieldData': json['customFieldData'] == null ? undefined : ((json['customFieldData'] as Array<any>).map(CustomFieldValueRequestFromJSON)),
        'files': json['files'] == null ? undefined : ((json['files'] as Array<any>).map(FileRequestFromJSON)),
    };
}

export function TaskCreateRequestToJSON(json: any): TaskCreateRequest {
    return TaskCreateRequestToJSONTyped(json, false);
}

export function TaskCreateRequestToJSONTyped(value?: TaskCreateRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'id': value['id'],
        'sourceObjectId': value['sourceObjectId'],
        'sourceDataVersion': value['sourceDataVersion'],
        'name': value['name'],
        'description': value['description'],
        'priority': value['priority'],
        'status': BaseEntityToJSON(value['status']),
        'processId': value['processId'],
        'resultChecking': value['resultChecking'],
        'assigner': PersonRequestToJSON(value['assigner']),
        'parent': BaseEntityToJSON(value['parent']),
        'template': BaseEntityToJSON(value['template']),
        'object': BaseEntityToJSON(value['object']),
        'project': BaseEntityToJSON(value['project']),
        'counterparty': PersonRequestToJSON(value['counterparty']),
        'dateTime': TimePointToJSON(value['dateTime']),
        'startDateTime': TimePointToJSON(value['startDateTime']),
        'endDateTime': TimePointToJSON(value['endDateTime']),
        'delayedTillDate': TimePointToJSON(value['delayedTillDate']),
        'duration': value['duration'],
        'durationUnit': value['durationUnit'],
        'durationType': value['durationType'],
        'overdue': value['overdue'],
        'closeToDeadLine': value['closeToDeadLine'],
        'notAcceptedInTime': value['notAcceptedInTime'],
        'inFavorites': value['inFavorites'],
        'isSummary': value['isSummary'],
        'isSequential': value['isSequential'],
        'assignees': PeopleRequestToJSON(value['assignees']),
        'participants': PeopleRequestToJSON(value['participants']),
        'auditors': PeopleRequestToJSON(value['auditors']),
        'isDeleted': value['isDeleted'],
        'customFieldData': value['customFieldData'] == null ? undefined : ((value['customFieldData'] as Array<any>).map(CustomFieldValueRequestToJSON)),
        'files': value['files'] == null ? undefined : ((value['files'] as Array<any>).map(FileRequestToJSON)),
    };
}

