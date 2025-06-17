import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import * as SQLite from 'expo-sqlite';

let db = null;

//this is where the local database is opened, but it is not supported in the web
const openDatabase = async () => {
  if (Platform.OS === "web") {
    console.warn("Cannot run in the web");
    return null;
  }
  try {
    const newDb = await SQLite.openDatabaseAsync('when.db'); // Database file name
    console.log("Database opened successfully.");
    return newDb;
  } catch (error) {
    console.error("Failed to open database:", error);
    Alert.alert("Database Error", "Failed to open the local database.");
    return null;
  }
};

//this is where the table in sqlite is initialized (todos)
export const setupDatabase = async () => {
  db = await openDatabase();
  if (!db) {
    console.log("Database is not available. Setup operations will be skipped.");
    return;
  }
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task TEXT NOT NULL,
        completed INTEGER DEFAULT 0
      );
    `);
    console.log("Database 'todos' table setup complete.");
  } catch (error) {
    console.error("Failed to setup database tables:", error);
    Alert.alert("Database Setup Error", "Failed to create necessary tables.");
  }
};

//this is where the functions are managed
export default function App() {
  const [task, setTask] = useState(''); // set task
  const [todos, setTodos] = useState([]); //records todo
  const [editingId, setEditingId] = useState(null); //enables edit in todo
  const [editingText, setEditingText] = useState(''); // enables edits text
  const [isDbInitialized, setIsDbInitialized] = useState(false); // initializes or reads the recorded data
 
//calls the setupdatabase then loads the fetchtodos
  useEffect(() => {
    setupDatabase()
      .then(() => {
        setIsDbInitialized(true);
        if (db) { // Only fetch if db was successfully initialized
          fetchTodos();
        } else if (Platform.OS !== "web") {
          Alert.alert("Database Not Ready", "The database could not be initialized. Tasks cannot be loaded or saved.");
        }
      })
      .catch(error => {
        console.error("Initialization error:", error);
        Alert.alert("Initialization Error", "Could not initialize the application.");
        setIsDbInitialized(true); // Still set to true to potentially show web message or error state
      });
  }, []);

  const fetchTodos = async () => {
    if (!db) {
      // Only log if db was expected to be initialized (i.e., not on web and initialization attempted)
      if (isDbInitialized && Platform.OS !== "web") console.log('DB not available for fetching todos.');
      return;
    }
    try {
      const results = await db.getAllAsync('SELECT * FROM todos ORDER BY id DESC;');
      setTodos(results || []);
      console.log("Todos fetched:", results);
    } catch (error) {
      console.error("Failed to fetch todos:", error);
      Alert.alert("Fetch Error", "Could not retrieve tasks from the database.");
      setTodos([]);
    }
  };

// add todo validates it validates the user input, it inserts or refreshes a task, fetchtodos reads and orders the updates of todo state
  const addTodo = async () => {
    if (!db) {
      Alert.alert("No Database", "Database is not available to add tasks. Please ensure the app initialized correctly on a native device.");
      return;
    }
    if (task.trim() === '') {
      Alert.alert("Invalid Input", "Task cannot be empty.");
      return;
    }
    try {
      await db.runAsync('INSERT INTO todos (task, completed) VALUES (?, 0);', [task.trim()]);
      setTask('');
      console.log("Todo added successfully.");
      fetchTodos(); // Refresh the list
    } catch (error) {
      console.error("Failed to add todo:", error);
      Alert.alert("Add Error", "Could not add the task to the database.");
    }
  };

// updates complete status
  const toggleComplete = async (id, currentStatus) => {
    if (!db) {
      Alert.alert("No Database", "Database is not available to update tasks.");
      return;
    }
    const newStatus = currentStatus === 0 ? 1 : 0;
    try {
      await db.runAsync('UPDATE todos SET completed = ? WHERE id = ?;', [newStatus, id]);
      console.log(`Todo ${id} completion status toggled to ${newStatus}.`);
      fetchTodos(); // Refresh the list
    } catch (error) {
      console.error("Failed to toggle complete status:", error);
      Alert.alert("Update Error", "Could not update task status.");
    }
  };
// warning that there us no database
  const deleteTodo = async (id) => {
    if (!db) {
      Alert.alert("No Database", "Database is not available to delete tasks.");
      return;
    }
    try {
      await db.runAsync('DELETE FROM todos WHERE id = ?;', [id]);
      console.log(`Todo ${id} deleted.`);
      fetchTodos(); // Refresh the list
    } catch (error) {
      console.error("Failed to delete todo:", error);
      Alert.alert("Delete Error", "Could not delete the task.");
    }
  };

//loads task into editmode
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditingText(item.task);
  };

//cancels task
  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

//saves task
  const saveEdit = async (id) => {
    if (!db) {
      Alert.alert("No Database", "Database is not available to edit tasks.");
      return;
    }
    if (editingText.trim() === '') {
      Alert.alert("Invalid Input", "Task cannot be empty.");
      return;
    }
    try {
      await db.runAsync('UPDATE todos SET task = ? WHERE id = ?;', [editingText.trim(), id]);
      console.log(`Todo ${id} updated.`);
      setEditingId(null);
      setEditingText('');
      fetchTodos(); // Refresh the list
    } catch (error) {
      console.error("Failed to save edited todo:", error);
      Alert.alert("Save Error", "Could not save the updated task.");
    }
  };

  if (!isDbInitialized && Platform.OS !== "web") {
    return (
      <View style={styles.container}>
        <Text>Initializing database...</Text>
      </View>
    );
  }

  if (Platform.OS === "web") { // Simplified web check, db will be null here
      return (
      <View style={styles.container}>
        <Text style={styles.heading}>📝 To-Do List (Web Notice)</Text>
        <Text>SQLite (local database) is not directly supported in this web environment. This app is intended for native device or simulator use. Web functionality is limited.</Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <Text style={styles.heading}>To-Do List</Text>
      <TextInput
        placeholder="Enter a new task"
        value={task}
        onChangeText={setTask}
        style={styles.input}
        onSubmitEditing={addTodo} // Add task on submit
      />
      <Button
        title="Add Task"
        onPress={addTodo}
        color="#007AFF"
        disabled={Platform.OS === 'web' || !db} // Updated disabling condition
      />

      <FlatList
        data={todos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.todoItem}>
            {editingId === item.id ? (
              <>
                <TextInput
                  value={editingText}
                  onChangeText={setEditingText}
                  style={[styles.input, styles.editInput]}
                  autoFocus
                />
                <TouchableOpacity onPress={() => saveEdit(item.id)} style={styles.buttonIcon}>
                  <Text>📝</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={cancelEdit} style={styles.buttonIcon}>
                  <Text>❌</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => toggleComplete(item.id, item.completed)}
                  style={styles.taskContainer}
                >
                  <Text
                    style={[
                      styles.taskText,
                      item.completed ? styles.completed : null,
                    ]}
                  >
                    {item.task}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => startEdit(item)} style={styles.buttonIcon}>
                  <Text>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTodo(item.id)} style={styles.buttonIcon}>
                  <Text style={styles.deleteText}>🗑️</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyListText}>
            {Platform.OS === 'web'
              ? "Local database not available on web."
              : (!isDbInitialized
                  ? "Initializing database..."
                  : (db ? "No tasks yet. Add some!" : "Failed to initialize database. Tasks cannot be loaded."))}
          </Text>
        }
      />
    </View>
  );
}
//this is where the styles are made
const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'android' ? 40 : 60, // Adjust for status bar
    paddingHorizontal: 20,
    backgroundColor: '#f0f0f0', // Lighter background
    flex: 1,
  },
  heading: {
    fontSize: 28,
    marginBottom: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc', // Lighter border
    backgroundColor: '#fff',
    padding: 12, // Increased padding
    marginBottom: 10,
    borderRadius: 8, // Rounded corners
    fontSize: 16,
  },
  editInput: {
    flex: 1,
    marginRight: 10,
    height: 40, // Ensure consistent height
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15, // Increased padding
    borderBottomWidth: 1,
    borderColor: '#e0e0e0', // Lighter border
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10, // Space between items
    elevation: 1, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  taskContainer: {
    flex: 1,
  },
  taskText: {
    fontSize: 18,
    color: '#333',
  },
  completed: {
    textDecorationLine: 'line-through',
    color: 'gray',
  },
  buttonIcon: {
    padding: 8,
    marginLeft: 8,
  },
  deleteText: {
    fontSize: 18,
    // color: 'red', // Using emoji color
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: 'gray',
  }
});