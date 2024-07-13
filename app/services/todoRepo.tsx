import { Schema } from '@effect/schema';
import { SqliteClient } from '@effect/sql-sqlite-node';
import { DbLive } from 'Db';
import { Effect, Layer } from 'effect';

export type Todo = {
  id: string;
  title: string;
  done: boolean;
};

export const TodoId = Schema.NonEmpty.pipe(
  Schema.pattern(/^\d+$/),
  Schema.brand('TodoId')
);
type TodoId = Schema.Schema.Type<typeof TodoId>;

const TodoSchema = Schema.Struct({
  id: TodoId,
  title: Schema.NonEmpty,
  done: Schema.Boolean,
});

const BooleanFromNumber = Schema.Number.pipe(
  Schema.transform(Schema.Boolean, {
    encode: (b) => (b ? 1 : 0),
    decode: globalThis.Boolean,
  })
);

const StringFromInt = Schema.Int.pipe(
  Schema.transform(Schema.NonEmpty, {
    encode: globalThis.Number,
    decode: globalThis.String,
  })
);

const DbTodoSchema = Schema.Struct({
  id: StringFromInt,
  title: Schema.NonEmpty,
  done: BooleanFromNumber,
}).pipe(Schema.compose(TodoSchema));

const make = Effect.gen(function* () {
  const sql = yield* SqliteClient.SqliteClient;

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

  const removeTodo = (id: TodoId) => sql`DELETE FROM tasks WHERE id = ${id};`;

  const getById = (id: TodoId) => sql`select from tasks WHERE id = ${id};`;

  const editTodo = (id: TodoId, data: Omit<Todo, 'id'>) =>
    sql`
    UPDATE tasks
    SET title = ${data.title}, done = ${data.done ? 1 : 0}
    WHERE id = ${id};
    `;

  const getAll = sql`select * from tasks`.pipe(
    Effect.flatMap(Schema.decodeUnknown(Schema.Array(DbTodoSchema)))
  );

  return { addTodo, removeTodo, editTodo, getAll, getById };
});

export class TodoRepo extends Effect.Tag('@services/TodoRepo')<
  TodoRepo,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.effect(
    this,
    make.pipe(Effect.provide(DbLive), Effect.orDie)
  );
}
