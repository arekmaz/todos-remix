import { HttpServerRequest } from '@effect/platform';
import { Schema } from '@effect/schema';
import type { MetaFunction } from '@remix-run/node';
import { Form, redirect, useLoaderData } from '@remix-run/react';
import { Effect } from 'effect';
import { makeAction, makeLoader } from '~/remix-effect';
import { TodoRepo } from '~/services/todoRepo';
import { Trash2Icon } from 'lucide-react';

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
      return { todos: yield* TodoRepo.getAll };
    }).pipe(Effect.withSpan('/ loader'));
  })
);

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="font-sans p-4">
      <Form method="post">
        <label>
          New todo title
          <input name="title" key={data.todos.length} />
        </label>
        <input type="hidden" name="_tag" value="CreateTodo" />
        <button type="submit">Add</button>
      </Form>

      <ul>
        {data.todos.map((todo) => (
          <div key={todo.id} className="flex gap-5 border p-2 items-center">
            <Form method="post" className="flex gap-5">
              <input type="checkbox" name="done" defaultChecked={todo.done} />
              <input name="title" defaultValue={todo.title} />
              <input type="hidden" name="id" value={todo.id} />
              <input type="hidden" name="_tag" value="UpdateTodo" />
              <button type="submit">Save</button>
            </Form>
            <Form method="post">
              <input type="hidden" name="id" value={todo.id} />
              <input type="hidden" name="_tag" value="RemoveTodo" />
              <button type="submit" className="text-red-500">
                <Trash2Icon />
              </button>
            </Form>
          </div>
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

    const OperationSchema = Schema.Union(
      Schema.Struct({
        _tag: Schema.tag('UpdateTodo'),
        id: Schema.NonEmpty,
        title: Schema.NonEmpty,
        done: CheckboxSchema,
      }),
      Schema.Struct({
        _tag: Schema.tag('CreateTodo'),
        title: Schema.NonEmpty,
      }),
      Schema.Struct({
        _tag: Schema.tag('RemoveTodo'),
        id: Schema.NonEmpty,
      })
    );

    return Effect.gen(function* () {
      const opData = yield* HttpServerRequest.HttpServerRequest.pipe(
        Effect.flatMap((r) => r.text),
        Effect.map((t) => Object.fromEntries(new URLSearchParams(t).entries())),
        Effect.tap((parsed) => Effect.log(JSON.stringify(parsed))),
        Effect.flatMap(Schema.decodeUnknown(OperationSchema))
      );

      if (opData._tag === 'UpdateTodo') {
        const { id, ...data } = opData;
        yield* TodoRepo.editTodo(id, data);
      }

      if (opData._tag === 'CreateTodo') {
        const { title } = opData;
        yield* TodoRepo.addTodo({ title, done: false });
      }

      if (opData._tag === 'RemoveTodo') {
        yield* TodoRepo.removeTodo(opData.id);
      }

      return redirect('/');
    }).pipe(Effect.withSpan('/ action'));
  })
);
