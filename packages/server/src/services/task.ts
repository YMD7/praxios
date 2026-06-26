import { eq, like, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tasks } from '../db/schema.js';
import type {
  CreateTask,
  Task,
  UpdateTask,
  TaskFilter,
} from '@praxios/shared';

function toTask(row: typeof tasks.$inferSelect): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    priority: row.priority ?? 'medium',
    dueDate: row.dueDate?.toISOString() ?? null,
    triggerId: row.triggerId ?? null,
    completionCriteria: row.completionCriteria ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listTasks(filter: TaskFilter): Promise<Task[]> {
  const conditions = [];
  if (filter.status) {
    conditions.push(eq(tasks.status, filter.status));
  }
  if (filter.priority) {
    conditions.push(eq(tasks.priority, filter.priority));
  }
  if (filter.search) {
    conditions.push(like(tasks.title, `%${filter.search}%`));
  }

  const rows = await db
    .select()
    .from(tasks)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(tasks.updatedAt));

  return rows.map(toTask);
}

export async function getTask(id: string): Promise<Task | null> {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return row ? toTask(row) : null;
}

export async function createTask(input: CreateTask): Promise<Task> {
  const now = new Date();
  const id = crypto.randomUUID();

  await db.insert(tasks).values({
    id,
    title: input.title,
    description: input.description,
    status: input.status ?? 'new',
    priority: input.priority ?? 'medium',
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    triggerId: input.triggerId,
    completionCriteria: input.completionCriteria,
    createdAt: now,
    updatedAt: now,
  });

  const task = await getTask(id);
  if (!task) throw new Error('Failed to create task');
  return task;
}

export async function updateTask(id: string, input: UpdateTask): Promise<Task> {
  const now = new Date();

  await db
    .update(tasks)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.dueDate !== undefined && {
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      }),
      ...(input.triggerId !== undefined && { triggerId: input.triggerId }),
      ...(input.completionCriteria !== undefined && {
        completionCriteria: input.completionCriteria,
      }),
      updatedAt: now,
    })
    .where(eq(tasks.id, id));

  const task = await getTask(id);
  if (!task) throw new Error('Task not found');
  return task;
}

export async function deleteTask(id: string): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, id));
}
