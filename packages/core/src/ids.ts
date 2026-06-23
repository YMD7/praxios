export const ID_PREFIX_BY_RECORD_TYPE = {
  source: "src_",
  knowledge: "know_",
  task: "task_",
  artifact: "artifact_",
  review: "review_",
  event: "event_",
} as const;

export type RecordTypeWithId = keyof typeof ID_PREFIX_BY_RECORD_TYPE;
export type IdPrefix = (typeof ID_PREFIX_BY_RECORD_TYPE)[RecordTypeWithId];

export const RECORD_TYPE_BY_ID_PREFIX = Object.fromEntries(
  Object.entries(ID_PREFIX_BY_RECORD_TYPE).map(([recordType, prefix]) => [prefix, recordType]),
) as Record<IdPrefix, RecordTypeWithId>;

export function getIdPrefixForRecordType(recordType: RecordTypeWithId): IdPrefix {
  return ID_PREFIX_BY_RECORD_TYPE[recordType];
}

export function getRecordTypeForIdPrefix(prefix: IdPrefix): RecordTypeWithId {
  return RECORD_TYPE_BY_ID_PREFIX[prefix];
}
