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
import type { FileResponse } from './FileResponse';
import {
    FileResponseFromJSON,
    FileResponseFromJSONTyped,
    FileResponseToJSON,
    FileResponseToJSONTyped,
} from './FileResponse';
import type { Recurrence } from './Recurrence';
import {
    RecurrenceFromJSON,
    RecurrenceFromJSONTyped,
    RecurrenceToJSON,
    RecurrenceToJSONTyped,
} from './Recurrence';
import type { PeopleResponse } from './PeopleResponse';
import {
    PeopleResponseFromJSON,
    PeopleResponseFromJSONTyped,
    PeopleResponseToJSON,
    PeopleResponseToJSONTyped,
} from './PeopleResponse';
import type { CustomFieldValueResponse } from './CustomFieldValueResponse';
import {
    CustomFieldValueResponseFromJSON,
    CustomFieldValueResponseFromJSONTyped,
    CustomFieldValueResponseToJSON,
    CustomFieldValueResponseToJSONTyped,
} from './CustomFieldValueResponse';
import type { BaseEntity } from './BaseEntity';
import {
    BaseEntityFromJSON,
    BaseEntityFromJSONTyped,
    BaseEntityToJSON,
    BaseEntityToJSONTyped,
} from './BaseEntity';
import type { TimePoint } from './TimePoint';
import {
    TimePointFromJSON,
    TimePointFromJSONTyped,
    TimePointToJSON,
    TimePointToJSONTyped,
} from './TimePoint';
import type { ContactResponseDataTagsInner } from './ContactResponseDataTagsInner';
import {
    ContactResponseDataTagsInnerFromJSON,
    ContactResponseDataTagsInnerFromJSONTyped,
    ContactResponseDataTagsInnerToJSON,
    ContactResponseDataTagsInnerToJSONTyped,
} from './ContactResponseDataTagsInner';
import type { TaskStatus } from './TaskStatus';
import {
    TaskStatusFromJSON,
    TaskStatusFromJSONTyped,
    TaskStatusToJSON,
    TaskStatusToJSONTyped,
} from './TaskStatus';
import type { PersonResponse } from './PersonResponse';
import {
    PersonResponseFromJSON,
    PersonResponseFromJSONTyped,
    PersonResponseToJSON,
    PersonResponseToJSONTyped,
} from './PersonResponse';

/**
 * 
 * @export
 * @interface TaskResponse
 */
export interface TaskResponse {
    /**
     * 
     * @type {number}
     * @memberof TaskResponse
     */
    id?: number;
    /**
     * 
     * @type {string}
     * @memberof TaskResponse
     */
    sourceObjectId?: string;
    /**
     * 
     * @type {string}
     * @memberof TaskResponse
     */
    sourceDataVersion?: string;
    /**
     * 
     * @type {string}
     * @memberof TaskResponse
     */
    name?: string;
    /**
     * 
     * @type {string}
     * @memberof TaskResponse
     */
    description?: string;
    /**
     * 
     * @type {string}
     * @memberof TaskResponse
     */
    priority?: TaskResponsePriorityEnum;
    /**
     * 
     * @type {TaskStatus}
     * @memberof TaskResponse
     */
    status?: TaskStatus;
    /**
     * 
     * @type {number}
     * @memberof TaskResponse
     */
    processId?: number;
    /**
     * 
     * @type {boolean}
     * @memberof TaskResponse
     */
    resultChecking?: boolean;
    /**
     * 
     * @type {string}
     * @memberof TaskResponse
     */
    type?: TaskResponseTypeEnum;
    /**
     * 
     * @type {PersonResponse}
     * @memberof TaskResponse
     */
    assigner?: PersonResponse;
    /**
     * 
     * @type {BaseEntity}
     * @memberof TaskResponse
     */
    parent?: BaseEntity;
    /**
     * 
     * @type {BaseEntity}
     * @memberof TaskResponse
     */
    template?: BaseEntity;
    /**
     * 
     * @type {BaseEntity}
     * @memberof TaskResponse
     */
    object?: BaseEntity;
    /**
     * 
     * @type {BaseEntity}
     * @memberof TaskResponse
     */
    project?: BaseEntity;
    /**
     * 
     * @type {PersonResponse}
     * @memberof TaskResponse
     */
    counterparty?: PersonResponse;
    /**
     * 
     * @type {TimePoint}
     * @memberof TaskResponse
     */
    dateTime?: TimePoint;
    /**
     * 
     * @type {TimePoint}
     * @memberof TaskResponse
     */
    startDateTime?: TimePoint;
    /**
     * 
     * @type {TimePoint}
     * @memberof TaskResponse
     */
    endDateTime?: TimePoint;
    /**
     * 
     * @type {boolean}
     * @memberof TaskResponse
     */
    hasStartDate?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof TaskResponse
     */
    hasEndDate?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof TaskResponse
     */
    hasStartTime?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof TaskResponse
     */
    hasEndTime?: boolean;
    /**
     * 
     * @type {TimePoint}
     * @memberof TaskResponse
     */
    delayedTillDate?: TimePoint;
    /**
     * 
     * @type {TimePoint}
     * @memberof TaskResponse
     */
    actualCompletionDate?: TimePoint;
    /**
     * 
     * @type {TimePoint}
     * @memberof TaskResponse
     */
    dateOfLastUpdate?: TimePoint;
    /**
     * 
     * @type {number}
     * @memberof TaskResponse
     */
    duration?: number;
    /**
     * 
     * @type {string}
     * @memberof TaskResponse
     */
    durationUnit?: TaskResponseDurationUnitEnum;
    /**
     * 
     * @type {string}
     * @memberof TaskResponse
     */
    durationType?: TaskResponseDurationTypeEnum;
    /**
     * 
     * @type {boolean}
     * @memberof TaskResponse
     */
    overdue?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof TaskResponse
     */
    closeToDeadLine?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof TaskResponse
     */
    notAcceptedInTime?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof TaskResponse
     */
    inFavorites?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof TaskResponse
     */
    isSummary?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof TaskResponse
     */
    isSequential?: boolean;
    /**
     * 
     * @type {PeopleResponse}
     * @memberof TaskResponse
     */
    assignees?: PeopleResponse;
    /**
     * 
     * @type {PeopleResponse}
     * @memberof TaskResponse
     */
    participants?: PeopleResponse;
    /**
     * 
     * @type {PeopleResponse}
     * @memberof TaskResponse
     */
    auditors?: PeopleResponse;
    /**
     * 
     * @type {Recurrence}
     * @memberof TaskResponse
     */
    recurrence?: Recurrence;
    /**
     * 
     * @type {boolean}
     * @memberof TaskResponse
     */
    isDeleted?: boolean;
    /**
     * 
     * @type {Array<CustomFieldValueResponse>}
     * @memberof TaskResponse
     */
    customFieldData?: Array<CustomFieldValueResponse>;
    /**
     * 
     * @type {Array<FileResponse>}
     * @memberof TaskResponse
     */
    files?: Array<FileResponse>;
    /**
     * 
     * @type {Array<ContactResponseDataTagsInner>}
     * @memberof TaskResponse
     */
    dataTags?: Array<ContactResponseDataTagsInner>;
}


