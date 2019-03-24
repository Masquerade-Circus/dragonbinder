import test from 'ava';
import expect from 'expect';
import createStore from '../lib';

function getNewStore() {
  let mainModule = {
    state: { b: [1], a: 0, c: { a: 1 } },
    mutations: {
      pushB(state, payload) {
        state.b = [...state.b, payload];
      },
      deleteB(state) {
        delete state.b;
      },
      increment(state, payload) {
        state.a = state.a + payload;
      },
      changeC(state, payload) {
        state.c = Object.assign({}, state.c, { a: payload });
      },
      changeCDirectly(state, payload) {
        state.c.a = payload;
      }
    },
    actions: {
      pushB(context, payload) {
        return new Promise((resolve) => {
          setTimeout(() => {
            context.commit('pushB', payload);
            resolve();
          }, 1000);
        });
      }
    },
    getters: {
      length(state, getters) {
        return getters.items.length;
      },
      items(state, getters) {
        return state.b;
      }
    }
  };

  return createStore(mainModule);
}

test('Throw error if you try to mutate the state directly', (t) => {
  let store = getNewStore();
  expect(() => (store.state.b = 1)).toThrowError('You need to commit a mutation to change the state');
});

test('Throw error if you try to mutate a deeper property of the state directly', (t) => {
  let store = getNewStore();
  expect(() => store.state.b.push(1)).toThrowError('Cannot add property 1, object is not extensible');
});

test('Throw error if you try to remove a property directly', (t) => {
  let store = getNewStore();
  expect(() => delete store.state.b).toThrowError('You need to commit a mutation to change the state');
});

test('Throw error if you try to remove a deeper property directly', (t) => {
  let store = getNewStore();
  expect(() => delete store.state.c.a).toThrowError("Cannot delete property 'a' of #<Object>");
});

test('Mutate the state by commit', (t) => {
  let store = getNewStore();
  expect(store.state.a).toEqual(0);
  store.commit('increment', 1);
  expect(store.state.a).toEqual(1);

  expect(store.state.b).toEqual([1]);
  store.commit('deleteB');
  expect(store.state.b).toBeUndefined();
});

test('Throw error if you try to commit an undefined mutation', (t) => {
  let store = getNewStore();
  expect(() => store.commit('hello')).toThrowError('The mutation "hello" does not exists.');
});

test('Mutate the state by dispatch', async (t) => {
  let store = getNewStore();
  expect(store.state.b).toEqual([1]);
  await store.dispatch('pushB', 2);
  expect(store.state.b).toEqual([1, 2]);
});

test('Throw error if you try to dispatch an undefined action', (t) => {
  let store = getNewStore();
  expect(() => store.dispatch('hello')).toThrowError('The action "hello" does not exists.');
});

test('Use a getter to obtain a property from the state', (t) => {
  let store = getNewStore();
  expect(store.getters.items).toEqual([1]);
});

test('Use a getter to obtain data using another getter', (t) => {
  let store = getNewStore();
  expect(store.getters.length).toEqual(1);
});

test('Fail silently if you try to get an undefined getter, getter must return undefined', (t) => {
  let store = getNewStore();
  expect(store.getters.ok).toBeUndefined();
});

test('Subscribe a named method to listen for changes', (t) => {
  let store = getNewStore();
  let count = 0;
  let method = () => count++;
  expect(count).toEqual(0);
  store.subscribe(method);
  store.commit('increment');
  expect(count).toEqual(1);
});

test('Unsubscribe a named method to listen for changes', (t) => {
  let store = getNewStore();
  let count = 0;
  let method = () => count++;
  expect(count).toEqual(0);
  store.subscribe(method);
  store.commit('increment');
  expect(count).toEqual(1);
  store.unsubscribe(method);
  store.commit('increment');
  expect(count).toEqual(1);
});

test('Unsubscribe an anonymous method by returned unsubscribe callback', (t) => {
  let store = getNewStore();
  let count = 0;
  expect(count).toEqual(0);
  let unsubscribe = store.subscribe(() => count++);
  store.commit('increment');
  expect(count).toEqual(1);
  unsubscribe();
  store.commit('increment');
  expect(count).toEqual(1);
});

test('Throw error if you try to subscribe something other than a function', (t) => {
  let store = getNewStore();
  expect(() => store.subscribe('hello')).toThrowError('You need to provide a valid function to subscribe.');
});

test('Throw error if you try to unsubscribe something other than a function', (t) => {
  let store = getNewStore();
  expect(() => store.unsubscribe('hello')).toThrowError('You need to provide a valid function to unsubscribe.');
});

test('Subscribe a named method only once', (t) => {
  let store = getNewStore();
  let count = 0;
  let method = () => count++;
  expect(count).toEqual(0);
  store.subscribe(method);
  store.subscribe(method);
  store.subscribe(method);
  store.commit('increment');
  expect(count).toEqual(1);
});

test('Create empty state if state is not passed', (t) => {
  let store = createStore({});
  expect(store.state).toBeDefined();
});

test('Use deepFrozen to froze the state', (t) => {
  let store = createStore({
    state: {
      a: {
        b: {
          c: {
            d: null
          },
          d: null
        }
      }
    }
  });

  expect(Object.isFrozen(store.state.a.b.c.d)).toBeTruthy();
});

