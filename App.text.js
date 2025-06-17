import { setupDatabase } from './App';
import * as SQLite from 'expo-sqlite';

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

describe('Database Setup', () => {
  it('should open the database and create the items table', async () => {
    const execAsyncMock = jest.fn();
    SQLite.openDatabaseAsync.mockResolvedValue({
      execAsync: execAsyncMock,
    });

    await setupDatabase();

    expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith('items.db');
    expect(execAsyncMock).toHaveBeenCalledWith(
      'CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);'
    );
  });
});