/**
 * @export
 */
export const TaskResponsePriorityEnum = {
    NotUrgent: 'NotUrgent',
    Urgent: 'Urgent'
} as const;
export type TaskResponsePriorityEnum = typeof TaskResponsePriorityEnum[keyof typeof TaskResponsePriorityEnum];

/**
 * @export
 */
export const TaskResponseTypeEnum = {
    Task: 'Task',
    Template: 'Template',
    Checkmark: 'Checkmark'
} as const;
export type TaskResponseTypeEnum = typeof TaskResponseTypeEnum[keyof typeof TaskResponseTypeEnum];

/**
 * @export
 */
export const TaskResponseDurationUnitEnum = {
    Minute: 'Minute',
    Hour: 'Hour',
    Day: 'Day',
    Week: 'Week',
    Month: 'Month'
} as const;
export type TaskResponseDurationUnitEnum = typeof TaskResponseDurationUnitEnum[keyof typeof TaskResponseDurationUnitEnum];

/**
 * @export
 */
export const TaskResponseDurationTypeEnum = {
    CalendarDays: 'CalendarDays',
    WorkerDays: 'WorkerDays'
} as const;
export type TaskResponseDurationTypeEnum = typeof TaskResponseDurationTypeEnum[keyof typeof TaskResponseDurationTypeEnum];


/**
 * Check if a given object implements the TaskResponse interface.
 */
export function instanceOfTaskResponse(value: object): value is TaskResponse {
    return true;
}

export function TaskResponseFromJSON(json: any): TaskResponse {
    return TaskResponseFromJSONTyped(json, false);
}

