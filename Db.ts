import { SqliteClient } from '@effect/sql-sqlite-node';
import { Config } from 'effect';

export const DbLive = SqliteClient.layer({
  filename: Config.succeed('todos.db'),
});
