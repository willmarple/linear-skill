import type { Argv } from 'yargs';
import { getSessionManager } from '../session/index.js';
import { output, success } from '../utils/response.js';

export function registerFocusCommand(cli: Argv): void {
  cli.command(
    'focus [identifiers..]',
    'Set focus tickets for current work session',
    (yargs) =>
      yargs
        .positional('identifiers', {
          type: 'string',
          array: true,
          description: 'Issue identifiers to focus on',
        })
        .option('add', {
          type: 'string',
          alias: 'a',
          description: 'Add a single ticket to focus',
        })
        .option('remove', {
          type: 'string',
          alias: 'r',
          description: 'Remove a single ticket from focus',
        })
        .option('clear', {
          type: 'boolean',
          alias: 'c',
          description: 'Clear all focus tickets',
        })
        .option('show', {
          type: 'boolean',
          alias: 's',
          description: 'Show current focus tickets',
        }),
    async (argv) => {
      const session = getSessionManager();

      // Show current focus
      if (argv.show || (!argv.identifiers?.length && !argv.add && !argv.remove && !argv.clear)) {
        const context = session.getActiveContext();
        const trackedTickets = context.focusTickets.map((id) => {
          const ticket = session.getTrackedTicket(id);
          return ticket
            ? { identifier: id, title: ticket.title, state: ticket.state }
            : { identifier: id };
        });

        output(
          success('focus', {
            focusTickets: trackedTickets,
            notes: context.notes,
          })
        );
        return;
      }

      // Clear focus
      if (argv.clear) {
        session.clearFocus();
        output(success('focus', { message: 'Focus cleared', focusTickets: [] }));
        return;
      }

      // Add single ticket
      if (argv.add) {
        session.addFocusTicket(argv.add);
        output(
          success('focus', {
            message: `Added ${argv.add} to focus`,
            focusTickets: session.getActiveContext().focusTickets,
          })
        );
        return;
      }

      // Remove single ticket
      if (argv.remove) {
        session.removeFocusTicket(argv.remove);
        output(
          success('focus', {
            message: `Removed ${argv.remove} from focus`,
            focusTickets: session.getActiveContext().focusTickets,
          })
        );
        return;
      }

      // Set focus to specified identifiers
      if (argv.identifiers && argv.identifiers.length > 0) {
        session.setFocusTickets(argv.identifiers as string[]);
        output(
          success('focus', {
            message: 'Focus set',
            focusTickets: argv.identifiers,
          })
        );
      }
    }
  );

  // Notes command
  cli.command(
    'notes [text]',
    'Set or view session notes',
    (yargs) =>
      yargs
        .positional('text', {
          type: 'string',
          description: 'Notes text (omit to view current notes)',
        })
        .option('clear', {
          type: 'boolean',
          alias: 'c',
          description: 'Clear notes',
        }),
    async (argv) => {
      const session = getSessionManager();

      if (argv.clear) {
        session.setNotes(undefined);
        output(success('notes', { message: 'Notes cleared' }));
        return;
      }

      if (argv.text) {
        session.setNotes(argv.text as string);
        output(success('notes', { message: 'Notes saved', notes: argv.text }));
        return;
      }

      // Show current notes
      const notes = session.getActiveContext().notes;
      output(success('notes', { notes: notes || '(no notes)' }));
    }
  );
}
