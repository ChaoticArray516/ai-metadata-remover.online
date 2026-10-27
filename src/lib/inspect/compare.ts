import type { SegmentAction, SegmentGroup } from '../strip/common';

export interface DiffRow {
  group: SegmentGroup;
  name: string;
  before: number;
  after: number;
  status: 'removed' | 'kept' | 'remaining';
  note?: string;
}

export interface FieldDiff {
  rows: DiffRow[];
  remaining: number;
  leftUntouched: number;
}

function key(action: SegmentAction): string {
  return `${action.group}::${action.name}`;
}

export function buildDiff(before: SegmentAction[], after: SegmentAction[]): FieldDiff {
  const afterMap = new Map(after.map((action) => [key(action), action]));
  const rows: DiffRow[] = [];
  let remaining = 0;
  let leftUntouched = 0;

  for (const action of before) {
    const stillThere = afterMap.get(key(action));
    if (action.disposition === 'removed') {
      if (stillThere) {
        remaining++;
        rows.push({
          group: action.group,
          name: action.name,
          before: action.count,
          after: stillThere.count,
          status: 'remaining',
          note: 'could not remove',
        });
      } else {
        rows.push({
          group: action.group,
          name: action.name,
          before: action.count,
          after: 0,
          status: 'removed',
          note: action.note,
        });
      }
    } else {
      if (action.disposition === 'left untouched (not inspected)') leftUntouched++;
      rows.push({
        group: action.group,
        name: action.name,
        before: action.count,
        after: stillThere?.count ?? action.count,
        status: 'kept',
        note: action.note ?? action.disposition,
      });
    }
    afterMap.delete(key(action));
  }

  for (const action of afterMap.values()) {
    if (action.disposition === 'removed') {
      remaining++;
      rows.push({
        group: action.group,
        name: action.name,
        before: 0,
        after: action.count,
        status: 'remaining',
        note: 'could not remove',
      });
    }
  }
  return { rows, remaining, leftUntouched };
}
