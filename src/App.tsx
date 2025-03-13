/* eslint-disable jsx-a11y/label-has-associated-control */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { TodoList } from './components/TodoList';
import { Footer } from './components/Footer';
import { Todo } from './types/Todo';
import * as todoMethods from './api/todos';
import { ErrorNotification } from './components/Error';
import { FilterStatus } from './types/FilterStatus';
import getTodosFilter from './utils/getTodosFilter';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(
    FilterStatus.All,
  );
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [deletingTodoIds, setDeletingTodoIds] = useState<number[] | null>(null);
  const [updatingTodoIds, setUpdatingTodoIds] = useState<number[] | null>(null);
  const [isInputDisabled, setInputDisabled] = useState(false);

  const isTodosEmpty = todos.length === 0;
  const todosActiveQuantity = todos.filter(todo => !todo.completed).length;
  const todosComplitedQuantity = todos.filter(todo => todo.completed).length;
  const allTodosIsComplited = todos.every(todo => todo.completed);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputDisabled]);

  useEffect(() => {
    todoMethods
      .getTodos()
      .then(setTodos)
      .catch(error => {
        setErrorMessage('Unable to load todos');
        throw error;
      });
  }, []);

  const filteredTodos = useMemo((): Todo[] => {
    const filterTodos = getTodosFilter(filterStatus);

    if (!filterTodos) {
      return todos;
    }

    return filterTodos(todos);
  }, [filterStatus, todos]);

  const addTodo = async (title: string): Promise<void> => {
    const userId = todoMethods.USER_ID;

    const temporaryTodo: Todo = {
      id: 0,
      userId,
      title,
      completed: false,
    };

    setTempTodo(temporaryTodo);
    setInputDisabled(true);

    try {
      const newTodo = await todoMethods.createTodo({
        userId,
        title,
        completed: false,
      });

      setTodos(currentTodos => [...currentTodos, newTodo]);
      setTempTodo(null);
    } catch (error) {
      setErrorMessage('Unable to add a todo');
      setTempTodo(null);
      throw error;
    } finally {
      setTempTodo(null);
      setInputDisabled(false);
    }
  };

  const deleteTodo = async (todoId: number): Promise<void> => {
    setDeletingTodoIds(prev => (prev ? [...prev, todoId] : [todoId]));
    setInputDisabled(true);

    try {
      await todoMethods.deleteTodo(todoId);

      setTodos(currentTodos => currentTodos.filter(todo => todo.id !== todoId));
    } catch (error) {
      setErrorMessage('Unable to delete a todo');
      throw error;
    } finally {
      setDeletingTodoIds(prev =>
        prev ? prev.filter(id => id !== todoId) : [],
      );
      setInputDisabled(false);
    }
  };

  const clearAllComplitedTodos = () => {
    const completedTodoIds = todos
      .filter(todo => todo.completed)
      .map(todo => todo.id);

    if (completedTodoIds.length === 0) {
      return;
    }

    setDeletingTodoIds(completedTodoIds);
    setInputDisabled(true);

    const deleteTodoPromises = completedTodoIds.map(deleteTodo);

    Promise.all(deleteTodoPromises).finally(() => {
      setDeletingTodoIds(null);
      setInputDisabled(false);
    });
  };

  const updateTodo = async (todo: Todo) => {
    setUpdatingTodoIds(prev => (prev ? [...prev, todo.id] : [todo.id]));

    try {
      const updatedTodo = await todoMethods.updateTodo(todo);

      setTodos(currentTodos =>
        currentTodos.map(currentTodo => {
          if (currentTodo.id === updatedTodo.id) {
            return updatedTodo;
          }

          return currentTodo;
        }),
      );
    } catch (error) {
      setErrorMessage('Unable to update a todo');
      throw error;
    } finally {
      setUpdatingTodoIds(prev =>
        prev ? prev.filter(id => id !== todo.id) : [],
      );
    }
  };

  const toggleTodos = async () => {
    const targetStatus = !allTodosIsComplited;

    const todosToUpdate = todos.filter(todo => todo.completed !== targetStatus);

    try {
      for (const todo of todosToUpdate) {
        await updateTodo({ ...todo, completed: targetStatus });
      }
    } catch (error) {
      setErrorMessage('Unable to update a todo');
      throw error;
    }
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <Header
          addTodo={addTodo}
          setErrorMessage={setErrorMessage}
          isInputDisabled={isInputDisabled}
          inputRef={inputRef}
          allTodosIsComplited={allTodosIsComplited}
          isTodosEmpty={isTodosEmpty}
          toggleTodos={toggleTodos}
        />
        <TodoList
          todos={filteredTodos}
          deleteTodo={deleteTodo}
          deletingTodoIds={deletingTodoIds}
          updatingTodoIds={updatingTodoIds}
          tempTodo={tempTodo}
          updateTodo={updateTodo}
        />
        {todos.length > 0 && (
          <Footer
            setFilterStatus={setFilterStatus}
            filterStatus={filterStatus}
            todosActiveQuantity={todosActiveQuantity}
            todosComplitedQuantity={todosComplitedQuantity}
            clearAllComplitedTodos={clearAllComplitedTodos}
          />
        )}
      </div>

      <ErrorNotification error={errorMessage} setError={setErrorMessage} />
    </div>
  );
};
