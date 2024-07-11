import { Effect } from 'effect';
import { nanoid } from 'nanoid';

export type Todo = {
  id: string;
  title: string;
  done: boolean;
};

export const todoRepo = (() => {
  let db: Todo[] = [
    {
      done: false,
      title: 'todo 1',
      id: nanoid(),
    },
  ];

  const addTodo = (todo: Omit<Todo, 'id'>) =>
    Effect.sync(() => db.push({ ...todo, id: nanoid() }));

  const removeTodo = (id: string) =>
    Effect.sync(() => {
      db = db.filter((t) => t.id !== id);
    });

  const editTodo = (id: string, data: Omit<Todo, 'id'>) =>
    Effect.sync(() => {
      db = db.map((t) => (t.id !== id ? t : { ...t, ...data }));
    });

  const getAll = () => Effect.succeed(db);

  return { addTodo, removeTodo, editTodo, getAll };
})();
