import type { TaskPriority } from "@praxios/core";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import type { Task } from "@praxios/core";

const priorities: TaskPriority[] = ["Low", "Normal", "High", "Urgent"];

interface TaskListProps {
  onTaskDeleted?: (taskId: string) => void;
}

export function TaskList({ onTaskDeleted }: TaskListProps) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("Normal");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  async function loadTasks() {
    const result = await api.listTasks();
    setTasks(result.tasks);
  }

  useEffect(() => {
    loadTasks().catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load tasks");
    });
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const result = await api.createTask({
        title,
        description,
        priority,
        dueDate: dueDate || null,
        completionCriteria: "完了条件を確定する。"
      });
      navigate(`/tasks/${result.task.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create task");
    }
  }

  async function onDeleteTask(task: Task) {
    const confirmed = window.confirm(`Delete task "${task.title}"?`);
    if (!confirmed) return;

    setError(null);
    setDeletingTaskId(task.id);

    try {
      await api.deleteTask(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      onTaskDeleted?.(task.id);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete task");
    } finally {
      setDeletingTaskId(null);
    }
  }

  return (
    <section className="screen">
      <header className="screenHeader">
        <div>
          <p className="eyebrow">Task List</p>
          <h1>Tasks</h1>
        </div>
        <button className="iconButton" type="button" onClick={() => void loadTasks()}>
          <RefreshCw aria-hidden="true" size={18} />
        </button>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="twoColumn">
        <form className="panel formPanel" onSubmit={(event) => void onSubmit(event)}>
          <h2>New Task</h2>
          <label>
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label>
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
            />
          </label>
          <div className="inlineFields">
            <label>
              <span>Priority</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
              >
                {priorities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Due</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>
          <button className="primaryButton" type="submit">
            <Plus aria-hidden="true" size={18} />
            <span>Create</span>
          </button>
        </form>

        <div className="panel tablePanel">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <Link to={`/tasks/${task.id}`}>{task.title}</Link>
                  </td>
                  <td>{task.status}</td>
                  <td>{task.priority}</td>
                  <td>{task.dueDate ?? "-"}</td>
                  <td>{new Date(task.updatedAt).toLocaleString()}</td>
                  <td>
                    <button
                      aria-label={`Delete ${task.title}`}
                      className="iconButton danger"
                      disabled={deletingTaskId === task.id}
                      onClick={() => void onDeleteTask(task)}
                      title="Delete task"
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6}>No tasks</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
