import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('matches', (table) => {
    table.increments('id').primary();
    table.string('code').unique().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('players', (table) => {
    table.increments('id').primary();
    table.string('nickname').notNullable();
    table.integer('score').defaultTo(0);
    table.integer('match_id').references('id').inTable('matches').onDelete('CASCADE');
    table.string('socket_id').nullable();
    table.boolean('is_ready').defaultTo(false);
    table.timestamp('joined_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('quizzes', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description').nullable();
    table.integer('time_per_question').defaultTo(30); // secondi per domanda
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('questions', (table) => {
    table.increments('id').primary();
    table.integer('quiz_id').references('id').inTable('quizzes').onDelete('CASCADE');
    table.text('question_text').notNullable();
    table.enum('question_type', ['true_false', 'multiple_choice']).notNullable();
    table.integer('order').notNullable(); // ordine della domanda nel quiz
    table.integer('points').defaultTo(10);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('answers', (table) => {
    table.increments('id').primary();
    table.integer('question_id').references('id').inTable('questions').onDelete('CASCADE');
    table.text('answer_text').notNullable();
    table.boolean('is_correct').defaultTo(false);
    table.integer('order').notNullable(); // ordine della risposta (A, B, C, D)
  });

  await knex.schema.createTable('match_questions', (table) => {
    table.increments('id').primary();
    table.integer('match_id').references('id').inTable('matches').onDelete('CASCADE');
    table.integer('question_id').references('id').inTable('questions').onDelete('CASCADE');
    table.integer('current_question_order').defaultTo(1);
    table.timestamp('question_started_at').nullable();
    table.boolean('is_completed').defaultTo(false);
  });

  await knex.schema.createTable('player_answers', (table) => {
    table.increments('id').primary();
    table.integer('player_id').references('id').inTable('players').onDelete('CASCADE');
    table.integer('question_id').references('id').inTable('questions').onDelete('CASCADE');
    table.integer('answer_id').references('id').inTable('answers').onDelete('CASCADE');
    table.integer('time_taken').notNullable(); // millisecondi impiegati per rispondere
    table.integer('points_earned').defaultTo(0);
    table.timestamp('answered_at').defaultTo(knex.fn.now());
  });

  // Aggiorna la tabella matches per includere informazioni sul quiz
  await knex.schema.alterTable('matches', (table) => {
    table.integer('quiz_id').references('id').inTable('quizzes').nullable();
    table.enum('status', ['waiting', 'in_progress', 'completed']).defaultTo('waiting');
    table.integer('current_question').defaultTo(1);
    table.timestamp('started_at').nullable();
    table.timestamp('ended_at').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('player_answers');
  await knex.schema.dropTableIfExists('match_questions');
  await knex.schema.dropTableIfExists('answers');
  await knex.schema.dropTableIfExists('questions');
  await knex.schema.dropTableIfExists('quizzes');
  await knex.schema.dropTableIfExists('players');
  await knex.schema.dropTableIfExists('matches');
}
