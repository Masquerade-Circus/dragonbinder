import test from 'ava';
import expect from 'expect';
import Dragonbinder from '../lib';

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

  return new Dragonbinder(mainModule);
}

test('Create empty state if state is not passed', (t) => {
  let store = new Dragonbinder();
  expect(store.state).toBeDefined();
});

test('Use deepFrozen to froze the state', (t) => {
  let store = new Dragonbinder({
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

test('Use plugins', (t) => {
  let store = new Dragonbinder();
  let params = [];
  let plugin = (...args) => {
    params.push(args);
  };
  store.use(plugin, 'option1', 'option2');
  store.use(plugin, 'option1', 'option2');
  expect(params).toEqual([
    [
      expect.any(Dragonbinder),
      'option1',
      'option2'
    ]
  ]);
});

test('Add a listener', (t) => {
  let store = getNewStore();
  let count = 0;
  let method = () => count++;
  expect(count).toEqual(0);
  store.on('set', method);
  store.commit('increment', 1);
  expect(count).toEqual(1);
});

test('Remove a named listener', (t) => {
  let store = getNewStore();
  let count = 0;
  let method = () => count++;
  expect(count).toEqual(0);
  store.on('set', method);
  store.commit('increment');
  expect(count).toEqual(1);
  store.off('set', method);
  store.commit('increment');
  expect(count).toEqual(1);
});

test('Remove an anonymous method by returned remove callback', (t) => {
  let store = getNewStore();
  let count = 0;
  expect(count).toEqual(0);
  let removeListener = store.on('set', () => count++);
  store.commit('increment');
  expect(count).toEqual(1);
  removeListener();
  store.commit('increment');
  expect(count).toEqual(1);
});

test('Throw error if you try to listen with something other than a function', (t) => {
  let store = getNewStore();
  expect(() => store.on('set', 'hello')).toThrowError('You need to provide a valid function as listener.');
});

test('Throw error if you try to remove a listener that is something other than a function', (t) => {
  let store = getNewStore();
  expect(() => store.off('set', 'hello')).toThrowError('You need to provide a valid function as listener.');
});

test('Add a listener only once', (t) => {
  let store = getNewStore();
  let count = 0;
  let method = () => count++;
  expect(count).toEqual(0);
  store.on('set', method);
  store.on('set', method);
  store.on('set', method);
  store.commit('increment');
  expect(count).toEqual(1);
});

test('Test all listeners', async (t) => {
  let store = getNewStore();
  let events = [
    'addlistener',
    'removelistener',
    'set',
    'delete',
    'beforecommit',
    'commit',
    'beforedispatch',
    'dispatch',
    'getter',
    'plugin'
  ];
  let methods = events.reduce((methods, event) => {
    methods[event] = {
      params: [],
      method: (...params) => methods[event].params.push(params)
    };
    return methods;
  }, {});

  events.forEach(event => store.on(event, methods[event].method));
  store.getters.length;
  await store.dispatch('pushB', 1);
  store.commit('deleteB');
  let plugin = () => {};
  store.use(plugin);
  events.forEach(event => store.off(event, methods[event].method));

  // Add listener event
  expect(methods.addlistener.params.length).toEqual(events.length);
  expect(methods.addlistener.params).toEqual(events.map(event => {
    return [
      expect.any(Dragonbinder), // The store
      event, // The listener name
      methods[event].method // The listener added
    ];
  }));

  // Remove listener event
  expect(methods.removelistener.params.length).toEqual(1);
  expect(methods.removelistener.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'addlistener', // The listener name
    methods.addlistener.method // The listener added
  ]);


  // Set event
  expect(methods.set.params.length).toEqual(1);
  expect(methods.set.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'b', // The property name
    [1, 1], // The new value,
    [1] // The old value
  ]);

  // Delete event
  expect(methods.delete.params.length).toEqual(1);
  expect(methods.delete.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'b', // The property name
    [1, 1] // The old value
  ]);

  // Before commit event
  expect(methods.beforecommit.params.length).toEqual(2);
  expect(methods.beforecommit.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'pushB', // The mutation name
    1 // The params passed to the mutation
  ]);

  // Commit event
  expect(methods.commit.params.length).toEqual(2);
  expect(methods.commit.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'pushB', // The mutation name
    1 // The params passed to the mutation
  ]);

  // Before dispatch event,
  expect(methods.beforedispatch.params.length).toEqual(1);
  expect(methods.beforedispatch.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'pushB', // The action name
    1 // The params passed to the mutation
  ]);

  // Dispatch event
  expect(methods.dispatch.params.length).toEqual(1);
  expect(methods.dispatch.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'pushB', // The action name
    1 // The params passed to the mutation
  ]);

  // Getter event
  expect(methods.getter.params.length).toEqual(2);
  expect(methods.getter.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'items', // The getter name
    [1] // The value of the getter
  ]);

  // Add plugin event
  expect(methods.plugin.params.length).toEqual(1);
  expect(methods.plugin.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    plugin // The plugin added
  ]);
});
