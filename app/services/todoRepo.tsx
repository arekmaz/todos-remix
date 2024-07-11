import { SqliteClient } from '@effect/sql-sqlite-node';
import { Effect, Layer } from 'effect';

export type Todo = {
  id: string;
  title: string;
  done: boolean;
};

const make = Effect.gen(function* () {
  const sql = yield* SqliteClient.make({
    filename: 'todos.db',
  });

  yield* sql`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    done BOOLEAN NOT NULL
  );`;

  const addTodo = (todo: Omit<Todo, 'id'>) =>
    sql`INSERT INTO tasks (title, done) VALUES (${todo.title}, ${
      todo.done ? 1 : 0
    });`;

  const removeTodo = (id: string) => sql`DELETE FROM tasks WHERE id = ${id};`;

  const editTodo = (id: string, data: Omit<Todo, 'id'>) =>
    sql`
    UPDATE tasks
    SET title = ${data.title}, done = ${data.done ? 1 : 0}
    WHERE id = ${id};
    `;

  const getAll = sql`select * from tasks`.pipe(
    Effect.map((t) => {
      console.log({ t });
      return t as Todo[];
    })
  );

  return { addTodo, removeTodo, editTodo, getAll };
});

export class TodoRepo extends Effect.Tag('@services/TodoRepo')<
  TodoRepo,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.effect(this, make);
}