export function TaskResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): TaskResponse {
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
        'status': json['status'] == null ? undefined : TaskStatusFromJSON(json['status']),
        'processId': json['processId'] == null ? undefined : json['processId'],
        'resultChecking': json['resultChecking'] == null ? undefined : json['resultChecking'],
        'type': json['type'] == null ? undefined : json['type'],
        'assigner': json['assigner'] == null ? undefined : PersonResponseFromJSON(json['assigner']),
        'parent': json['parent'] == null ? undefined : BaseEntityFromJSON(json['parent']),
        'template': json['template'] == null ? undefined : BaseEntityFromJSON(json['template']),
        'object': json['object'] == null ? undefined : BaseEntityFromJSON(json['object']),
        'project': json['project'] == null ? undefined : BaseEntityFromJSON(json['project']),
        'counterparty': json['counterparty'] == null ? undefined : PersonResponseFromJSON(json['counterparty']),
        'dateTime': json['dateTime'] == null ? undefined : TimePointFromJSON(json['dateTime']),
        'startDateTime': json['startDateTime'] == null ? undefined : TimePointFromJSON(json['startDateTime']),
        'endDateTime': json['endDateTime'] == null ? undefined : TimePointFromJSON(json['endDateTime']),
        'hasStartDate': json['hasStartDate'] == null ? undefined : json['hasStartDate'],
        'hasEndDate': json['hasEndDate'] == null ? undefined : json['hasEndDate'],
        'hasStartTime': json['hasStartTime'] == null ? undefined : json['hasStartTime'],
        'hasEndTime': json['hasEndTime'] == null ? undefined : json['hasEndTime'],
        'delayedTillDate': json['delayedTillDate'] == null ? undefined : TimePointFromJSON(json['delayedTillDate']),
        'actualCompletionDate': json['actualCompletionDate'] == null ? undefined : TimePointFromJSON(json['actualCompletionDate']),
        'dateOfLastUpdate': json['dateOfLastUpdate'] == null ? undefined : TimePointFromJSON(json['dateOfLastUpdate']),
        'duration': json['duration'] == null ? undefined : json['duration'],
        'durationUnit': json['durationUnit'] == null ? undefined : json['durationUnit'],
        'durationType': json['durationType'] == null ? undefined : json['durationType'],
        'overdue': json['overdue'] == null ? undefined : json['overdue'],
        'closeToDeadLine': json['closeToDeadLine'] == null ? undefined : json['closeToDeadLine'],
        'notAcceptedInTime': json['notAcceptedInTime'] == null ? undefined : json['notAcceptedInTime'],
        'inFavorites': json['inFavorites'] == null ? undefined : json['inFavorites'],
        'isSummary': json['isSummary'] == null ? undefined : json['isSummary'],
        'isSequential': json['isSequential'] == null ? undefined : json['isSequential'],
        'assignees': json['assignees'] == null ? undefined : PeopleResponseFromJSON(json['assignees']),
        'participants': json['participants'] == null ? undefined : PeopleResponseFromJSON(json['participants']),
        'auditors': json['auditors'] == null ? undefined : PeopleResponseFromJSON(json['auditors']),
        'recurrence': json['recurrence'] == null ? undefined : RecurrenceFromJSON(json['recurrence']),
        'isDeleted': json['isDeleted'] == null ? undefined : json['isDeleted'],
        'customFieldData': json['customFieldData'] == null ? undefined : ((json['customFieldData'] as Array<any>).map(CustomFieldValueResponseFromJSON)),
        'files': json['files'] == null ? undefined : ((json['files'] as Array<any>).map(FileResponseFromJSON)),
        'dataTags': json['dataTags'] == null ? undefined : ((json['dataTags'] as Array<any>).map(ContactResponseDataTagsInnerFromJSON)),
    };
}

export function TaskResponseToJSON(json: any): TaskResponse {
    return TaskResponseToJSONTyped(json, false);
}

export function TaskResponseToJSONTyped(value?: TaskResponse | null, ignoreDiscriminator: boolean = false): any {
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
        'status': TaskStatusToJSON(value['status']),
        'processId': value['processId'],
        'resultChecking': value['resultChecking'],
        'type': value['type'],
        'assigner': PersonResponseToJSON(value['assigner']),
        'parent': BaseEntityToJSON(value['parent']),
        'template': BaseEntityToJSON(value['template']),
        'object': BaseEntityToJSON(value['object']),
        'project': BaseEntityToJSON(value['project']),
        'counterparty': PersonResponseToJSON(value['counterparty']),
        'dateTime': TimePointToJSON(value['dateTime']),
        'startDateTime': TimePointToJSON(value['startDateTime']),
        'endDateTime': TimePointToJSON(value['endDateTime']),
        'hasStartDate': value['hasStartDate'],
        'hasEndDate': value['hasEndDate'],
        'hasStartTime': value['hasStartTime'],
        'hasEndTime': value['hasEndTime'],
        'delayedTillDate': TimePointToJSON(value['delayedTillDate']),
        'actualCompletionDate': TimePointToJSON(value['actualCompletionDate']),
        'dateOfLastUpdate': TimePointToJSON(value['dateOfLastUpdate']),
        'duration': value['duration'],
        'durationUnit': value['durationUnit'],
        'durationType': value['durationType'],
        'overdue': value['overdue'],
        'closeToDeadLine': value['closeToDeadLine'],
        'notAcceptedInTime': value['notAcceptedInTime'],
        'inFavorites': value['inFavorites'],
        'isSummary': value['isSummary'],
        'isSequential': value['isSequential'],
        'assignees': PeopleResponseToJSON(value['assignees']),
        'participants': PeopleResponseToJSON(value['participants']),
        'auditors': PeopleResponseToJSON(value['auditors']),
        'recurrence': RecurrenceToJSON(value['recurrence']),
        'isDeleted': value['isDeleted'],
        'customFieldData': value['customFieldData'] == null ? undefined : ((value['customFieldData'] as Array<any>).map(CustomFieldValueResponseToJSON)),
        'files': value['files'] == null ? undefined : ((value['files'] as Array<any>).map(FileResponseToJSON)),
        'dataTags': value['dataTags'] == null ? undefined : ((value['dataTags'] as Array<any>).map(ContactResponseDataTagsInnerToJSON)),
    };
}

