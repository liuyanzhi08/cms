import { db } from '../../config';

const userTable = `${db.prefix}_user`;

exports.up = knex => knex.schema.createTable(userTable, (table) => {
  table.increments();
  table.string('username').unique().notNullable();
  table.string('password').notNullable();
  table.timestamp('created_at').defaultTo(knex.fn.now());
});

exports.down = knex => knex.schema.dropTable(userTable);
