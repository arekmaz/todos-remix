import { HttpServerRequest } from '@effect/platform';
import { Schema } from '@effect/schema';
import type { MetaFunction } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { Effect } from 'effect';
import { makeAction, makeLoader } from '~/remix-effect';
import { todoRepo } from '~/services/todoRepo';

export const meta: MetaFunction = () => {
  return [
    { title: 'New Remix App' },
    { name: 'description', content: 'Welcome to Remix!' },
  ];
};

export const loader = makeLoader(
  Effect.gen(function* () {
    yield* Effect.logDebug('init / loader');

    return Effect.gen(function* () {
      return { todos: yield* todoRepo.getAll() };
    }).pipe(Effect.withSpan('/ loader'));
  })
);

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="font-sans p-4">
      <ul>
        {data.todos.map((todo) => (
          <Form key={todo.id} className="flex gap-2" method="post">
            <input type="checkbox" name="done" defaultChecked={todo.done} />
            <input name="title" defaultValue={todo.title} />
            <input type="hidden" name="id" value={todo.id} />
            <button type="submit">Save</button>
          </Form>
        ))}
      </ul>
    </div>
  );
}

const CheckboxSchema = Schema.optional(
  Schema.Literal('on').pipe(
    Schema.transform(Schema.Boolean, {
      encode: () => 'on' as const,
      decode: () => true,
      strict: true,
    })
  ),
  { default: () => false }
);

export const action = makeAction(
  Effect.gen(function* () {
    yield* Effect.logDebug('init / action');

    return Effect.gen(function* () {
      const { id, ...data } = yield* HttpServerRequest.HttpServerRequest.pipe(
        Effect.flatMap((r) => r.text),
        Effect.map((t) => Object.fromEntries(new URLSearchParams(t).entries())),
        Effect.tap((parsed) => Effect.log(JSON.stringify(parsed))),
        Effect.flatMap(
          Schema.decodeUnknown(
            Schema.Struct({
              id: Schema.NonEmpty,
              title: Schema.NonEmpty,
              done: CheckboxSchema,
            })
          )
        )
      );

      yield* todoRepo.editTodo(id, data);

      return { todos: yield* todoRepo.getAll() };
    }).pipe(Effect.withSpan('/ action'));
  })
);
